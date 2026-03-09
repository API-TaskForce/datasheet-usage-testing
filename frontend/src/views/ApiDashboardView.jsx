import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import uPlot from 'uplot';
import UPlotChart from '../components/UPlotChart.jsx';
import TemplateTestView from '../components/TemplateTestView.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import GranularitySelector from '../components/GranularitySelector.jsx';
import DatasheetViewer from '../components/DatasheetViewer.jsx';
import StorageInfoPanel from '../components/StorageInfoPanel.jsx';
import ApiDashboardActionBar from '../components/dashboard/ApiDashboardActionBar.jsx';
import ApiDashboardTabs from '../components/dashboard/ApiDashboardTabs.jsx';
import { RealTimePanel, SimpleRealTimePanel } from '../components/dashboard/RealtimePanels.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import ProgressBar from '../components/dashboard/ProgressBar.jsx';
import DonutChart from '../components/dashboard/DonutChart.jsx';
import { OpportunityPanel, OpportunityPanelHistorical } from '../components/dashboard/OpportunityPanels.jsx';
import AutoRefreshSelector from '../components/dashboard/AutoRefreshSelector.jsx';
import {
  getActiveJobResults,
  testApi,
  getTestResults,
  getApiLimits,
  getTemplateDatasheet,
  getTestConfigs,
} from '../services/apiTemplateService.js';
import {
  useTestHistory,
  formatTimeByGranularity,
  parseGranularity,
} from '../hooks/useTestHistory.js';
import { Activity, Clock, AlertCircle, Trash2, BookOpen, Pencil, FileText } from 'lucide-react';
import BaseButton from '../components/BaseButton.jsx';
import BaseCard from '../components/BaseCard.jsx';

// Helper function to extract daily limits from response bodies
function extractDailyLimitFromResponse(response) {
  if (!response) return null;

  let body = response.body;
  if (!body) return null;

  // Try to parse as JSON
  let bodyObj = null;
  if (typeof body === 'string') {
    try {
      bodyObj = JSON.parse(body);
    } catch (e) {
      // If not JSON, search in string
      const matches = body.match(/\b(?:limit|quota|points|remaining|reset|max)\b[^0-9]*(\d+)/gi);
      if (matches && matches.length > 0) {
        const numbers = body.match(/\d+/g);
        if (numbers) return parseInt(numbers[0]);
      }
      return null;
    }
  } else if (typeof body === 'object') {
    bodyObj = body;
  }

  if (!bodyObj) return null;

  // Search for limit-related fields recursively
  const findLimit = (obj, depth = 0) => {
    if (depth > 5) return null; // Prevent infinite recursion

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Match keys like "limit", "quota", "points", "max_requests", etc.
      if (
        lowerKey.includes('limit') ||
        lowerKey.includes('quota') ||
        lowerKey.includes('points') ||
        lowerKey.includes('max') ||
        lowerKey.includes('capacity') ||
        lowerKey.includes('daily')
      ) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = parseInt(value);
          if (!isNaN(num)) return num;
        }
      }

      // Recurse into nested objects/arrays
      if (typeof value === 'object' && value !== null) {
        const result = findLimit(value, depth + 1);
        if (result) return result;
      }
    }
    return null;
  };

  return findLimit(bodyObj);
}

function extractFirstNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value !== 'string') return null;

  const match = value.replace(/,/g, '').match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return Number.isNaN(num) ? null : num;
}

function extractLimitsFromDatasheet(datasheet) {
  if (!datasheet || typeof datasheet !== 'object') {
    return { quotaMax: null, rateMax: null };
  }

  const quotaCandidates = [];
  let rateMax = null;

  if (Array.isArray(datasheet.capacity)) {
    datasheet.capacity.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const isQuota = !entry.type || String(entry.type).toUpperCase().includes('QUOTA');
      if (!isQuota) return;
      const n = extractFirstNumber(entry.value);
      if (n !== null) quotaCandidates.push(n);
    });
  }

  if (datasheet.maxPower) {
    if (typeof datasheet.maxPower === 'object') {
      rateMax = extractFirstNumber(datasheet.maxPower.value);
    } else {
      rateMax = extractFirstNumber(datasheet.maxPower);
    }
  }

  if (rateMax === null && datasheet.rateLimit && typeof datasheet.rateLimit === 'object') {
    if (typeof datasheet.rateLimit.requestsPerMinute === 'number') {
      rateMax = datasheet.rateLimit.requestsPerMinute;
    } else if (typeof datasheet.rateLimit.requestsPerSecond === 'number') {
      rateMax = datasheet.rateLimit.requestsPerSecond * 60;
    }
  }

  const quotaMax = quotaCandidates.length > 0 ? Math.max(...quotaCandidates) : null;
  return { quotaMax, rateMax };
}

function parseDurationToSeconds(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value !== 'string') return null;

  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const numMatch = raw.match(/\d+/);
  if (!numMatch) return null;
  const n = parseInt(numMatch[0], 10);
  if (Number.isNaN(n)) return null;

  if (raw.includes('hour') || raw.includes('hora') || raw.endsWith('h')) return n * 3600;
  if (raw.includes('minute') || raw.includes('min') || raw.includes('minuto') || raw.endsWith('m'))
    return n * 60;
  return n;
}

function normalizeWindowModel(windowType) {
  const v = String(windowType || '').toUpperCase();
  if (!v) return 'UNKNOWN';
  if (v.includes('SLID')) return 'SLIDING_WINDOW';
  if (v.includes('FIXED') || v.includes('DAILY') || v.includes('MONTHLY') || v.includes('CUSTOM')) {
    return 'FIXED_WINDOW';
  }
  return 'UNKNOWN';
}

