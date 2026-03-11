import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import TemplateTestView from '../components/TemplateTestView.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import DatasheetViewer from '../components/DatasheetViewer.jsx';
import StorageInfoPanel from '../components/StorageInfoPanel.jsx';
import ApiDashboardActionBar from '../components/dashboard/ApiDashboardActionBar.jsx';
import ApiDashboardTabs from '../components/dashboard/ApiDashboardTabs.jsx';
import { RealTimePanel, SimpleRealTimePanel } from '../components/dashboard/RealtimePanels.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import HistoricalInstantChartCard from '../components/dashboard/charts/HistoricalInstantChartCard.jsx';
import CapacityCooldownChartCard from '../components/dashboard/charts/CapacityCooldownChartCard.jsx';
import SafeModeAutoRefreshCard from '../components/dashboard/SafeModeAutoRefreshCard.jsx';
import ApiLimitsQuotaCard from '../components/dashboard/ApiLimitsQuotaCard.jsx';
import DummyApiControlPanel from '../components/dashboard/DummyApiControlPanel.jsx';
import {
  getActiveJobResults,
  testApi,
  getTemplate as getTemplateRecord,
  getTestResults,
  getApiLimits,
  getTemplateDatasheet,
  getTestConfigs,
  updateTemplate as updateTemplateRecord,
} from '../services/apiTemplateService.js';
import { useTestHistory } from '../hooks/useTestHistory.js';
import { useToast } from '../stores/toastStore.jsx';
import {
  Activity,
  Clock,
  AlertCircle,
  Trash2,
  BookOpen,
  Pencil,
  FileText,
  X,
  CheckCircle,
} from 'lucide-react';
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

const DEFAULT_DUMMY_CONTROL = {
  quotaMax: 1000,
  rateMax: 60,
  windowModel: 'FIXED_WINDOW',
  windowSeconds: 60,
  cooldownSeconds: 30,
  totalRequests: 80,
};

