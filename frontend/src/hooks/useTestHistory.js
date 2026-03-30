import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'test-history-data';
const STORAGE_SCHEMA_KEY = 'test-history-schema-version';
const STORAGE_SCHEMA_VERSION = 'showcase-window-v1';
const MAX_STORED_TESTS = 100;
const MAX_RESULTS_PER_TEST = 12000;

function sanitizeResultForStorage(result) {
  if (!result || typeof result !== 'object') return null;

  return {
    timestamp: result.timestamp,
    status: result.status,
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    retryAfter: result.retryAfter,
    rateLimit: result.rateLimit
      ? {
          detected: Boolean(result.rateLimit.detected),
          retryAfter: result.rateLimit.retryAfter,
          window: result.rateLimit.window,
          limit: result.rateLimit.limit,
        }
      : null,
  };
}

/**
 * Custom hook to manage test history with localStorage persistence
 * Stores results and provides aggregation utilities
 * 
 * Features:
 * - Persistent storage in localStorage with key: `test-history-data-${templateId}`
 * - Automatic sync across browser tabs
 * - Maximum 100 tests per template
 * - Aggregation by time granularity
 */
export function useTestHistory(templateId, options = {}) {
  const persistent = options?.persistent !== false;
  const [history, setHistory] = useState([]);
  const [storageReady, setStorageReady] = useState(false);

  // One-time schema migration to purge stale cached history that can break chart rendering.
  useEffect(() => {
    if (!persistent) {
      setStorageReady(true);
      return;
    }

    try {
      const currentSchema = localStorage.getItem(STORAGE_SCHEMA_KEY);
      if (currentSchema === STORAGE_SCHEMA_VERSION) return;

      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${STORAGE_KEY}-`)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      console.log('[useTestHistory] Storage schema migrated and stale history cleared:', {
        removed: keysToRemove.length,
        schema: STORAGE_SCHEMA_VERSION,
      });
    } catch (error) {
      console.error('[useTestHistory] Failed running storage migration:', error);
    }
  }, [persistent]);

  // Load history from localStorage on mount and when templateId changes
  useEffect(() => {
    if (!persistent) {
      setHistory([]);
      setStorageReady(true);
      return;
    }

    const loadHistory = () => {
      if (!templateId) {
        setHistory([]);
        setStorageReady(true);
        return;
      }

      try {
        const stored = localStorage.getItem(`${STORAGE_KEY}-${templateId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[useTestHistory] Loaded from localStorage:', {
            templateId,
            testCount: Array.isArray(parsed) ? parsed.length : 0,
            storageKey: `${STORAGE_KEY}-${templateId}`,
          });
          setHistory(Array.isArray(parsed) ? parsed : []);
        } else {
          console.log('[useTestHistory] No stored data for template:', templateId);
          setHistory([]);
        }
      } catch (e) {
        console.error('[useTestHistory] Failed to parse stored history:', e);
        setHistory([]);
      }
      setStorageReady(true);
    };

    loadHistory();
  }, [templateId, persistent]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!persistent) return;
    if (!storageReady || !templateId) return;

    try {
      const dataToStore = JSON.stringify(history);
      localStorage.setItem(`${STORAGE_KEY}-${templateId}`, dataToStore);
      console.log('[useTestHistory] Saved to localStorage:', {
        templateId,
        testCount: history.length,
        storageSize: `${(dataToStore.length / 1024).toFixed(2)}KB`,
      });
    } catch (e) {
      console.error('[useTestHistory] Failed to save history:', e);
      if (e.name === 'QuotaExceededError') {
        console.warn('[useTestHistory] localStorage quota exceeded, clearing oldest tests');
        // Remove oldest test and retry
        setHistory((prev) => prev.slice(0, prev.length - 1));
      }
    }
  }, [history, templateId, storageReady, persistent]);

  // Sync across tabs via storage events
  useEffect(() => {
    if (!persistent) return undefined;

    const handleStorageChange = (e) => {
      if (e.key === `${STORAGE_KEY}-${templateId}` && e.newValue) {
        try {
          const newHistory = JSON.parse(e.newValue);
          console.log('[useTestHistory] Synced from another tab:', {
            templateId,
            testCount: newHistory.length,
          });
          setHistory(Array.isArray(newHistory) ? newHistory : []);
        } catch (error) {
          console.error('[useTestHistory] Failed to sync from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [templateId, persistent]);

  const buildStoredTestEntry = useCallback((testData) => {
    const compactResults = Array.isArray(testData?.results)
      ? testData.results
          .slice(0, MAX_RESULTS_PER_TEST)
          .map(sanitizeResultForStorage)
          .filter(Boolean)
      : [];

    return {
      jobId: testData?.jobId,
      timestamp: testData?.timestamp,
      summary: testData?.summary || {},
      results: compactResults,
      source: testData?.source || 'default',
      simulated: Boolean(testData?.simulated),
      showcaseWindowSeconds: Number(testData?.showcaseWindowSeconds || 0),
      storedAt: new Date().toISOString(),
    };
  }, []);

  const entryOverlapsWindow = useCallback((entry, windowStartMs, windowEndMs) => {
    if (!entry) return false;

    const timestamps = Array.isArray(entry.results)
      ? entry.results
          .map((r) => new Date(r?.timestamp || 0).getTime())
          .filter((ts) => Number.isFinite(ts) && ts > 0)
      : [];

    if (timestamps.length === 0) {
      const fallbackTs = new Date(entry.timestamp || 0).getTime();
      if (!Number.isFinite(fallbackTs)) return false;
      return fallbackTs >= windowStartMs && fallbackTs <= windowEndMs;
    }

    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    return maxTs >= windowStartMs && minTs <= windowEndMs;
  }, []);

  /**
   * Add a new test result to history
   * @param {object} testData - { jobId, timestamp, results, summary }
   */
  const addTestResult = useCallback((testData) => {
    setHistory((prev) => {
      const updated = [buildStoredTestEntry(testData), ...prev].slice(0, MAX_STORED_TESTS);
      return updated;
    });
  }, [buildStoredTestEntry]);

  /**
   * Replace simulated data inside a window and insert a new showcase test
   * @param {object} testData - Test data to insert
   * @param {number} windowStartMs - Window start timestamp in ms
   * @param {number} windowEndMs - Window end timestamp in ms
   */
  const replaceSimulatedResultsInWindow = useCallback(
    (testData, windowStartMs, windowEndMs) => {
      setHistory((prev) => {
        const filtered = prev.filter((entry) => {
          const isSimulated = Boolean(entry?.simulated || entry?.source === 'showcase');
          if (!isSimulated) return true;
          return !entryOverlapsWindow(entry, windowStartMs, windowEndMs);
        });

        const updated = [buildStoredTestEntry(testData), ...filtered].slice(0, MAX_STORED_TESTS);
        return updated;
      });
    },
    [buildStoredTestEntry, entryOverlapsWindow]
  );

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    if (persistent) {
      localStorage.removeItem(`${STORAGE_KEY}-${templateId}`);
    }
  }, [templateId, persistent]);

  /**
   * Get all results across all tests with timestamp enrichment
   * @returns {array} Flat array of all results with test metadata
   */
  const getAllResults = useCallback(() => {
    console.log('[useTestHistory] getAllResults called, history length:', history.length);
    return history.flatMap((test) =>
      (test.results || []).map((result) => ({
        ...result,
        testId: test.jobId,
        testStartedAt: test.timestamp,
      }))
    );
  }, [history]);

  /**
   * Aggregate results by time granularity
   * @param {string} granularity - '1m', '5m', '15m', '1h', '6h', '1d'
   * @returns {object} { timestamps, successCounts, errorCounts, rateLimitCounts, totalCounts }
   */
  const aggregateByGranularity = useCallback(
    (granularity = '1m') => {
      const allResults = getAllResults();
      console.log('[useTestHistory] aggregateByGranularity called:', {
        granularity,
        totalResults: allResults.length,
        historyTests: history.length,
      });
      
      if (allResults.length === 0) {
        return {
          timestamps: [],
          successCounts: [],
          errorCounts: [],
          rateLimitCounts: [],
          totalCounts: [],
        };
      }

      const granularityMs = parseGranularity(granularity);
      const bucketsMap = {};

      // Group results into time buckets
      allResults.forEach((result) => {
        const timestamp = new Date(result.timestamp).getTime();
        const bucketKey = Math.floor(timestamp / granularityMs) * granularityMs;

        if (!bucketsMap[bucketKey]) {
          bucketsMap[bucketKey] = {
            ok: 0,
            error: 0,
            rate_limited: 0,
            total: 0,
          };
        }

        bucketsMap[bucketKey].total++;

        if (result.status === 'ok') bucketsMap[bucketKey].ok++;
        else if (result.status === 'error') bucketsMap[bucketKey].error++;
        else if (result.status === 'rate_limited') bucketsMap[bucketKey].rate_limited++;
      });

      // Convert to sorted arrays
      const sortedKeys = Object.keys(bucketsMap)
        .map(Number)
        .sort((a, b) => a - b);

      console.log('[useTestHistory] Aggregation result:', {
        buckets: sortedKeys.length,
        totalRequests: sortedKeys.reduce((sum, k) => sum + bucketsMap[k].total, 0),
      });

      return {
        timestamps: sortedKeys,
        successCounts: sortedKeys.map((k) => bucketsMap[k].ok),
        errorCounts: sortedKeys.map((k) => bucketsMap[k].error),
        rateLimitCounts: sortedKeys.map((k) => bucketsMap[k].rate_limited),
        totalCounts: sortedKeys.map((k) => bucketsMap[k].total),
      };
    },
    [getAllResults, history]
  );

  /**
   * Get cumulative requests over time
   * @param {string} granularity - Time granularity for grouping
   * @returns {object} { timestamps, cumulativeCounts }
   */
  const getCumulativeOverTime = useCallback(
    (granularity = '1m') => {
      const { timestamps, totalCounts } = aggregateByGranularity(granularity);
      
      if (timestamps.length === 0) {
        return { timestamps: [], cumulativeCounts: [] };
      }

      let cumulative = 0;
      const cumulativeCounts = totalCounts.map((count) => {
        cumulative += count;
        return cumulative;
      });

      console.log('[useTestHistory] getCumulativeOverTime:', {
        granularity,
        dataPoints: timestamps.length,
        totalCumulative: cumulative,
      });

      return { timestamps, cumulativeCounts };
    },
    [aggregateByGranularity, history]
  );

  /**
   * Get stats for current session
   */
  const getCurrentStats = useCallback(() => {
    const allResults = getAllResults();
    console.log('[useTestHistory] getCurrentStats:', {
      totalResults: allResults.length,
      historyTests: history.length,
    });
    
    if (allResults.length === 0) {
      return {
        total: 0,
        success: 0,
        errors: 0,
        rateLimited: 0,
        avgLatency: 0,
      };
    }

    const total = allResults.length;
    const success = allResults.filter((r) => r.status === 'ok').length;
    const errors = allResults.filter((r) => r.status === 'error').length;
    const rateLimited = allResults.filter((r) => r.status === 'rate_limited').length;
    const avgLatency = Math.round(
      allResults.reduce((sum, r) => sum + (r.durationMs || 0), 0) / total
    );

    return { total, success, errors, rateLimited, avgLatency };
  }, [getAllResults, history]);

  return {
    history,
    storageReady,
    addTestResult,
    replaceSimulatedResultsInWindow,
    clearHistory,
    getAllResults,
    aggregateByGranularity,
    getCumulativeOverTime,
    getCurrentStats,
  };
}

/**
 * Convert granularity string to milliseconds
 */
export function parseGranularity(granularityStr) {
  const granularities = {
    '30s': 30 * 1000,
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  return granularities[granularityStr] || 60 * 1000;
}

/**
 * Format timestamp for display based on granularity
 */
export function formatTimeByGranularity(timestamp, granularity) {
  const date = new Date(timestamp);

  switch (granularity) {
    case '30s':
    case '1m':
    case '5m':
    case '15m':
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    case '1h':
    case '6h':
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '1d':
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      });
    default:
      return date.toLocaleString('es-ES');
  }
}

/**
 * Utility function to get all stored test history across all templates
 * Useful for debugging and analytics
 * @returns {object} Map of templateId -> test array
 */
export function getAllStoredHistory() {
  const result = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY)) {
        const templateId = key.replace(`${STORAGE_KEY}-`, '');
        const data = localStorage.getItem(key);
        result[templateId] = JSON.parse(data || '[]');
      }
    }
  } catch (error) {
    console.error('[getAllStoredHistory] Error reading localStorage:', error);
  }
  return result;
}