function extractRateUsageModelFromDatasheet(datasheet) {
  const fallback = {
    windowModel: 'UNKNOWN',
    cooldownSeconds: 30,
    windowTypeRaw: null,
    source: 'fallback',
  };

  if (!datasheet || typeof datasheet !== 'object') return fallback;

  let windowTypeRaw = null;
  let cooldownSeconds = null;

  if (Array.isArray(datasheet.capacity)) {
    const withWindow = datasheet.capacity.find((entry) => entry && entry.windowType);
    if (withWindow) windowTypeRaw = withWindow.windowType;
  }

  if (!windowTypeRaw && datasheet.rateLimit?.windowType) {
    windowTypeRaw = datasheet.rateLimit.windowType;
  }

  if (datasheet.coolingPeriod) {
    cooldownSeconds = parseDurationToSeconds(datasheet.coolingPeriod);
  }

  if (!cooldownSeconds && datasheet.rateLimit?.window) {
    cooldownSeconds = parseDurationToSeconds(datasheet.rateLimit.window);
  }

  if (!cooldownSeconds && datasheet.maxPower?.window) {
    cooldownSeconds = parseDurationToSeconds(datasheet.maxPower.window);
  }

  return {
    windowModel: normalizeWindowModel(windowTypeRaw),
    cooldownSeconds: cooldownSeconds || fallback.cooldownSeconds,
    windowTypeRaw,
    source: windowTypeRaw || cooldownSeconds ? 'datasheet' : fallback.source,
  };
}

function pickDefaultTestConfig(configs) {
  if (!Array.isArray(configs) || configs.length === 0) return null;

  const explicitDefault = configs.find((c) => Boolean(c?.isDefault));
  if (explicitDefault) return explicitDefault;

  const preferred = configs.find((c) => {
    const name = String(c?.testName || '').toLowerCase();
    return name.includes('default') || name.includes('preconfig') || name.includes('recommended');
  });

  if (preferred) return preferred;

  return [...configs].sort((a, b) => {
    const at = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bt = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bt - at;
  })[0];
}

function buildCooldownSpans(results, fallbackCooldownSeconds, windowModel) {
  if (!Array.isArray(results) || results.length === 0) return [];

  return results
    .filter((r) => (r.statusCode >= 400 && r.statusCode < 500) || r.status === 'rate_limited')
    .map((r) => {
      const start = Math.floor(new Date(r.timestamp).getTime() / 1000);
      const retryAfter = Number(r?.rateLimit?.retryAfter || r?.retryAfter || 0);
      const rawCooldown = retryAfter > 0 ? retryAfter : fallbackCooldownSeconds;
      const cooldownSeconds =
        windowModel === 'SLIDING_WINDOW' ? Math.max(1, Math.floor(rawCooldown * 0.7)) : rawCooldown;

      return {
        start,
        end: start + cooldownSeconds,
        statusCode: r.statusCode,
        cooldownSeconds,
      };
    });
}