const clampInt = (value, min, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

export default function ApiDashboardView({ template }) {
  const [running, setRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [testMode, setTestMode] = useState('real');
  const [datasheet, setDatasheet] = useState(null);
  const [loadingDatasheet, setLoadingDatasheet] = useState(true);
  const [showDatasheet, setShowDatasheet] = useState(false);
  const [activeTab, setActiveTab] = useState('charts');
  const [capacityViewInterval, setCapacityViewInterval] = useState('auto');
  const [trafficTimeScale, setTrafficTimeScale] = useState('1h');
  const [defaultTestConfig, setDefaultTestConfig] = useState(null);
  const [loadingDefaultConfig, setLoadingDefaultConfig] = useState(false);
  const [advancedView, setAdvancedView] = useState(false);
  const [dummyControl, setDummyControl] = useState(DEFAULT_DUMMY_CONTROL);
  const [savingDummyControl, setSavingDummyControl] = useState(false);
  const [resolvedIsDummy, setResolvedIsDummy] = useState(Boolean(template?.isDummy));
  const [resolvedDummyConfig, setResolvedDummyConfig] = useState(template?.dummyConfig || null);

  // Safe mode: auto-regulates requests to avoid hitting rate limits
  const [safeModeEnabled, setSafeModeEnabled] = useState(false);

  // Cooldown tracking
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
  const [activeCooldownEnd, setActiveCooldownEnd] = useState(null);
  const cooldownTimerInterval = useRef(null);

  // Auto-refresh states
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(60);
  const autoRefreshInterval = useRef(null);

  // Test history management
  const toast = useToast();
  const lastAlertedCountRef = useRef(0);
  const alertedResultKeysRef = useRef(new Set());
  const { history, addTestResult, clearHistory, getCurrentStats } = useTestHistory(
    template?.id || 'default'
  );

  // Real-time metrics from current test
  const [liveResults, setLiveResults] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);

  // Final summary from completed test
  const [summary, setSummary] = useState(null);

  // API limits fetched from backend (unified structure)
  const [apiLimits, setApiLimits] = useState({
    quotaMax: template?.quotaLimit || null,
    rateMax: template?.rateDaily || null,
    windowModel: 'UNKNOWN',
    windowSeconds: null,
    cooldownSeconds: 30,
    source: template?.quotaLimit || template?.rateDaily ? 'template' : 'none',
    fetched: false,
  });

  const pollInterval = useRef(null);
  const isDummyTemplate = Boolean(
    template?.isDummy || resolvedIsDummy || template?.dummyConfig || resolvedDummyConfig
  );
  const persistedDummyConfig = resolvedDummyConfig || template?.dummyConfig || null;

  const buildResultAlertKey = useCallback((result, index = 0) => {
    return [
      result?.seq ?? index,
      result?.timestamp ?? 'no-ts',
      result?.statusCode ?? result?.status ?? 'no-status',
      result?.request?.url ?? 'no-url',
    ].join('|');
  }, []);

  const notifyRateLimitAnd4xx = useCallback(
    (results) => {
      if (!Array.isArray(results) || results.length === 0) return;

      results.forEach((result, index) => {
        const isRateLimited = result?.statusCode === 429 || result?.status === 'rate_limited';
        const isClientError = Number(result?.statusCode) >= 400 && Number(result?.statusCode) < 500;

        if (!isRateLimited && !isClientError) {
          return;
        }

        const alertKey = buildResultAlertKey(result, index);
        if (alertedResultKeysRef.current.has(alertKey)) {
          return;
        }
        alertedResultKeysRef.current.add(alertKey);

        const retryAfter = Number(result?.rateLimit?.retryAfter || result?.retryAfter || 0);
        const endpoint = result?.request?.url ? ` · ${result.request.url}` : '';

        if (isRateLimited) {
          const cooldownDetail = retryAfter > 0 ? ` · Cooldown ${retryAfter}s` : '';
          toast.warning(
            `Peticiones limitadas (429)${cooldownDetail}${endpoint}`,
            6500,
            `rate-limit-429-${retryAfter > 0 ? retryAfter : 'na'}`
          );
          return;
        }

        const statusCode = result?.statusCode || '4XX';
        toast.error(`Error cliente ${statusCode}${endpoint}`, 6500, `client-error-${statusCode}`);
      });
    },
    [buildResultAlertKey, toast]
  );

  const startProgressiveSimulation = useCallback(
    (results, jobPrefix, options = {}) => {
      if (!Array.isArray(results) || results.length === 0) {
        return;
      }

      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }

      lastAlertedCountRef.current = 0;
      alertedResultKeysRef.current = new Set();
      setRunning(true);
      setActiveJobId(`${jobPrefix}-${Date.now()}`);
      setLiveResults([]);
      setSummary(null);
      setShowModal(false);

      const instant = Boolean(options?.instant);

      if (instant) {
        processResults(results);
        const finalSummary = buildSummaryFromResults(results);
        setSummary(finalSummary);
        setLiveResults(results);

        addTestResult({
          jobId: `${jobPrefix}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          results,
          summary: finalSummary,
        });

        setRunning(false);
        return;
      }

      let idx = 0;
      const progressive = [];

      pollInterval.current = setInterval(() => {
        progressive.push(results[idx]);
        processResults(progressive);
        idx += 1;

        if (idx >= results.length) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
          const finalSummary = buildSummaryFromResults(results);
          setSummary(finalSummary);
          setLiveResults(results);

          addTestResult({
            jobId: `${jobPrefix}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            results,
            summary: finalSummary,
          });

          setRunning(false);
        }
      }, 75);
    },
    [addTestResult]
  );

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
          .map(
            (q) =>
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
    const cooldownBase = apiLimits.cooldownSeconds || 30;

    // Simulate timestamps starting in the past so the data lands on past x-axis positions.
    // Estimate total span: ~75 normal * 400ms + 2 cooldowns * cooldownBase
    const estimatedNormalMs = totalRequests * 400;
    const estimatedCooldownMs = 2 * cooldownBase * 1000;
    const estimatedTotalMs = estimatedNormalMs + estimatedCooldownMs + 5000;
    // Start far enough in the past that the last result lands ~5s ago
    let cursor = now - estimatedTotalMs;
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
                  'x-ratelimit-limit': String(apiLimits?.rateMax || 60),
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
                limit: apiLimits?.rateMax || null,
              }
            : null,
      };

      simulatedResults.push(result);

      if (triggerQuotaError) {
        const cooldownGap =
          apiLimits.windowModel === 'SLIDING_WINDOW'
            ? Math.max(1, Math.floor(cooldownBase * 0.6))
            : cooldownBase;
        cursor += cooldownGap * 1000;
      } else {
        // Vary request spacing: some bursts (100-200ms), some slower (400-700ms)
        const isBurst = Math.random() < 0.4;
        cursor += isBurst
          ? 100 + Math.floor(Math.random() * 100)
          : 400 + Math.floor(Math.random() * 300);
      }
    }

    startProgressiveSimulation(simulatedResults, 'sim');
  };

  // ---------------------------------------------------------------------------
  // Dummy API: fully mocked test — no real HTTP calls, hardcoded responses
  // designed to showcase chart rendering with realistic traffic patterns.
  // Parameters are locked to the Dummy datasheet: 60 rpm, 30s cooldown,
  // FIXED_WINDOW 60s, 1000 daily quota.
  // ---------------------------------------------------------------------------
  const runDummyTest = (config) => {
    const DUMMY_RPM_LIMIT = clampInt(dummyControl?.rateMax, 1, DEFAULT_DUMMY_CONTROL.rateMax);
    const DUMMY_COOLDOWN_S = clampInt(
      dummyControl?.cooldownSeconds,
      1,
      DEFAULT_DUMMY_CONTROL.cooldownSeconds
    );
    const DUMMY_WINDOW_S = clampInt(
      dummyControl?.windowSeconds,
      1,
      DEFAULT_DUMMY_CONTROL.windowSeconds
    );
    const DUMMY_ROUTES = [
      '/weather/current',
      '/weather/forecast',
      '/status/health',
      '/alerts/active',
      '/air-quality/index',
      '/stations/nearby',
    ];
    const DUMMY_METHODS = ['GET', 'POST', 'PUT'];

    const totalRequests = Math.max(
      1,
      parseInt(config?.totalRequests || dummyControl?.totalRequests || 80, 10)
    );
    const now = Date.now();

    // Randomized mock weather responses
    const MOCK_BODIES = [
      {
        location: 'Madrid',
        temperature: 22.5,
        humidity: 45,
        condition: 'sunny',
        wind_speed: 12,
        unit: 'celsius',
      },
      {
        location: 'Barcelona',
        temperature: 24.1,
        humidity: 60,
        condition: 'partly_cloudy',
        wind_speed: 8,
        unit: 'celsius',
      },
      {
        location: 'Sevilla',
        temperature: 28.3,
        humidity: 35,
        condition: 'hot',
        wind_speed: 5,
        unit: 'celsius',
      },
      {
        location: 'Valencia',
        temperature: 25.7,
        humidity: 55,
        condition: 'clear',
        wind_speed: 10,
        unit: 'celsius',
      },
      {
        location: 'Bilbao',
        temperature: 18.2,
        humidity: 75,
        condition: 'cloudy',
        wind_speed: 18,
        unit: 'celsius',
      },
      {
        location: 'Zaragoza',
        temperature: 20.0,
        humidity: 50,
        condition: 'windy',
        wind_speed: 25,
        unit: 'celsius',
      },
      {
        location: 'Málaga',
        temperature: 26.8,
        humidity: 65,
        condition: 'humid',
        wind_speed: 6,
        unit: 'celsius',
      },
      {
        location: 'Murcia',
        temperature: 30.1,
        humidity: 30,
        condition: 'very_hot',
        wind_speed: 3,
        unit: 'celsius',
      },
    ];

    const estimatedNormalMs = totalRequests * 4;
    let cursor = now - estimatedNormalMs;

    const simulatedResults = [];
    let remainingInWindow = DUMMY_RPM_LIMIT;
    const rateLimitProbability = Math.min(
      0.35,
      Math.max(0.06, totalRequests / (DUMMY_RPM_LIMIT * 4))
    );

    for (let i = 0; i < totalRequests; i++) {
      const triggerRateLimit = Math.random() < rateLimitProbability;
      const statusCode = triggerRateLimit ? 429 : 200;
      const status = statusCode === 429 ? 'rate_limited' : 'ok';
      const durationMs =
        statusCode === 429 ? 1 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 5);

      const mockBody = MOCK_BODIES[Math.floor(Math.random() * MOCK_BODIES.length)];
      const method = DUMMY_METHODS[Math.floor(Math.random() * DUMMY_METHODS.length)];
      const route = DUMMY_ROUTES[Math.floor(Math.random() * DUMMY_ROUTES.length)];
      const randomId = Math.floor(Math.random() * 5000) + 1;
      const resetTs = Math.floor(cursor / 1000) + DUMMY_COOLDOWN_S;

      if (statusCode === 200) {
        remainingInWindow = Math.max(0, remainingInWindow - 1);
      }

      simulatedResults.push({
        seq: i + 1,
        timestamp: new Date(cursor).toISOString(),
        status,
        statusCode,
        durationMs,
        retryAfter: statusCode === 429 ? String(DUMMY_COOLDOWN_S) : null,
        request: {
          url: `https://dummy.mock.local${route}?rid=${randomId}`,
          method,
          headers: { 'Content-Type': 'application/json', 'x-demo-client': 'dummy-api-demo' },
          body:
            method === 'GET'
              ? null
              : JSON.stringify({
                  sample: true,
                  seq: i + 1,
                  rid: randomId,
                  city: mockBody.location,
                }),
        },
        response: {
          status: statusCode,
          statusText: statusCode === 429 ? 'Too Many Requests' : 'OK',
          headers:
            statusCode === 429
              ? {
                  'retry-after': String(DUMMY_COOLDOWN_S),
                  'x-ratelimit-limit': String(DUMMY_RPM_LIMIT),
                  'x-ratelimit-remaining': '0',
                  'x-ratelimit-reset': String(resetTs),
                  'x-ratelimit-window': `${DUMMY_WINDOW_S}s`,
                  'content-type': 'application/json',
                }
              : {
                  'x-ratelimit-limit': String(DUMMY_RPM_LIMIT),
                  'x-ratelimit-remaining': String(remainingInWindow),
                  'x-ratelimit-window': `${DUMMY_WINDOW_S}s`,
                  'content-type': 'application/json',
                },
          body:
            statusCode === 429
              ? JSON.stringify({
                  error: 'Rate limit exceeded',
                  message: `Too many requests. Retry after ${DUMMY_COOLDOWN_S}s.`,
                  retryAfter: DUMMY_COOLDOWN_S,
                  limit: DUMMY_RPM_LIMIT,
                  window: `${DUMMY_WINDOW_S}s`,
                  _source: 'dummy-mock',
                })
              : JSON.stringify({
                  ...mockBody,
                  timestamp: new Date(cursor).toISOString(),
                  requestId: `dummy-${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
                  _source: 'dummy-mock',
                }),
        },
        rateLimit:
          statusCode === 429
            ? {
                detected: true,
                retryAfter: DUMMY_COOLDOWN_S,
                window: DUMMY_WINDOW_S,
                limit: DUMMY_RPM_LIMIT,
              }
            : null,
      });

      if (triggerRateLimit) {
        cursor += 5 + Math.floor(Math.random() * 5);
        remainingInWindow = DUMMY_RPM_LIMIT;
      } else {
        cursor += 1 + Math.floor(Math.random() * 4);
      }
    }

    startProgressiveSimulation(simulatedResults, 'dummy', { instant: true });
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
      dummyMode: Boolean(isDummyTemplate),
      dummyConfig: isDummyTemplate
        ? {
            quotaMax: clampInt(dummyControl?.quotaMax, 1, DEFAULT_DUMMY_CONTROL.quotaMax),
            rateMax: clampInt(dummyControl?.rateMax, 1, DEFAULT_DUMMY_CONTROL.rateMax),
            windowModel:
              dummyControl?.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW',
            windowSeconds: clampInt(
              dummyControl?.windowSeconds,
              1,
              DEFAULT_DUMMY_CONTROL.windowSeconds
            ),
            cooldownSeconds: clampInt(
              dummyControl?.cooldownSeconds,
              1,
              DEFAULT_DUMMY_CONTROL.cooldownSeconds
            ),
            totalRequests: clampInt(
              dummyControl?.totalRequests,
              1,
              DEFAULT_DUMMY_CONTROL.totalRequests
            ),
          }
        : null,
    };

    const { jobId } = await testApi(payload);
    handleTestStarted(jobId);
  };

  const handlePrimaryTestClick = async () => {
    if (running) return;
    if (isCurrentlyInCooldown) return; // Block clicks during cooldown

    const fallbackConfig = {
      ...(defaultTestConfig || {
        method: template?.requestMethod || 'GET',
        path: '/',
        clients: 1,
        totalRequests: 40,
        timeoutMs: 5000,
        body: '',
      }),
    };

    // Apply safe mode limits if enabled
    if (safeModeEnabled && safeRequestCount !== null) {
      fallbackConfig.totalRequests = Math.min(
        parseInt(fallbackConfig.totalRequests || 40, 10),
        safeRequestCount
      );
    }

    if (isDummyTemplate) {
      fallbackConfig.totalRequests = clampInt(
        dummyControl?.totalRequests,
        1,
        DEFAULT_DUMMY_CONTROL.totalRequests
      );
    }

    try {
      if (testMode === 'simulated' || isDummyTemplate) {
        if (isDummyTemplate) {
          runDummyTest(fallbackConfig);
        } else {
          runSimulatedTest(fallbackConfig);
        }
        return;
      }

      if (defaultTestConfig) {
        // Clone config and apply safe mode if needed
        const configToUse = { ...defaultTestConfig };
        if (safeModeEnabled && safeRequestCount !== null) {
          configToUse.totalRequests = Math.min(
            parseInt(configToUse.totalRequests || 40, 10),
            safeRequestCount
          );
        }
        await executeDefaultConfigTest(configToUse);
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

        const sameHeaders =
          JSON.stringify(prev?.headers || []) === JSON.stringify(next.headers || []);
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
    lastAlertedCountRef.current = 0;
    alertedResultKeysRef.current = new Set();
    setRunning(true);
    setActiveJobId(jobId);
    setLiveResults([]);
    setSummary(null);

    // Try to fetch API limits once at test start (avoids stale closures inside interval)
    (async () => {
      if (!apiLimits.fetched) {
        try {
          const limits = await getApiLimits(template?.id || template?.name || template?.apiUri);
          // limits structure from backend: { quotaMax, rateMax, windowModel, windowSeconds, cooldownSeconds, source }
          setApiLimits((prev) => ({
            ...prev,
            quotaMax: limits?.quotaMax ?? prev.quotaMax,
            rateMax: limits?.rateMax ?? prev.rateMax,
            windowModel: limits?.windowModel ?? prev.windowModel,
            windowSeconds: limits?.windowSeconds ?? prev.windowSeconds,
            cooldownSeconds: limits?.cooldownSeconds ?? prev.cooldownSeconds,
            source: limits?.source ?? prev.source,
            fetched: true,
          }));
        } catch (e) {
          console.warn('[startTest] Could not fetch API limits:', e?.message || e);
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
      if (!apiLimits.quotaMax && finalJob.results && finalJob.results.length > 0) {
        for (const result of finalJob.results) {
          if (result.response) {
            const extractedLimit = extractDailyLimitFromResponse(result.response);
            if (extractedLimit) {
              setApiLimits((prev) => ({
                ...prev,
                quotaMax: prev.quotaMax || extractedLimit,
                source: prev.source || (extractedLimit ? 'response' : 'none'),
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

      notifyRateLimitAnd4xx(finalJob.results || []);
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

    // Alert on any newly-received 4XX/rate-limited responses (runs only for new slice)
    const newResults = results.slice(lastAlertedCountRef.current);
    notifyRateLimitAnd4xx(newResults);
    lastAlertedCountRef.current = results.length;

    setLiveResults(results);
  };

  const capacityResults = useMemo(() => {
    const historicalResults = history.flatMap((entry) =>
      Array.isArray(entry?.results) ? entry.results : []
    );

    if (running) {
      return [...historicalResults, ...liveResults];
    }

    return historicalResults.length > 0 ? historicalResults : liveResults;
  }, [history, liveResults, running]);

  const cooldownSpans = useMemo(
    () => buildCooldownSpans(capacityResults, apiLimits.cooldownSeconds, apiLimits.windowModel),
    [capacityResults, apiLimits.cooldownSeconds, apiLimits.windowModel]
  );

  // Check if currently in cooldown (usable anywhere in component)
  const isCurrentlyInCooldown = useMemo(() => {
    return cooldownTimeRemaining > 0;
  }, [cooldownTimeRemaining]);

  // Safe mode: calculate safe request count (remaining capacity before rate limit)
  const safeRequestCount = useMemo(() => {
    if (!safeModeEnabled) return null;

    const rateLimit = apiLimits?.rateMax || apiLimits?.quotaMax || template?.quotaLimit;
    if (!rateLimit) return null;

    // Sum accumulated requests in current window
    const accumulatedRequests = capacityResults.reduce((sum) => sum + 1, 0);
    const remaining = Math.max(1, rateLimit - accumulatedRequests);

    return remaining;
  }, [safeModeEnabled, apiLimits, template?.quotaLimit, capacityResults]);

  // Traffic chart: per-second instant bars + rolling window line + rate limit + cooldown fill
  const trafficChartData = useMemo(() => {
    const windowSeconds = Math.max(5, Number(apiLimits?.windowSeconds) || 30);
    const rateLimit = apiLimits?.rateMax || apiLimits?.quotaMax || template?.quotaLimit || null;

    if (!capacityResults || capacityResults.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      return {
        data: [[now], [null], [0], rateLimit ? [rateLimit] : [null], [null]],
        maxY: rateLimit || 1,
        windowSeconds,
      };
    }

    // Per-second bucket counts
    const countBySecond = {};
    const has4xxBySecond = {};
    capacityResults.forEach((r) => {
      const ts = Math.floor(new Date(r.timestamp).getTime() / 1000);
      countBySecond[ts] = (countBySecond[ts] || 0) + 1;
      if (r.statusCode >= 400 && r.statusCode < 500) has4xxBySecond[ts] = true;
    });

    const seconds = Object.keys(countBySecond)
      .map(Number)
      .sort((a, b) => a - b);
    if (seconds.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      return {
        data: [[now], [null], [0], rateLimit ? [rateLimit] : [null], [null]],
        maxY: rateLimit || 1,
        windowSeconds,
      };
    }

    // Include cooldown span boundaries as x-axis points for clean fill areas
    const cooldownBoundaries = cooldownSpans.flatMap((span) => [span.start, span.end]);
    const x = [...new Set([...seconds, ...cooldownBoundaries])].sort((a, b) => a - b);

    // Rolling window line — resets hard on cooldown, 4XX or when reaching rate limit.
    const breachedBySecond = {};
    let windowBuffer = [];
    const rolling = x.map((ts) => {
      const inCooldown = cooldownSpans.some((s) => ts >= s.start && ts <= s.end);
      if (inCooldown) {
        windowBuffer = [];
        return 0;
      }
      const count = countBySecond[ts] || 0;
      windowBuffer.push({ ts, count });
      windowBuffer = windowBuffer.filter((e) => e.ts > ts - windowSeconds);
      const sum = windowBuffer.reduce((s, e) => s + e.count, 0);
      const reachedRateLimit = Boolean(rateLimit && sum >= rateLimit);
      if (has4xxBySecond[ts] || reachedRateLimit) {
        breachedBySecond[ts] = true;
        windowBuffer = [];
        return 0;
      }
      return sum;
    });

    // Instant bars — drop to 0 during cooldown or any 4XX/rate breach second.
    const instant = x.map((ts) => {
      const inCooldown = cooldownSpans.some((s) => ts >= s.start && ts <= s.end);
      if (inCooldown || has4xxBySecond[ts] || breachedBySecond[ts]) {
        return 0;
      }
      return countBySecond[ts] || 0;
    });

    // Fixed rate limit horizontal line
    const fixedRateLine = rateLimit ? x.map(() => rateLimit) : x.map(() => null);

    // Cooldown fill overlay
    const maxY = Math.max(1, rateLimit || 0, ...rolling, ...instant);
    const cooldownOverlay = x.map((ts) =>
      cooldownSpans.some((s) => ts >= s.start && ts <= s.end) ? maxY * 1.1 : null
    );

    // Time scale filtering for X axis readability
    const scaleToSeconds = {
      '5m': 5 * 60,
      '15m': 15 * 60,
      '30m': 30 * 60,
      '1h': 60 * 60,
      '6h': 6 * 60 * 60,
      '24h': 24 * 60 * 60,
      all: null,
    };
    const selectedWindowSeconds = scaleToSeconds[trafficTimeScale] ?? scaleToSeconds['1h'];

    if (selectedWindowSeconds) {
      const latestTs = x[x.length - 1];
      const windowStartTs = latestTs - selectedWindowSeconds;
      const firstInWindowIdx = x.findIndex((ts) => ts >= windowStartTs);
      const startIdx = firstInWindowIdx > 0 ? firstInWindowIdx - 1 : Math.max(0, firstInWindowIdx);

      const visibleX = x.slice(startIdx);
      const visibleInstant = instant.slice(startIdx);
      const visibleRolling = rolling.slice(startIdx);
      const visibleRate = fixedRateLine.slice(startIdx);
      const visibleCooldown = cooldownOverlay.slice(startIdx);

      return {
        data: [visibleX, visibleInstant, visibleRolling, visibleRate, visibleCooldown],
        maxY,
        windowSeconds,
      };
    }

    return {
      data: [x, instant, rolling, fixedRateLine, cooldownOverlay],
      maxY,
      windowSeconds,
    };
  }, [capacityResults, cooldownSpans, apiLimits, template?.quotaLimit, trafficTimeScale]);

  const capacityChartData = useMemo(() => {
    const configuredIntervalSeconds =
      capacityViewInterval === 'auto'
        ? Number(apiLimits?.windowSeconds) || 60
        : Number(capacityViewInterval);
    const intervalSeconds = Math.max(1, Math.floor(configuredIntervalSeconds));
    const countByBucket = {};
    const has4xxByBucket = {};

    // Historical buckets stay fixed; live buckets only evolve at the tail of the chart.
    capacityResults.forEach((r) => {
      const ts = Math.floor(new Date(r.timestamp).getTime() / 1000);
      const bucketTs = Math.floor(ts / intervalSeconds) * intervalSeconds;

      countByBucket[bucketTs] = (countByBucket[bucketTs] || 0) + 1;

      if (r.statusCode >= 400 && r.statusCode < 500) {
        has4xxByBucket[bucketTs] = true;
      }
    });

    const buckets = Object.keys(countByBucket)
      .map(Number)
      .sort((a, b) => a - b);
    const baseCooldownBoundaries = cooldownSpans.flatMap((span) => [span.start, span.end]);

    const firstTs = buckets.length > 0 ? buckets[0] : Math.floor(Date.now() / 1000);
    const lastTs = buckets.length > 0 ? buckets[buckets.length - 1] : firstTs;
    // Calculate limit first (needed for reset and fixed red limit line)
    const rateLimit = apiLimits?.rateMax || apiLimits?.quotaMax || template?.quotaLimit || null;
    const fallbackRateLimit = Math.max(
      10,
      ...Object.values(countByBucket),
      capacityResults.length || 0
    );
    const fixedRateLine = rateLimit || fallbackRateLimit;
    const cooldownDurationSeconds = Math.max(
      1,
      Number(apiLimits?.cooldownSeconds) || intervalSeconds
    );

    const isInSpan = (ts, span) => ts >= span.start && ts <= span.end;
    const isInAnySpan = (ts, spans) => spans.some((span) => isInSpan(ts, span));

    // Infer cooldown spans when we exceed rate in the accumulation logic.
    const inferredCooldownSpans = [];

    let cumulativePreview = 0;
    buckets.forEach((ts) => {
      // During backend-reported cooldown there should be no effective traffic.
      if (isInAnySpan(ts, cooldownSpans)) {
        return;
      }

      cumulativePreview += countByBucket[ts] || 0;
      const exceededRate = Boolean(fixedRateLine && cumulativePreview >= fixedRateLine);
      const got4xx = Boolean(has4xxByBucket[ts]);

      if (exceededRate || got4xx) {
        inferredCooldownSpans.push({
          start: ts,
          end: ts + cooldownDurationSeconds,
        });
        cumulativePreview = 0;
      }
    });

    const inferredCooldownBoundaries = inferredCooldownSpans.flatMap((span) => [
      span.start,
      span.end,
    ]);
    const cooldownBoundaries = [...baseCooldownBoundaries, ...inferredCooldownBoundaries];
    const allCooldownSpans = [...cooldownSpans, ...inferredCooldownSpans];
    // Force a visual drop to zero right after cooldown starts.
    const cooldownDropMarkers = allCooldownSpans.map((span) => Math.min(span.end, span.start + 1));
    const x = [...new Set([...buckets, ...cooldownBoundaries, ...cooldownDropMarkers])].sort(
      (a, b) => a - b
    );

    if (x.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      return {
        data: [[now], [0], [fixedRateLine], [null]],
        maxY: 1,
      };
    }

    let cumulative = 0;
    const accumulatedTraffic = x.map((ts) => {
      const inCooldown = isInAnySpan(ts, allCooldownSpans);
      if (inCooldown) {
        // Wasted capacity period: no requests should be counted.
        return 0;
      }

      cumulative += countByBucket[ts] || 0;
      const currentValue = cumulative;

      // Reset counter when reaching limit or on 4XX/rate_limited feedback.
      const shouldResetBy4xx = has4xxByBucket[ts];
      const shouldResetByLimit = Boolean(fixedRateLine && cumulative >= fixedRateLine);

      if (shouldResetBy4xx || shouldResetByLimit) {
        cumulative = 0;
      }

      return currentValue;
    });
    const fixedRateSeries = x.map(() => fixedRateLine);
    const maxY = Math.max(1, fixedRateLine, ...accumulatedTraffic);

    const cooldownOverlay = x.map((ts) => {
      return isInAnySpan(ts, allCooldownSpans) ? maxY * 1.05 : null;
    });

    return {
      data: [x, accumulatedTraffic, fixedRateSeries, cooldownOverlay],
      maxY,
      quotaLimit: fixedRateLine,
      intervalSeconds,
    };
  }, [capacityResults, cooldownSpans, apiLimits, template?.quotaLimit, capacityViewInterval]);

  // Cooldown toast ID ref so we can update/remove the same toast
  const cooldownToastIdRef = useRef(null);

  // Cooldown timer: update remaining time every second + drive toast
  useEffect(() => {
    if (!activeCooldownEnd) {
      setCooldownTimeRemaining(0);
      // Remove stale cooldown toast if any
      if (cooldownToastIdRef.current !== null) {
        toast.removeToast(cooldownToastIdRef.current);
        cooldownToastIdRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, activeCooldownEnd - now);
      setCooldownTimeRemaining(remaining);

      if (remaining <= 0) {
        setActiveCooldownEnd(null);
        if (cooldownTimerInterval.current) {
          clearInterval(cooldownTimerInterval.current);
          cooldownTimerInterval.current = null;
        }
        if (cooldownToastIdRef.current !== null) {
          toast.removeToast(cooldownToastIdRef.current);
          cooldownToastIdRef.current = null;
        }
        return;
      }

      const msg = `Cooldown activo — sin peticiones por ${remaining}s`;
      if (cooldownToastIdRef.current === null) {
        // Create persistent toast (duration 0 = no auto-dismiss)
        cooldownToastIdRef.current = toast.addToast(msg, 'warning', 0, 'cooldown-active');
      } else {
        // Update existing toast message in place
        toast.updateToast(cooldownToastIdRef.current, msg);
      }
    };

    updateTimer();
    cooldownTimerInterval.current = setInterval(updateTimer, 1000);

    return () => {
      if (cooldownTimerInterval.current) {
        clearInterval(cooldownTimerInterval.current);
        cooldownTimerInterval.current = null;
      }
    };
  }, [activeCooldownEnd, toast]);

  // Detect latest cooldown span and activate timer
  useEffect(() => {
    const allCooldownSpans = cooldownSpans || [];
    if (allCooldownSpans.length === 0) {
      setActiveCooldownEnd(null);
      return;
    }

    const latestSpan = allCooldownSpans[allCooldownSpans.length - 1];
    if (latestSpan && latestSpan.end) {
      setActiveCooldownEnd(latestSpan.end);
    }
  }, [cooldownSpans]);

  useEffect(() => {
    setResolvedIsDummy(Boolean(template?.isDummy));
    setResolvedDummyConfig(template?.dummyConfig || null);
  }, [template]);

  useEffect(() => {
    const hydrateTemplateFlags = async () => {
      if (!template?.id) {
        setResolvedIsDummy(Boolean(template?.isDummy));
        setResolvedDummyConfig(template?.dummyConfig || null);
        return;
      }

      try {
        const latestTemplate = await getTemplateRecord(template.id);
        setResolvedIsDummy(Boolean(latestTemplate?.isDummy));
        setResolvedDummyConfig(latestTemplate?.dummyConfig || null);
      } catch (err) {
        console.warn('[ApiDashboardView] Could not hydrate template flags:', err?.message || err);
      }
    };

    hydrateTemplateFlags();
  }, [template?.id]);

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (cooldownTimerInterval.current) clearInterval(cooldownTimerInterval.current);
    };
  }, []);

  // Log when history changes
  useEffect(() => {
    console.log('[ApiDashboardView] History updated:', {
      totalTests: history.length,
      templateId: template?.id,
    });
  }, [history, template?.id]);

  const handleDummyControlChange = useCallback((key, value) => {
    setDummyControl((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyDummyPreset = useCallback((presetName) => {
    if (presetName === 'stress') {
      setDummyControl({
        quotaMax: 2000,
        rateMax: 80,
        windowModel: 'FIXED_WINDOW',
        windowSeconds: 60,
        cooldownSeconds: 45,
        totalRequests: 180,
      });
      return;
    }

    if (presetName === 'recovery') {
      setDummyControl({
        quotaMax: 1000,
        rateMax: 25,
        windowModel: 'SLIDING_WINDOW',
        windowSeconds: 60,
        cooldownSeconds: 20,
        totalRequests: 60,
      });
      return;
    }

    setDummyControl(DEFAULT_DUMMY_CONTROL);
  }, []);

  const saveDummyControl = useCallback(async () => {
    if (!template?.id || !isDummyTemplate) return;

    setSavingDummyControl(true);
    try {
      const normalized = {
        quotaMax: clampInt(dummyControl?.quotaMax, 1, DEFAULT_DUMMY_CONTROL.quotaMax),
        rateMax: clampInt(dummyControl?.rateMax, 1, DEFAULT_DUMMY_CONTROL.rateMax),
        windowModel:
          dummyControl?.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW',
        windowSeconds: clampInt(
          dummyControl?.windowSeconds,
          1,
          DEFAULT_DUMMY_CONTROL.windowSeconds
        ),
        cooldownSeconds: clampInt(
          dummyControl?.cooldownSeconds,
          1,
          DEFAULT_DUMMY_CONTROL.cooldownSeconds
        ),
        totalRequests: clampInt(
          dummyControl?.totalRequests,
          1,
          DEFAULT_DUMMY_CONTROL.totalRequests
        ),
      };

      await updateTemplateRecord(template.id, {
        name: template.name,
        authMethod: template.authMethod || '',
        authCredential: template.authCredential || '',
        apiUri: template.apiUri,
        datasheet: template.datasheet,
        status: template.status || 'active',
        isDummy: true,
        dummyConfig: normalized,
      });

      setResolvedIsDummy(true);
      setResolvedDummyConfig(normalized);

      toast.success('Configuracion Dummy guardada');
    } catch (err) {
      toast.error(`No se pudo guardar la configuracion Dummy: ${err.message}`);
    } finally {
      setSavingDummyControl(false);
    }
  }, [template, template?.id, isDummyTemplate, dummyControl, toast]);

  useEffect(() => {
    if (!isDummyTemplate) {
      setDummyControl(DEFAULT_DUMMY_CONTROL);
      return;
    }

    const fromTemplate = persistedDummyConfig || {};
    setDummyControl({
      quotaMax: clampInt(fromTemplate.quotaMax, 1, DEFAULT_DUMMY_CONTROL.quotaMax),
      rateMax: clampInt(fromTemplate.rateMax, 1, DEFAULT_DUMMY_CONTROL.rateMax),
      windowModel:
        fromTemplate.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW',
      windowSeconds: clampInt(fromTemplate.windowSeconds, 1, DEFAULT_DUMMY_CONTROL.windowSeconds),
      cooldownSeconds: clampInt(
        fromTemplate.cooldownSeconds,
        1,
        DEFAULT_DUMMY_CONTROL.cooldownSeconds
      ),
      totalRequests: clampInt(fromTemplate.totalRequests, 1, DEFAULT_DUMMY_CONTROL.totalRequests),
    });
  }, [template?.id, isDummyTemplate, persistedDummyConfig]);

  // Dummy APIs: force simulated mode and apply local configurable limits so charts
  // render from dashboard controls without backend dependency.
  useEffect(() => {
    if (!isDummyTemplate) return;

    setTestMode('simulated');
    setApiLimits({
      quotaMax: clampInt(dummyControl?.quotaMax, 1, DEFAULT_DUMMY_CONTROL.quotaMax),
      rateMax: clampInt(dummyControl?.rateMax, 1, DEFAULT_DUMMY_CONTROL.rateMax),
      windowModel:
        dummyControl?.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW',
      windowSeconds: clampInt(dummyControl?.windowSeconds, 1, DEFAULT_DUMMY_CONTROL.windowSeconds),
      cooldownSeconds: clampInt(
        dummyControl?.cooldownSeconds,
        1,
        DEFAULT_DUMMY_CONTROL.cooldownSeconds
      ),
      source: 'dummy',
      fetched: true,
    });
  }, [template?.id, isDummyTemplate, dummyControl]);

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

      if (isDummyTemplate) {
        fallbackConfig.totalRequests = clampInt(
          dummyControl?.totalRequests,
          1,
          DEFAULT_DUMMY_CONTROL.totalRequests
        );
      }

      try {
        if (isDummyTemplate) {
          runDummyTest(fallbackConfig);
        } else if (testMode === 'simulated') {
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
  }, [
    autoRefreshEnabled,
    refreshIntervalSeconds,
    template?.id,
    isDummyTemplate,
    template?.requestMethod,
    defaultTestConfig,
    testMode,
    dummyControl,
  ]);

  /**
   * Load datasheet for the template and fetch API limits from backend
   */
  useEffect(() => {
    const loadDatasheet = async () => {
      if (!template?.id) {
        setLoadingDatasheet(false);
        return;
      }

      try {
        setLoadingDatasheet(true);
        // Dummy templates are fully local/mocked from dashboard controls.
        if (isDummyTemplate) {
          setDatasheet(template?.datasheet || null);
          setApiLimits({
            quotaMax: clampInt(dummyControl?.quotaMax, 1, DEFAULT_DUMMY_CONTROL.quotaMax),
            rateMax: clampInt(dummyControl?.rateMax, 1, DEFAULT_DUMMY_CONTROL.rateMax),
            windowModel:
              dummyControl?.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW',
            windowSeconds: clampInt(
              dummyControl?.windowSeconds,
              1,
              DEFAULT_DUMMY_CONTROL.windowSeconds
            ),
            cooldownSeconds: clampInt(
              dummyControl?.cooldownSeconds,
              1,
              DEFAULT_DUMMY_CONTROL.cooldownSeconds
            ),
            source: 'dummy',
            fetched: true,
          });
          return;
        }

        const data = await getTemplateDatasheet(template.id);
        console.log('[ApiDashboardView] Datasheet loaded:', data);

        // Handle both cases: datasheet as direct property or nested
        const datasheetContent = data?.datasheet || data;
        setDatasheet(datasheetContent);

        // Fetch structured limits from backend endpoint (replaces local extraction)
        try {
          const limits = await getApiLimits(template.id);
          console.log('[ApiDashboardView] API limits fetched from backend:', limits);
          setApiLimits((prev) => ({
            ...prev,
            quotaMax: limits?.quotaMax ?? prev.quotaMax,
            rateMax: limits?.rateMax ?? prev.rateMax,
            windowModel: limits?.windowModel ?? prev.windowModel,
            windowSeconds: limits?.windowSeconds ?? prev.windowSeconds,
            cooldownSeconds: limits?.cooldownSeconds ?? prev.cooldownSeconds,
            source: limits?.source ?? prev.source,
            fetched: true,
          }));
        } catch (limitsErr) {
          console.warn(
            '[ApiDashboardView] Could not fetch limits:',
            limitsErr?.message || limitsErr
          );
          // Keep previous values, mark as fetched to prevent re-fetch
          setApiLimits((prev) => ({ ...prev, fetched: true }));
        }
      } catch (err) {
        console.error('Failed to load datasheet:', err);
        setDatasheet(null);
      } finally {
        setLoadingDatasheet(false);
      }
    };

    loadDatasheet();
  }, [template?.id, isDummyTemplate, dummyControl]);

  const capacityCooldownOpts = {
    title: 'Capacidad / Cuota y Cooldown',
    height: 260,
    cursor: {
      drag: {
        x: true,
        y: true,
      },
    },
    scales: {
      x: {
        auto: true,
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
      {
        label: 'Historico acumulado',
        stroke: '#0ea5e9',
        width: 3,
        fill: 'rgba(14,165,233,0.10)',
      },
      {
        label: 'Rate maximo',
        stroke: '#ef4444',
        width: 2,
        dash: [6, 6],
        points: { show: false },
      },
      {
        label: 'Zona cooldown por exceso',
        stroke: '#f43f5e',
        width: 0,
        fill: 'rgba(244,63,94,0.28)',
        points: { show: false },
      },
    ],
  };

  return (
    <>
      {/* Header & Stats */}
      <div className="w-full p-6 container-max-width mx-auto">
        <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-black text-text flex items-center gap-3">
              {template?.name}
            </h2>
            <p className="text-slate-400 mt-1 font-mono text-sm">{template?.apiUri}</p>
          </div>

          <BaseButton
            variant="icon"
            size="icon"
            onClick={showEditModal ? () => setShowEditModal(false) : () => setShowEditModal(true)}
          >
            <Pencil size={16} />
          </BaseButton>
        </div>

        {/* Stats Section */}
        <div className="w-full py-8 container-max-width mx-auto">
          <div className="stats-grid">
            <StatCard
              title="Total Requests"
              value={getCurrentStats().total}
              icon={<Activity size={20} />}
              color="text-text"
            />
            <StatCard
              title="Success"
              value={getCurrentStats().success}
              icon={<CheckCircle size={20} />}
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

        <div className="flex flex-wrap gap-3 items-center mb-4">
          {isDummyTemplate && (
            <span className="badge badge-warning text-xs font-semibold">
              API Dummy — Modo Simulado
            </span>
          )}
          <span className="badge badge-info text-xs">
            Modelo:{' '}
            {apiLimits.windowModel === 'UNLIMITED'
              ? 'Ilimitado'
              : apiLimits.windowModel === 'SLIDING_WINDOW'
                ? 'Ventana Deslizante'
                : apiLimits.windowModel === 'FIXED_WINDOW'
                  ? 'Ventana Fija'
                  : 'No detectado'}
          </span>
          <span className="badge badge-info text-xs">
            Cooldown base: {apiLimits.cooldownSeconds}s
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

        {/* Action header: ActionBar + SafeMode/AutoRefresh in one row */}
        <div className="flex flex-row gap-2 items-center w-full justify-between mb-4 bg-primary p-2 rounded-lg border border-border">
          <SafeModeAutoRefreshCard
            safeModeEnabled={safeModeEnabled}
            onSafeModeChange={setSafeModeEnabled}
            safeRequestCount={safeRequestCount}
            running={running}
            autoRefreshEnabled={autoRefreshEnabled}
            refreshIntervalSeconds={refreshIntervalSeconds}
            onToggleAutoRefresh={handleAutoRefreshToggle}
            onRefreshIntervalChange={handleRefreshIntervalChange}
            loadingDefaultConfig={loadingDefaultConfig}
          />
          <ApiDashboardActionBar
            testMode={testMode}
            running={running}
            inCooldown={isCurrentlyInCooldown}
            loadingDefaultConfig={loadingDefaultConfig}
            loadingDatasheet={loadingDatasheet}
            showDatasheet={showDatasheet}
            onToggleMode={() => {
              if (!isDummyTemplate) {
                setTestMode((prev) => (prev === 'real' ? 'simulated' : 'real'));
              }
            }}
            onEdit={() => setShowEditModal(true)}
            onToggleDatasheet={() => setShowDatasheet(!showDatasheet)}
            onRun={handlePrimaryTestClick}
            onConfigure={() => setShowModal(true)}
            isDummyTemplate={isDummyTemplate}
          />
        </div>

        {isDummyTemplate && (
          <DummyApiControlPanel
            values={dummyControl}
            onChange={handleDummyControlChange}
            disabled={running}
            onApplyPreset={applyDummyPreset}
            onSave={saveDummyControl}
            saving={savingDummyControl}
          />
        )}
      </div>

      {showDatasheet && (
        <div className="modal-overlay z-50" onClick={() => setShowDatasheet(false)}>
          <div className="modal-panel modal-large" onClick={(e) => e.stopPropagation()}>
            <BaseCard>
              <div className="flex-grow-1 card-header overflow-auto border border-border shadow-lg p-2">
                <h3 className="text-lg font-bold text-text flex items-center gap-2">
                  <FileText size={20} />
                  Datasheet
                </h3>
                <BaseButton variant="icon" size="icon" onClick={() => setShowDatasheet(false)}>
                  <X size={16} />
                </BaseButton>
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
        </div>
      )}

      <ApiDashboardTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'charts' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 container-max-width mx-auto my-6">
            <div className="lg:col-span-2">
              <HistoricalInstantChartCard
                trafficChartData={trafficChartData}
                trafficTimeScale={trafficTimeScale}
                onTrafficTimeScaleChange={setTrafficTimeScale}
              />
            </div>

            <CapacityCooldownChartCard
              capacityViewInterval={capacityViewInterval}
              onCapacityViewIntervalChange={setCapacityViewInterval}
              apiLimits={apiLimits}
              capacityResults={capacityResults}
              capacityChartData={capacityChartData}
              capacityCooldownOpts={capacityCooldownOpts}
            />

            <ApiLimitsQuotaCard
              summary={summary}
              liveResults={liveResults}
              apiLimits={apiLimits}
              template={template}
            />
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
        <div className="modal-overlay z-50" onClick={() => setShowModal(false)}>
          <div className="modal-panel modal-large" onClick={(e) => e.stopPropagation()}>
            <BaseCard className="max-h-[86vh] overflow-auto border border-border shadow-lg p-2">
              <TemplateTestView
                template={template}
                OnClose={() => setShowModal(false)}
                initialConfig={defaultTestConfig}
                onConfigChange={handleModalConfigChange}
              />
            </BaseCard>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay z-50">
          <div className="modal-panel max-w-3xl">
            <TemplateForm
              template={template}
              onDone={() => {
                setShowEditModal(false);
                // Reload datasheet and limits after template update
                const loadDatasheet = async () => {
                  try {
                    const latestTemplate = await getTemplateRecord(template.id);
                    setResolvedIsDummy(Boolean(latestTemplate?.isDummy));
                    setResolvedDummyConfig(latestTemplate?.dummyConfig || null);

                    const ds = await getTemplateDatasheet(template.id);
                    const datasheetContent = ds?.datasheet || ds;
                    setDatasheet(datasheetContent);

                    // Fetch updated limits from backend
                    try {
                      const limits = await getApiLimits(template.id);
                      setApiLimits((prev) => ({
                        ...prev,
                        quotaMax: limits?.quotaMax ?? prev.quotaMax,
                        rateMax: limits?.rateMax ?? prev.rateMax,
                        windowModel: limits?.windowModel ?? prev.windowModel,
                        windowSeconds: limits?.windowSeconds ?? prev.windowSeconds,
                        cooldownSeconds: limits?.cooldownSeconds ?? prev.cooldownSeconds,
                        source: limits?.source ?? prev.source,
                        fetched: true,
                      }));
                    } catch (limitsErr) {
                      console.warn('[ApiDashboardView] Could not refresh limits:', limitsErr);
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