/**
 * Utility function to get storage statistics
 * @returns {object} Storage stats including size, template count, etc.
 */
export function getStorageStats() {
  const allHistory = getAllStoredHistory();
  const templates = Object.keys(allHistory);
  let totalSize = 0;
  let totalTests = 0;

  for (const templateId in allHistory) {
    const data = JSON.stringify(allHistory[templateId]);
    totalSize += data.length;
    totalTests += allHistory[templateId].length;
  }

  return {
    templates: templates.length,
    totalTests,
    totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
    maxQuota: `${(5 * 1024 * 1024 / 1024).toFixed(0)}MB`, // 5MB typical localStorage quota
    byTemplate: Object.entries(allHistory).map(([templateId, tests]) => ({
      templateId,
      testCount: tests.length,
      size: `${(JSON.stringify(tests).length / 1024).toFixed(2)}KB`,
    })),
  };
}

/**
 * Utility function to clear all test history
 * @param {string} [templateId] - Optional template ID to clear only that template
 */
export function clearAllHistory(templateId = null) {
  try {
    if (templateId) {
      const key = `${STORAGE_KEY}-${templateId}`;
      localStorage.removeItem(key);
      console.log('[clearAllHistory] Cleared history for template:', templateId);
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      }
      console.log('[clearAllHistory] Cleared all test history');
    }
  } catch (error) {
    console.error('[clearAllHistory] Error clearing storage:', error);
  }
}