export default function ApiDashboardView({ template }) {
  const [running, setRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [testMode, setTestMode] = useState('real');
  const [granularity, setGranularity] = useState('1m');
  const [datasheet, setDatasheet] = useState(null);
  const [loadingDatasheet, setLoadingDatasheet] = useState(true);
  const [showDatasheet, setShowDatasheet] = useState(false);
  const [activeTab, setActiveTab] = useState('charts');
  const [defaultTestConfig, setDefaultTestConfig] = useState(null);
  const [loadingDefaultConfig, setLoadingDefaultConfig] = useState(false);
  const [advancedView, setAdvancedView] = useState(false);
  const [rateUsageModel, setRateUsageModel] = useState({
    windowModel: 'UNKNOWN',
    cooldownSeconds: 30,
    windowTypeRaw: null,
    source: 'fallback',
  });

  // Auto-refresh states
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(60);
  const autoRefreshInterval = useRef(null);

  // Test history management
  const {
    history,
    addTestResult,
    clearHistory,
    aggregateByGranularity,
    getCumulativeOverTime,
    getCurrentStats,
  } = useTestHistory(template?.id || 'default');

  // Real-time metrics from current test
  const [liveResults, setLiveResults] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);

  // Final summary from completed test
  const [summary, setSummary] = useState(null);

  // API limits fetched on-first-result
  const [apiLimits, setApiLimits] = useState({
    quotaDaily: template?.quotaLimit || null,
    rateDaily: template?.rateDaily || null,
    quotaSource: template?.quotaLimit ? 'template' : null,
    rateSource: template?.rateDaily ? 'template' : null,
    fetched: false,
  });

  // Chart states
  const [timeline, setTimeline] = useState([Math.floor(Date.now() / 1000)]);
  const [seriesData, setSeriesData] = useState({
    success: [0],
    rateLimit: [0],
    error: [0],
  });

  const pollInterval = useRef(null);

  // Auto-refresh: toggle on/off
  const handleAutoRefreshToggle = () => {
    setAutoRefreshEnabled((prev) => !prev);
  };

  // Auto-refresh: change interval
  const handleRefreshIntervalChange = (newInterval) => {
    setRefreshIntervalSeconds(newInterval);
  };

  const buildHeadersFromTemplate = () => {
    const hdrs = { 'Content-Type': 'application/json' };
    if (!template) return hdrs;

    if (template.authMethod === 'API_TOKEN' || template.authMethod === 'BEARER') {
      hdrs.Authorization = `Bearer ${template.authCredential}`;
    } else if (template.authMethod === 'BASIC_AUTH') {
      hdrs.Authorization = `Basic ${template.authCredential}`;
    } else if (template.authMethod === 'RAPID_API' || template.authMethod === 'RAPIDAPI') {
      hdrs['x-rapidapi-key'] = template.authCredential || '';
    }

    return hdrs;
  };

  const buildEndpointFromConfig = (config) => {
    const base = template?.apiUri || '';
    const path = String(config?.path || '/');
    if (!base) return path;
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    const queryParams = Array.isArray(config?.queryParams)
      ? config.queryParams
          .filter((q) => q && String(q.key || '').trim() !== '')
          .map((q) =>
            `${encodeURIComponent(String(q.key).trim())}=${encodeURIComponent(String(q.value || '').trim())}`
          )
      : [];
    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    return `${base.replace(/\/$/, '')}${normalizedPath}${query}`;
  };

  const buildSummaryFromResults = (results) => {
    const total = results.length;
    const ok = results.filter((r) => r.status === 'ok').length;
    const rateLimit = results.filter((r) => r.status === 'rate_limited').length;
    const error = results.filter((r) => r.status === 'error').length;
    const avgMs =
      total > 0 ? Math.round(results.reduce((sum, r) => sum + (r.durationMs || 0), 0) / total) : 0;
    return { total, ok, rateLimit, error, avgMs };
  };

  const runSimulatedTest = (config) => {
    const totalRequests = Math.max(1, parseInt(config?.totalRequests || 80, 10));
    const now = Date.now();
    const cooldownBase = rateUsageModel.cooldownSeconds || 30;

    let cursor = now;
    const simulatedResults = [];

    for (let i = 0; i < totalRequests; i++) {
      const triggerQuotaError =
        i === Math.floor(totalRequests * 0.45) || i === Math.floor(totalRequests * 0.72);
      const statusCode = triggerQuotaError ? 429 : 200;
      const status = statusCode === 429 ? 'rate_limited' : 'ok';
      const durationMs = 80 + Math.floor(Math.random() * 180);

      const result = {
        seq: i + 1,
        timestamp: new Date(cursor).toISOString(),
        status,
        statusCode,
        durationMs,
        retryAfter: statusCode === 429 ? String(cooldownBase) : null,
        request: {
          url: buildEndpointFromConfig(config),
          method: config?.method || template?.requestMethod || 'GET',
          headers: buildHeadersFromTemplate(),
          body: config?.body || null,
        },
        response: {
          status: statusCode,
          statusText: statusCode === 429 ? 'Too Many Requests' : 'OK',
          headers:
            statusCode === 429
              ? {
                  'retry-after': String(cooldownBase),
                  'x-ratelimit-limit': String(apiLimits?.rateDaily || 60),
                }
              : {},
          body:
            statusCode === 429
              ? JSON.stringify({ error: 'Rate limit exceeded', simulated: true })
              : JSON.stringify({ ok: true, simulated: true }),
        },
        rateLimit:
          statusCode === 429
            ? {
                detected: true,
                retryAfter: cooldownBase,
                window: cooldownBase,
                limit: apiLimits?.rateDaily || null,
              }
            : null,
      };

      simulatedResults.push(result);

      if (triggerQuotaError) {
        const cooldownGap =
          rateUsageModel.windowModel === 'SLIDING_WINDOW'
            ? Math.max(1, Math.floor(cooldownBase * 0.6))
            : cooldownBase;
        cursor += cooldownGap * 1000;
      } else {
        cursor += 300 + Math.floor(Math.random() * 250);
      }
    }

    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }

    setRunning(true);
    setActiveJobId(`sim-${Date.now()}`);
    setLiveResults([]);
    setTimeline([Math.floor(Date.now() / 1000)]);
    setSeriesData({ success: [0], rateLimit: [0], error: [0] });
    setSummary(null);
    setShowModal(false);

    let idx = 0;
    const progressive = [];

    pollInterval.current = setInterval(() => {
      progressive.push(simulatedResults[idx]);
      processResults(progressive);
      idx += 1;

      if (idx >= simulatedResults.length) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
        const finalSummary = buildSummaryFromResults(simulatedResults);
        setSummary(finalSummary);
        setLiveResults(simulatedResults);

        addTestResult({
          jobId: `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          results: simulatedResults,
          summary: finalSummary,
        });

        setRunning(false);
      }
    }, 75);
  };

  const executeDefaultConfigTest = async (config) => {
    const endpoint = buildEndpointFromConfig(config);
    const templateHeaders = buildHeadersFromTemplate();
    const customHeaders = Array.isArray(config?.headers)
      ? config.headers.reduce((acc, h) => {
          const key = String(h?.key || '').trim();
          if (!key) return acc;
          acc[key] = String(h?.value || '');
          return acc;
        }, {})
      : {};
    const headers = { ...templateHeaders, ...customHeaders };

    let parsedBody = null;
    if (config?.body && String(config.body).trim()) {
      try {
        parsedBody = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      } catch {
        parsedBody = config.body;
      }
    }

    const payload = {
      endpoint,
      request: {
        method: config?.method || template?.requestMethod || 'GET',
        headers,
        body: parsedBody,
      },
      clients: Math.max(1, parseInt(config?.clients || 1, 10)),
      totalRequests: Math.max(1, parseInt(config?.totalRequests || 1, 10)),
      timeoutMs: Math.max(1000, parseInt(config?.timeoutMs || 5000, 10)),
    };

    const { jobId } = await testApi(payload);
    handleTestStarted(jobId);
  };

  const handlePrimaryTestClick = async () => {
    if (running) return;

    const fallbackConfig = defaultTestConfig || {
      method: template?.requestMethod || 'GET',
      path: '/',
      clients: 1,
      totalRequests: 40,
      timeoutMs: 5000,
      body: '',
    };

    try {
      if (testMode === 'simulated') {
        runSimulatedTest(fallbackConfig);
        return;
      }

      if (defaultTestConfig) {
        await executeDefaultConfigTest(defaultTestConfig);
        return;
      }

      setShowModal(true);
    } catch (err) {
      console.error('[ApiDashboardView] Failed to start default test:', err);
      setShowModal(true);
    }
  };

  const handleModalConfigChange = useCallback(
    (config) => {
      if (!config || typeof config !== 'object') return;

      setDefaultTestConfig((prev) => {
        const next = {
          ...(prev || {}),
          ...config,
          method: config.method || prev?.method || template?.requestMethod || 'GET',
          path: config.path || prev?.path || '/',
          clients: Math.max(1, parseInt(config.clients || prev?.clients || 1, 10)),
          totalRequests: Math.max(
            1,
            parseInt(config.totalRequests || prev?.totalRequests || 1, 10)
          ),
          timeoutMs: Math.max(1000, parseInt(config.timeoutMs || prev?.timeoutMs || 5000, 10)),
          testName: prev?.testName || 'Configuracion manual',
        };

        const sameScalarFields =
          prev?.method === next.method &&
          prev?.path === next.path &&
          prev?.clients === next.clients &&
          prev?.totalRequests === next.totalRequests &&
          prev?.timeoutMs === next.timeoutMs &&
          prev?.body === next.body;

        const sameHeaders = JSON.stringify(prev?.headers || []) === JSON.stringify(next.headers || []);
        const sameQueryParams =
          JSON.stringify(prev?.queryParams || []) === JSON.stringify(next.queryParams || []);

        if (sameScalarFields && sameHeaders && sameQueryParams) {
          return prev;
        }

        return next;
      });
    },
    [template?.requestMethod]
  );

  // Triggered when a test job starts
  const handleTestStarted = (jobId) => {
    setShowModal(false);
    setRunning(true);
    setActiveJobId(jobId);
    setLiveResults([]);
    setTimeline([Math.floor(Date.now() / 1000)]);
    setSeriesData({ success: [0], rateLimit: [0], error: [0] });
    setSummary(null);

    // Try to fetch API limits once at test start (avoids stale closures inside interval)
    (async () => {
      if (!apiLimits.fetched) {
        try {
          const limits = await getApiLimits(template?.id || template?.name || template?.apiUri);
          setApiLimits((prev) => ({
            ...prev,
            quotaDaily: prev.quotaDaily || limits?.quotaDaily || null,
            rateDaily: prev.rateDaily || limits?.rateDaily || null,
            quotaSource: prev.quotaSource || (limits?.quotaDaily ? 'runtime' : null),
            rateSource: prev.rateSource || (limits?.rateDaily ? 'runtime' : null),
            fetched: true,
          }));
        } catch (e) {
          setApiLimits((prev) => ({ ...prev, fetched: true }));
        }
      }
    })();

    // Start polling for real-time memory state
    pollInterval.current = setInterval(async () => {
      try {
        const data = await getActiveJobResults(jobId);
        if (data && data.results) {
          processResults(data.results);
        }
      } catch (err) {
        if (err.status === 404) {
          // Job finished and removed from memory
          clearInterval(pollInterval.current);
          pollInterval.current = null; // Clear ref
          fetchFinalResults(jobId);
        } else {
          console.error('Error polling job results:', err);
        }
      }
    }, 500);
  };

  const fetchFinalResults = async (jobId) => {
    try {
      const finalJob = await getTestResults(jobId);
      console.log('[ApiDashboardView] Final job results:', finalJob);

      setSummary(finalJob.summary);
      setLiveResults(finalJob.results || []);

      // Try to extract daily limit from response bodies
      if (!apiLimits.quotaDaily && finalJob.results && finalJob.results.length > 0) {
        for (const result of finalJob.results) {
          if (result.response) {
            const extractedLimit = extractDailyLimitFromResponse(result.response);
            if (extractedLimit) {
              setApiLimits((prev) => ({
                ...prev,
                quotaDaily: prev.quotaDaily || extractedLimit,
                quotaSource: prev.quotaSource || (extractedLimit ? 'response' : null),
                fetched: true,
              }));
              break; // Use the first found limit
            }
          }
        }
      }

      // Store test result in history
      const testData = {
        jobId: jobId,
        timestamp: new Date().toISOString(),
        results: finalJob.results || [],
        summary: finalJob.summary || {},
      };
      console.log('[ApiDashboardView] Storing test in history:', testData);
      addTestResult(testData);
      console.log('[ApiDashboardView] History after adding:', history.length + 1, 'tests');

      setRunning(false);
    } catch (err) {
      console.error('Failed to fetch final results:', err);
      setRunning(false);
    }
  };

  const processResults = (results) => {
    if (!results || results.length === 0) return;

    // Group results by second and keep each status bucket explicit for visual feedback.
    const secondsMap = {};
    results.forEach((r) => {
      const ts = Math.floor(new Date(r.timestamp).getTime() / 1000);
      if (!secondsMap[ts]) {
        secondsMap[ts] = { success: 0, rateLimit: 0, error: 0 };
      }

      if (r.status === 'rate_limited' || r.statusCode === 429) {
        secondsMap[ts].rateLimit += 1;
      } else if (r.status === 'ok' || (r.statusCode >= 200 && r.statusCode < 400)) {
        secondsMap[ts].success += 1;
      } else {
        secondsMap[ts].error += 1;
      }
    });

    // Extract and sort timestamps
    const timestamps = Object.keys(secondsMap)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(-60); // Keep last 60 seconds

    if (timestamps.length === 0) return;

    // Build series data for each timestamp
    const successSeries = timestamps.map((ts) => secondsMap[ts]?.success || 0);
    const rateLimitSeries = timestamps.map((ts) => secondsMap[ts]?.rateLimit || 0);
    const errorSeries = timestamps.map((ts) => secondsMap[ts]?.error || 0);

    setTimeline(timestamps);
    setSeriesData({
      success: successSeries,
      rateLimit: rateLimitSeries,
      error: errorSeries,
    });

    setLiveResults(results);
  };

  /**
   * Get opportunity panel data from historical aggregated data
   */
  const getOpportunityData = useMemo(() => {
    const cumulativeData = getCumulativeOverTime(granularity);
    return {
      timestamps: cumulativeData.timestamps || [],
      cumulativeCounts: cumulativeData.cumulativeCounts || [],
    };
  }, [granularity, getCumulativeOverTime, history]);

  const cooldownSpans = useMemo(
    () =>
      buildCooldownSpans(liveResults, rateUsageModel.cooldownSeconds, rateUsageModel.windowModel),
    [liveResults, rateUsageModel]
  );

  const historicalInstantData = useMemo(() => {
    const granularitySeconds = Math.max(1, Math.floor(parseGranularity(granularity) / 1000));
    const histTs = (getOpportunityData.timestamps || []).map((ts) =>
      ts > 10000000000 ? Math.floor(ts / 1000) : ts
    );
    const histCum = getOpportunityData.cumulativeCounts || [];

    const histMap = new Map();
    histTs.forEach((ts, idx) => histMap.set(ts, histCum[idx] || 0));

    // Keep the live evolution tied to the selected granularity so only the active
    // bucket keeps changing while previous points remain stable.
    const liveCountByBucket = {};
    liveResults.forEach((r) => {
      const ts = Math.floor(new Date(r.timestamp).getTime() / 1000);
      const bucketTs = Math.floor(ts / granularitySeconds) * granularitySeconds;
      liveCountByBucket[bucketTs] = (liveCountByBucket[bucketTs] || 0) + 1;
    });

    const liveBuckets = Object.keys(liveCountByBucket)
      .map(Number)
      .sort((a, b) => a - b);
    const histBase = histCum.length > 0 ? histCum[histCum.length - 1] : 0;

    let acc = histBase;
    const liveCumMap = new Map();
    liveBuckets.forEach((ts) => {
      acc += liveCountByBucket[ts];
      liveCumMap.set(ts, acc);
    });

    const cooldownBoundaries = cooldownSpans.flatMap((span) => [span.start, span.end]);
    const x = [...new Set([...histTs, ...liveBuckets, ...cooldownBoundaries])].sort(
      (a, b) => a - b
    );

    if (x.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      return {
        data: [[now], [0], [0], [null]],
        maxY: 1,
      };
    }

    let runningHist = 0;
    let runningLive = histBase;
    const cumulative = x.map((ts) => {
      if (histMap.has(ts)) runningHist = histMap.get(ts);
      if (liveCumMap.has(ts)) runningLive = liveCumMap.get(ts);
      return Math.max(runningHist, runningLive);
    });
    const instant = x.map((ts) => liveCountByBucket[ts] || 0);

    const latestTs = x[x.length - 1];
    const windowStartTs = latestTs - granularitySeconds;
    const firstInWindowIdx = x.findIndex((ts) => ts >= windowStartTs);
    const startIdx = firstInWindowIdx > 0 ? firstInWindowIdx - 1 : Math.max(0, firstInWindowIdx);

    const visibleX = x.slice(startIdx);
    const visibleCumulative = cumulative.slice(startIdx);
    const visibleInstant = instant.slice(startIdx);
    const maxY = Math.max(1, ...visibleCumulative, ...visibleInstant);
    const cooldownOverlay = visibleX.map((ts) =>
      cooldownSpans.some((span) => ts >= span.start && ts <= span.end) ? maxY * 0.85 : null
    );

    return {
      data: [visibleX, visibleCumulative, visibleInstant, cooldownOverlay],
      maxY,
    };
  }, [getOpportunityData, liveResults, cooldownSpans, granularity]);

  const capacityChartData = useMemo(() => {
    const requestCountBySecond = {};
    liveResults.forEach((r) => {
      const ts = Math.floor(new Date(r.timestamp).getTime() / 1000);
      requestCountBySecond[ts] = (requestCountBySecond[ts] || 0) + 1;
    });

    const seconds = Object.keys(requestCountBySecond)
      .map(Number)
      .sort((a, b) => a - b);
    const cooldownBoundaries = cooldownSpans.flatMap((span) => [span.start, span.end]);
    const x = [...new Set([...seconds, ...cooldownBoundaries])].sort((a, b) => a - b);

    if (x.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      return {
        data: [[now], [0], [0], [0], [null]],
        maxY: 1,
      };
    }

    let cumulative = 0;
    const accumulatedTraffic = x.map((ts) => {
      cumulative += requestCountBySecond[ts] || 0;
      return cumulative;
    });

    const quotaLimit =
      apiLimits?.quotaDaily ||
      template?.quotaLimit ||
      Math.max(50, accumulatedTraffic[accumulatedTraffic.length - 1] + 20);
    const maxTime = x[x.length - 1] - x[0] || 1;
    const avgRate = accumulatedTraffic[accumulatedTraffic.length - 1] / maxTime;
    const idealTraffic = x.map((ts) => {
      const elapsed = Math.max(0, ts - x[0]);
      const expected = Math.round(elapsed * avgRate);
      return Math.min(expected, quotaLimit);
    });

    const quotaSeries = x.map(() => quotaLimit);
    const maxY = Math.max(1, quotaLimit, ...accumulatedTraffic, ...idealTraffic);
    const cooldownOverlay = x.map((ts) =>
      cooldownSpans.some((span) => ts >= span.start && ts <= span.end) ? maxY * 0.85 : null
    );

    return {
      data: [x, accumulatedTraffic, idealTraffic, quotaSeries, cooldownOverlay],
      maxY,
      quotaLimit,
    };
  }, [liveResults, cooldownSpans, apiLimits, template?.quotaLimit]);

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  // Log when history changes
  useEffect(() => {
    console.log('[ApiDashboardView] History updated:', {
      totalTests: history.length,
      templateId: template?.id,
    });
  }, [history, template?.id]);

  useEffect(() => {
    const loadDefaultTestConfig = async () => {
      if (!template?.id) {
        setDefaultTestConfig(null);
        return;
      }

      setLoadingDefaultConfig(true);
      try {
        const configs = await getTestConfigs(template.id);
        const selected = pickDefaultTestConfig(configs);
        setDefaultTestConfig(selected || null);
      } catch (err) {
        console.error('[ApiDashboardView] Failed to load test configs:', err);
        setDefaultTestConfig(null);
      } finally {
        setLoadingDefaultConfig(false);
      }
    };

    loadDefaultTestConfig();
  }, [template?.id]);

  /**
   * Auto-refresh: Execute tests automatically at specified intervals
   */
  useEffect(() => {
    // Clear any existing interval
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }

    // Only start auto-refresh if enabled
    if (!autoRefreshEnabled) {
      return;
    }

    console.log(`[Auto-refresh] Starting with interval: ${refreshIntervalSeconds}s`);

    // Function to execute test - wrapped to avoid stale closures
    const executeTest = async () => {
      // Only execute if not currently running and we have a template
      if (!template?.id) {
        console.log('[Auto-refresh] No template available');
        return;
      }

      const fallbackConfig = defaultTestConfig || {
        method: template?.requestMethod || 'GET',
        path: '/',
        clients: 1,
        totalRequests: 40,
        timeoutMs: 5000,
        body: '',
      };

      try {
        if (testMode === 'simulated') {
          runSimulatedTest(fallbackConfig);
        } else if (defaultTestConfig) {
          await executeDefaultConfigTest(defaultTestConfig);
        } else {
          console.log('[Auto-refresh] No default config available');
        }
      } catch (err) {
        console.error('[Auto-refresh] Failed to execute test:', err);
      }
    };

    // Execute immediately on enable
    executeTest();

    // Set up interval for automatic execution
    autoRefreshInterval.current = setInterval(() => {
      console.log('[Auto-refresh] Executing scheduled test...');
      executeTest();
    }, refreshIntervalSeconds * 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoRefreshInterval.current) {
        console.log('[Auto-refresh] Cleaning up interval');
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshEnabled, refreshIntervalSeconds]);

  /**
   * Load datasheet for the template
   */
  useEffect(() => {
    const loadDatasheet = async () => {
      if (!template?.id) {
        setLoadingDatasheet(false);
        return;
      }

      try {
        setLoadingDatasheet(true);
        const data = await getTemplateDatasheet(template.id);
        console.log('[ApiDashboardView] Datasheet loaded:', data);

        // Handle both cases: datasheet as direct property or nested
        const datasheetContent = data?.datasheet || data;
        setDatasheet(datasheetContent);

        const model = extractRateUsageModelFromDatasheet(datasheetContent);
        setRateUsageModel(model);

        const extracted = extractLimitsFromDatasheet(datasheetContent);
        if (extracted.quotaMax !== null || extracted.rateMax !== null) {
          setApiLimits((prev) => ({
            ...prev,
            quotaDaily: extracted.quotaMax ?? prev.quotaDaily,
            rateDaily: extracted.rateMax ?? prev.rateDaily,
            quotaSource: extracted.quotaMax !== null ? 'datasheet' : prev.quotaSource,
            rateSource: extracted.rateMax !== null ? 'datasheet' : prev.rateSource,
            fetched: true,
          }));
        }
      } catch (err) {
        console.error('Failed to load datasheet:', err);
        setDatasheet(null);
        setRateUsageModel({
          windowModel: 'UNKNOWN',
          cooldownSeconds: 30,
          windowTypeRaw: null,
          source: 'fallback',
        });
      } finally {
        setLoadingDatasheet(false);
      }
    };

    loadDatasheet();
  }, [template?.id]);

  const chartData = useMemo(() => {
    // Ensure timeline has at least one point and all series have the same length
    if (!timeline || timeline.length === 0) {
      return [[Math.floor(Date.now() / 1000)], [0], [0], [0]];
    }
    return [timeline, seriesData.success, seriesData.rateLimit, seriesData.error];
  }, [timeline, seriesData]);

  const historicalInstantOpts = {
    title: 'Historico + Peticiones en el Instante',
    width: 850,
    height: 300,
    scales: {
      x: {
        auto: false,
        range: [
          Math.min(...(historicalInstantData.data?.[0] || [Math.floor(Date.now() / 1000)])),
          Math.max(...(historicalInstantData.data?.[0] || [Math.floor(Date.now() / 1000)])),
        ],
      },
      y: { auto: false, range: [0, historicalInstantData.maxY * 1.2] },
    },
    axes: [
      {
        label: 'Tiempo',
        values: (u, vals) => vals.map((v) => formatTimeByGranularity(v * 1000, granularity)),
      },
      { label: 'Peticiones', side: 1 },
    ],
    series: [
      { label: 'Tiempo' },
      { label: 'Acumulado', stroke: '#0284c7', width: 3, fill: 'rgba(2,132,199,0.08)' },
      {
        label: 'Request Instantaneo (barras)',
        stroke: '#059669',
        fill: 'rgba(5, 150, 105, 0.35)',
        width: 1,
        points: { show: false },
        paths: uPlot.paths.bars({
          size: [0.65, 80],
          align: 1,
        }),
      },
      {
        label: 'Cooldown 4XX',
        stroke: '#fb923c',
        width: 0,
        fill: 'rgba(251,146,60,0.22)',
        points: { show: false },
      },
    ],
  };

  const capacityCooldownOpts = {
    title: 'Capacidad / Cuota y Cooldown',
    width: 850,
    height: 300,
    scales: {
      x: {
        auto: false,
        range: [
          Math.min(...(capacityChartData.data?.[0] || [Math.floor(Date.now() / 1000)])),
          Math.max(...(capacityChartData.data?.[0] || [Math.floor(Date.now() / 1000)])),
        ],
      },
      y: { auto: false, range: [0, capacityChartData.maxY * 1.2] },
    },
    axes: [
      {
        label: 'Tiempo',
        values: (u, vals) =>
          vals.map((v) =>
            new Date(v * 1000).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          ),
      },
      { label: 'Capacidad', side: 1 },
    ],
    series: [
      { label: 'Tiempo' },
      { label: 'Trafico Acumulado', stroke: '#0ea5e9', width: 3, fill: 'rgba(14,165,233,0.10)' },
      {
        label: 'Trafico sin cooldown',
        stroke: '#ef4444',
        width: 2,
        dash: [10, 6],
        points: { show: false },
      },
      {
        label: 'Limite de cuota',
        stroke: '#f59e0b',
        width: 2,
        dash: [6, 6],
        points: { show: false },
      },
      {
        label: 'Zona cooldown',
        stroke: '#f43f5e',
        width: 0,
        fill: 'rgba(244,63,94,0.2)',
        points: { show: false },
      },
    ],
  };

  const sourceLabel = {
    datasheet: 'Datasheet',
    template: 'Template',
    runtime: 'Runtime',
    response: 'Response',
  };

  return (
    <>
      {/* Header & Stats */}
      <div className="w-full p-6 container-max-width mx-auto">
        <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-text flex items-center gap-3">
              {template?.name}
            </h2>
            <p className="text-slate-400 mt-1 font-mono text-sm">{template?.apiUri}</p>
          </div>

          <BaseButton variant="icon" size="icon" onClick={showEditModal ? () => setShowEditModal(false) : () => setShowEditModal(true)}>
            <Pencil size={16} />
          </BaseButton>

          <ApiDashboardActionBar
            testMode={testMode}
            running={running}
            loadingDefaultConfig={loadingDefaultConfig}
            loadingDatasheet={loadingDatasheet}
            showDatasheet={showDatasheet}
            onToggleMode={() => setTestMode((prev) => (prev === 'real' ? 'simulated' : 'real'))}
            onEdit={() => setShowEditModal(true)}
            onToggleDatasheet={() => setShowDatasheet(!showDatasheet)}
            onRun={handlePrimaryTestClick}
            onConfigure={() => setShowModal(true)}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <span className="badge badge-info text-xs">
            Modelo:{' '}
            {rateUsageModel.windowModel === 'SLIDING_WINDOW'
              ? 'Ventana Deslizante'
              : rateUsageModel.windowModel === 'FIXED_WINDOW'
                ? 'Ventana Fija'
                : 'No detectado'}
          </span>
          <span className="badge badge-info text-xs">
            Cooldown base: {rateUsageModel.cooldownSeconds}s
          </span>
          <span className="badge badge-info text-xs">
            Test por defecto:{' '}
            {loadingDefaultConfig
              ? 'cargando...'
              : defaultTestConfig
                ? defaultTestConfig.testName
                : 'no configurado'}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <AutoRefreshSelector
            enabled={autoRefreshEnabled}
            interval={refreshIntervalSeconds}
            onToggle={handleAutoRefreshToggle}
            onIntervalChange={handleRefreshIntervalChange}
            disabled={loadingDefaultConfig}
          />
        </div>
      </div>

      {showDatasheet && (
        <div className="fixed right-4 top-24 z-40 w-[min(92vw,560px)] bg-primary">
          <BaseCard className="max-h-[78vh] overflow-auto border border-border shadow-lg p-2">
            <div className="flex-grow-1 card-header">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <FileText size={20} />
                Datasheet
              </h3>
            </div>

            {loadingDatasheet ? (
              <p className="text-slate-400 text-center py-6">Cargando datasheet...</p>
            ) : !datasheet ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-400 mb-2">
                      No se encontro informacion de datasheet
                    </h4>
                    <p className="text-sm text-yellow-200/80">
                      Esta API no tiene un datasheet YAML configurado. Los datasheets contienen
                      informacion importante como autenticacion, rate limiting, parametros y
                      endpoints disponibles.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <DatasheetViewer
                datasheet={datasheet}
                templateName={template?.name}
                templateUri={template?.apiUri}
              />
            )}
          </BaseCard>
        </div>
      )}

      {/* Stats Section */}
      <div className="w-full p-6 container-max-width mx-auto">
        <div className="stats-grid mb-6">
          <StatCard
            title="Total Requests"
            value={getCurrentStats().total}
            icon={<Activity size={20} />}
            color="text-text"
          />
          <StatCard
            title="Success"
            value={getCurrentStats().success}
            icon={<Activity size={20} />}
            color="text-text"
          />
          <StatCard
            title="Rate Limited"
            value={getCurrentStats().rateLimited}
            icon={<AlertCircle size={20} />}
            color="text-text"
          />
          <StatCard
            title="Avg Latency"
            value={`${getCurrentStats().avgLatency}ms`}
            icon={<Clock size={20} />}
            color="text-text"
          />
        </div>
      </div>

      <ApiDashboardTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'charts' && (
        <>
          <div className="flex flex-row h-1/2 gap-4 container-max-width mx-auto my-6">
            <BaseCard className="w-full h-full p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">
                  Peticiones Realizadas
                </h3>
                <GranularitySelector value={granularity} onChange={setGranularity} />
              </div>
              <div className="flex justify-center w-full h-full overflow-x-auto">
                <UPlotChart options={historicalInstantOpts} data={historicalInstantData.data} />
              </div>
              <div className="mt-3 text-xs text-slate-400 flex flex-wrap gap-4">
                <span>Cooldown detectado por respuestas 4XX (especialmente 429).</span>
                <span>
                  Regulacion:{' '}
                  {rateUsageModel.windowModel === 'SLIDING_WINDOW'
                    ? 'Deslizante'
                    : rateUsageModel.windowModel === 'FIXED_WINDOW'
                      ? 'Fija'
                      : 'No detectada'}
                </span>
              </div>
            </BaseCard>

            <BaseCard className="gap-2 h-full">
              <h3 className="text-lg font-bold text-text text-center mb-2">API Limits & Quota</h3>
              <ProgressBar
                label="Request Quota Usage"
                current={summary?.total || liveResults.length}
                max={apiLimits?.quotaDaily || template?.quotaLimit || 1000}
                unit="reqs"
                color="bg-gradient-to-r from-cyan-500 to-blue-500"
              />

              <ProgressBar
                label="Efficiency Score"
                current={summary?.ok || liveResults.filter((r) => r.status === 'ok').length}
                max={summary?.total || liveResults.length || 1}
                unit="success"
                color="bg-gradient-to-r from-emerald-500 to-teal-500"
              />
              <hr className="my-4" />
              <div className="flex flex-col gap-4 align-center items-center">
                <div className="limits-panel">
                  <h5 className="text-sm font-bold text-text mb-2">Applied Limits</h5>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Quota Max</span>
                      <span className="text-text font-semibold">
                        {apiLimits?.quotaDaily
                          ? `${apiLimits.quotaDaily.toLocaleString()} req/day`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Rate Max</span>
                      <span className="text-text font-semibold">
                        {apiLimits?.rateDaily
                          ? `${apiLimits.rateDaily.toLocaleString()} req/min`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Quota Source</span>
                      <span className="text-text font-semibold">
                        {sourceLabel[apiLimits?.quotaSource] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Rate Source</span>
                      <span className="text-text font-semibold">
                        {sourceLabel[apiLimits?.rateSource] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Rate Model</span>
                      <span className="text-text font-semibold">
                        {rateUsageModel.windowModel === 'SLIDING_WINDOW'
                          ? 'Sliding'
                          : rateUsageModel.windowModel === 'FIXED_WINDOW'
                            ? 'Fixed'
                            : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Cooldown Base</span>
                      <span className="text-text font-semibold">
                        {rateUsageModel.cooldownSeconds}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <div className="flex flex-row w-full container-max-width mx-auto gap-6"></div>

          <div className="container-max-width mx-auto my-6">
            <BaseCard>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold mb-0">Capacidad / Cuota con Cooldown 4XX</h3>
                <span className="badge badge-info text-xs">
                  {rateUsageModel.windowModel === 'SLIDING_WINDOW'
                    ? 'Sliding Window'
                    : rateUsageModel.windowModel === 'FIXED_WINDOW'
                      ? 'Fixed Window'
                      : 'Unknown model'}
                </span>
              </div>
              <div className="p-2">
                {liveResults.length > 0 ? (
                  <UPlotChart options={capacityCooldownOpts} data={capacityChartData.data} />
                ) : (
                  <p className="text-sm text-slate-400 text-center py-12">
                    Ejecuta un test para ver la evolucion de capacidad y cooldown
                  </p>
                )}
              </div>
            </BaseCard>
          </div>
        </>
      )}

      {activeTab === 'realtime' && (
        <div className="flex container-max-width mx-auto gap-6 my-6">
          <BaseCard className="w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold mb-0">Peticiones y respuestas (tiempo real)</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={advancedView}
                  onChange={(e) => setAdvancedView(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs font-semibold text-slate-400">Vista avanzada</span>
              </label>
            </div>
            {advancedView ? (
              <RealTimePanel liveResults={liveResults} />
            ) : (
              <SimpleRealTimePanel liveResults={liveResults} />
            )}
          </BaseCard>
        </div>
      )}

      {activeTab === 'cooldown' && (
        <div className="container-max-width mx-auto my-6">
          <BaseCard>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold mb-0">Eventos de Cooldown</h3>
              <BaseButton
                onClick={() => clearHistory()}
                className="!p-2 !text-xs"
                disabled={history.length === 0}
              >
                <Trash2 size={14} />
              </BaseButton>
            </div>
            <div className="p-2 space-y-3 max-h-[350px] overflow-auto">
              {cooldownSpans.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-10">
                  Sin eventos de cooldown detectados todavia
                </p>
              )}
              {cooldownSpans.map((span, idx) => (
                <div
                  key={`${span.start}-${idx}`}
                  className="p-3 border border-secondary-lighter rounded-lg"
                >
                  <p className="text-xs text-slate-400">
                    {new Date(span.start * 1000).toLocaleTimeString('es-ES')}
                  </p>
                  <p className="font-semibold text-text">
                    Error {span.statusCode} - cooldown {span.cooldownSeconds}s
                  </p>
                  <p className="text-xs text-slate-400">
                    Hasta: {new Date(span.end * 1000).toLocaleTimeString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          </BaseCard>
        </div>
      )}

      {activeTab === 'storage' && (
        <div className="container-max-width mx-auto my-6">
          <StorageInfoPanel />
        </div>
      )}

      {showModal && (
        <div className="fixed right-4 top-24 z-50 w-[min(96vw,820px)] bg-primary">
          <BaseCard className="max-h-[78vh] overflow-auto border border-border shadow-lg p-2">
            <TemplateTestView
              template={template}
              OnClose={() => setShowModal(false)}
              initialConfig={defaultTestConfig}
              onConfigChange={handleModalConfigChange}
            />
          </BaseCard>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay z-50">
          <div className="modal-panel max-w-3xl">
            <TemplateForm
              template={template}
              onDone={() => {
                setShowEditModal(false);
                // Reload datasheet after template update
                const loadDatasheet = async () => {
                  try {
                    const ds = await getTemplateDatasheet(template.id);
                    const datasheetContent = ds?.datasheet || ds;
                    setDatasheet(datasheetContent);

                    const extracted = extractLimitsFromDatasheet(datasheetContent);
                    if (extracted.quotaMax !== null || extracted.rateMax !== null) {
                      setApiLimits((prev) => ({
                        ...prev,
                        quotaDaily: extracted.quotaMax ?? prev.quotaDaily,
                        rateDaily: extracted.rateMax ?? prev.rateDaily,
                        quotaSource: extracted.quotaMax !== null ? 'datasheet' : prev.quotaSource,
                        rateSource: extracted.rateMax !== null ? 'datasheet' : prev.rateSource,
                        fetched: true,
                      }));
                    }
                  } catch (err) {
                    console.error('[ApiDashboardView] Error loading datasheet after update:', err);
                  }
                };
                loadDatasheet();
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