/**
 * Utility function to export history as JSON
 * @param {string} [templateId] - Template ID to export (all if not specified)
 * @returns {object} History data ready for download
 */
export function exportHistory(templateId = null) {
  const timestamp = new Date().toISOString();
  
  if (templateId) {
    const key = `${STORAGE_KEY}-${templateId}`;
    const data = localStorage.getItem(key);
    return {
      exportedAt: timestamp,
      templateId,
      history: data ? JSON.parse(data) : [],
    };
  } else {
    return {
      exportedAt: timestamp,
      data: getAllStoredHistory(),
    };
  }
}

/**
 * Utility function to import history from JSON
 * @param {object} importData - Data object to import
 * @returns {boolean} Success status
 */
export function importHistory(importData) {
  try {
    if (importData.templateId && importData.history) {
      // Single template import
      const key = `${STORAGE_KEY}-${importData.templateId}`;
      localStorage.setItem(key, JSON.stringify(importData.history));
      console.log('[importHistory] Imported history for template:', importData.templateId);
    } else if (importData.data) {
      // Multiple templates import
      for (const templateId in importData.data) {
        const key = `${STORAGE_KEY}-${templateId}`;
        localStorage.setItem(key, JSON.stringify(importData.data[templateId]));
      }
      console.log('[importHistory] Imported history for', Object.keys(importData.data).length, 'templates');
    }
    return true;
  } catch (error) {
    console.error('[importHistory] Error importing history:', error);
    return false;
  }
}
