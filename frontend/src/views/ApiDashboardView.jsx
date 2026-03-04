import React, { useEffect, useState, useMemo, useRef } from 'react';
import UPlotChart from '../components/UPlotChart.jsx';
import TemplateTestView from '../components/TemplateTestView.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import GranularitySelector from '../components/GranularitySelector.jsx';
import DatasheetViewer from '../components/DatasheetViewer.jsx';
import StorageInfoPanel from '../components/StorageInfoPanel.jsx';
import { getActiveJobResults, testApi, getTestResults, getApiLimits, getTestLogs, getTemplateDatasheet } from '../services/apiTemplateService.js';
import { useTestHistory, formatTimeByGranularity } from '../hooks/useTestHistory.js';
import { Play, Activity, BarChart3, Clock, AlertCircle, LayoutDashboard, Trash2, BookOpen, PlayCircle, Pencil } from 'lucide-react';
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

export default function ApiDashboardView({ template }) {
  const [running, setRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [granularity, setGranularity] = useState('1m');
  const [datasheet, setDatasheet] = useState(null);
  const [loadingDatasheet, setLoadingDatasheet] = useState(true);
  const [showDatasheet, setShowDatasheet] = useState(false);

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

  // Triggered when the user hits "Run" inside the Modal
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

    // Group results by second
    // Only count requests with 2xx or 3xx status codes
    // Ignore 4xx errors (e.g., 429 rate limit) - these don't count as requests
    const secondsMap = {};
    results.forEach((r) => {
      const statusCode = r.statusCode || 0;
      
      // Only process successful responses (2xx, 3xx)
      // Ignore 4xx and 5xx errors
      if (statusCode >= 200 && statusCode < 400) {
        const ts = Math.floor(new Date(r.timestamp).getTime() / 1000);
        if (!secondsMap[ts]) {
          secondsMap[ts] = { count: 0 };
        }
        secondsMap[ts].count++;
      }
    });

    // Extract and sort timestamps
    const timestamps = Object.keys(secondsMap)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(-60); // Keep last 60 seconds

    if (timestamps.length === 0) return;

    // Build series data for each timestamp
    const successSeries = timestamps.map((ts) => secondsMap[ts]?.count || 0);

    setTimeline(timestamps);
    setSeriesData({
      success: successSeries,
      rateLimit: [],
      error: [],
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

  /**
   * Get aggregated data for historical charts
   */
  const getAggregatedChartData = useMemo(() => {
    const aggregated = aggregateByGranularity(granularity);
    return {
      timestamps: aggregated.timestamps || [],
      success: aggregated.successCounts || [],
      errors: aggregated.errorCounts || [],
      rateLimited: aggregated.rateLimitCounts || [],
      total: aggregated.totalCounts || [],
    };
  }, [granularity, aggregateByGranularity, history]);

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
      } finally {
        setLoadingDatasheet(false);
      }
    };

    loadDatasheet();
  }, [template?.id]);

  const chartData = useMemo(
    () => {
      // Ensure timeline has at least one point and all series have the same length
      if (!timeline || timeline.length === 0) {
        return [[Math.floor(Date.now() / 1000)], [0], [0], [0]];
      }
      return [timeline, seriesData.success, seriesData.rateLimit, seriesData.error];
    },
    [timeline, seriesData]
  );

  const mainChartOpts = {
    title: 'Requests per Second',
    width: 800,
    height: 300,
    scales: {
      x: { auto: false, range: [Math.min(...(chartData[0] || [0])), Math.max(...(chartData[0] || [0]))] },
      y: { auto: true, range: [0, null]
      }
    },
    axes: [
      { label: 'Time' },
      { label: 'Requests', side: 1 }
    ],
    series: [
      { label: 'Time' },
      { label: 'Success', stroke: '#10b981', width: 2, fill: 'rgba(16, 185, 129, 0.1)' },
      { label: 'Rate Limited', stroke: '#f59e0b', width: 2, fill: 'rgba(245, 158, 11, 0.1)' },
      { label: 'Error', stroke: '#ef4444', width: 2, fill: 'rgba(239, 68, 68, 0.1)' },
    ],
  };

  // Historical series (day/month)
  const dayChartOpts = {
    title: 'Peticiones por Día',
    width: 420,
    height: 160,
    scales: {
      x: { auto: true },
      y: { auto: true, range: [0, null] }
    },
    axes: [
      { label: 'Fecha' },
      { label: 'Peticiones', side: 1 }
    ],
    series: [
      { label: 'Fecha' },
      { label: 'Peticiones', stroke: '#06b6d4', width: 2, fill: 'rgba(6,179,212,0.08)' }
    ],
  };

  const monthChartOpts = {
    title: 'Peticiones por Mes',
    width: 420,
    height: 160,
    scales: {
      x: { auto: true },
      y: { auto: true, range: [0, null] }
    },
    axes: [
      { label: 'Mes' },
      { label: 'Peticiones', side: 1 }
    ],
    series: [
      { label: 'Mes' },
      { label: 'Peticiones', stroke: '#7c3aed', width: 2, fill: 'rgba(124,58,237,0.08)' }
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-text flex items-center gap-3">
              {template?.name}
            </h2>
            <p className="text-slate-400 mt-1 font-mono text-sm">{template?.apiUri}</p>
          </div>

          <div className="flex gap-2">
            <BaseButton variant='secondary' size='md' onClick={() => setShowEditModal(true)}>
              <Pencil size={18} />
              Edit
            </BaseButton>
            <BaseButton variant='secondary' size='md' onClick={() => setShowDatasheet(!showDatasheet)} disabled={loadingDatasheet}>
              <BookOpen size={18} />
              {showDatasheet ? 'Hide' : 'Datasheet'}
            </BaseButton>
            <BaseButton variant='primary' size='md' onClick={() => setShowModal(true)} disabled={running}>
              <Play size={18} />
              {running ? 'Running...' : 'Test'}
            </BaseButton>
          </div>
        </div>        
      </div>

      {/* Datasheet Section */}
      {showDatasheet && (
        <div className="w-full p-6 container-max-width mx-auto">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-text mb-4 flex items-center gap-2">
              <BookOpen size={24} />
              API Datasheet Documentation
            </h3>
            {loadingDatasheet ? (
              <BaseCard className="p-6">
                <p className="text-slate-400 text-center">Cargando datasheet...</p>
              </BaseCard>
            ) : !datasheet ? (
              <BaseCard className="p-6 border border-yellow-500/20 bg-yellow-500/5">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-2">No se encontró información de datasheet</h4>
                    <p className="text-sm text-yellow-600/80">
                      Esta API no tiene un datasheet YAML configurado. Los datasheets contienen información importante como autenticación, rate limiting, parámetros y endpoints disponibles.
                    </p>
                    <p className="text-xs text-yellow-600/60 mt-3">
                      Verifica que el template tenga un datasheet YAML válido en su configuración.
                    </p>
                  </div>
                </div>
              </BaseCard>
            ) : (
              <DatasheetViewer datasheet={datasheet} templateName={template?.name} templateUri={template?.apiUri} />
            )}
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="w-full p-6 container-max-width mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

      <div className="container-max-width mx-auto my-6">
        <BaseCard className="w-full p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Ventana de oportunidad - Evolución de Peticiones</h3>
            <GranularitySelector value={granularity} onChange={setGranularity} />
          </div>
          <div className="flex justify-center w-full overflow-x-auto">
            <OpportunityPanelHistorical
              opportunityData={getOpportunityData}
              apiLimits={apiLimits}
              granularity={granularity}
            />
          </div>
        </BaseCard>
      </div>

      <div className="flex container-max-width mx-auto gap-6 my-6">
        <BaseCard className="w-full p-4">
          <h3 className="text-lg font-bold mb-2">Peticiones y respuestas (tiempo real)</h3>
          <RealTimePanel liveResults={liveResults} />
        </BaseCard>
      </div>

      <div className="flex flex-row w-full container-max-width mx-auto gap-6">
        {/* Main Traffic Chart */}
        <BaseCard>
          <div className="flex justify-between items-center">
            {running && (
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 animate-pulse">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" /> LIVE POLLING
              </div>
            )}
          </div>
          <div className="flex justify-center overflow-hidden rounded-xl p-4">
            {chartData?.[0]?.length > 0 ? (
              <UPlotChart options={mainChartOpts} data={chartData} />
            ) : (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm">Ejecuta una prueba para ver los datos en tiempo real</p>
              </div>
            )}
          </div>
        </BaseCard>

        {/* Quota & Limits Bar Charts */}
        <BaseCard className="p-8 gap-4">
          <h3 className="text-lg font-bold text-text text-center">API Limits & Quota</h3>
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
            <h4 className="text-lg font-bold text-text">Endpoint Details</h4>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 badge badge-info">
                <p className="text-slate-500">Method</p>
                <p className="text-text">{template?.requestMethod || 'GET'}</p>
              </div>
              <div className="flex flex-row gap-2 badge badge-info">
                <p className="text-slate-500">Auth</p>
                <p className="text-text">{template?.authMethod || 'None'}</p>
              </div>
            </div>

            <div className="w-full bg-primary border border-accent rounded-xl p-3">
              <h5 className="text-sm font-bold text-text mb-2">Applied Limits</h5>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Quota Max</span>
                  <span className="text-text font-semibold">
                    {apiLimits?.quotaDaily ? `${apiLimits.quotaDaily.toLocaleString()} req/day` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Rate Max</span>
                  <span className="text-text font-semibold">
                    {apiLimits?.rateDaily ? `${apiLimits.rateDaily.toLocaleString()} req/min` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Quota Source</span>
                  <span className="badge badge-info text-xs">
                    {sourceLabel[apiLimits?.quotaSource] || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Rate Source</span>
                  <span className="badge badge-info text-xs">
                    {sourceLabel[apiLimits?.rateSource] || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <div className="container-max-width mx-auto my-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <BaseCard>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold mb-0">Histórico de Peticiones</h3>
            <GranularitySelector value={granularity} onChange={setGranularity} />
          </div>
          <div className="p-2">
            {getAggregatedChartData.timestamps?.length > 0 ? (
              <UPlotChart
                options={{
                  title: 'Series Temporales',
                  width: 420,
                  height: 200,
                  scales: { 
                    x: { 
                      auto: false,
                      range: [
                        Math.min(...getAggregatedChartData.timestamps.map(ts => ts > 10000000000 ? ts / 1000 : ts)),
                        Math.max(...getAggregatedChartData.timestamps.map(ts => ts > 10000000000 ? ts / 1000 : ts)),
                      ]
                    }, 
                    y: { auto: true, range: [0, null] } 
                  },
                  axes: [
                    { 
                      label: 'Tiempo',
                      values: (u, vals) => vals.map(v => {
                        const date = new Date(v * 1000);
                        if (granularity === '1d') {
                          return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                        } else if (granularity === '1h' || granularity === '6h') {
                          return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        } else {
                          return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        }
                      }),
                    },
                    { label: 'Peticiones', side: 1 },
                  ],
                  series: [
                    { label: 'Tiempo' },
                    { 
                      label: 'Error', 
                      stroke: '#ef4444', 
                      width: 2, 
                      fill: 'rgba(239, 68, 68, 0.08)',
                      points: { show: true, size: 4 },
                    },
                    { 
                      label: 'Rate Limited', 
                      stroke: '#f59e0b', 
                      width: 2, 
                      fill: 'rgba(245, 158, 11, 0.08)',
                      points: { show: true, size: 4 },
                    },
                    { 
                      label: 'Éxito', 
                      stroke: '#10b981', 
                      width: 2, 
                      fill: 'rgba(16, 185, 129, 0.08)',
                      points: { show: true, size: 4 },
                    },
                  ],
                }}
                data={[
                  getAggregatedChartData.timestamps.map(ts => ts > 10000000000 ? Math.floor(ts / 1000) : ts),
                  getAggregatedChartData.errors,
                  getAggregatedChartData.rateLimited,
                  getAggregatedChartData.success,
                ]}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">Sin datos históricos disponibles</p>
            )}
          </div>
        </BaseCard>
        <BaseCard>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold mb-0">Total de Peticiones</h3>
            <BaseButton
              onClick={() => clearHistory()}
              className="!p-2 !text-xs"
              disabled={history.length === 0}
            >
              <Trash2 size={14} />
            </BaseButton>
          </div>
          <div className="p-2">
            {getAggregatedChartData.timestamps?.length > 0 ? (
              <UPlotChart
                options={{
                  title: 'Total Acumulado',
                  width: 420,
                  height: 200,
                  scales: { 
                    x: { 
                      auto: false,
                      range: [
                        Math.min(...getAggregatedChartData.timestamps.map(ts => ts > 10000000000 ? ts / 1000 : ts)),
                        Math.max(...getAggregatedChartData.timestamps.map(ts => ts > 10000000000 ? ts / 1000 : ts)),
                      ]
                    },
                    y: { auto: true, range: [0, null] } 
                  },
                  axes: [
                    { 
                      label: 'Tiempo',
                      values: (u, vals) => vals.map(v => {
                        const date = new Date(v * 1000);
                        if (granularity === '1d') {
                          return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                        } else if (granularity === '1h' || granularity === '6h') {
                          return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        } else {
                          return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        }
                      }),
                    },
                    { label: 'Total', side: 1 },
                  ],
                  series: [
                    { label: 'Tiempo' },
                    { 
                      label: 'Total', 
                      stroke: '#7c3aed', 
                      width: 2, 
                      fill: 'rgba(124, 58, 237, 0.08)',
                      points: { show: true, size: 5, stroke: '#7c3aed', fill: '#ffffff', width: 2 },
                    },
                  ],
                }}
                data={[
                  getAggregatedChartData.timestamps.map(ts => ts > 10000000000 ? Math.floor(ts / 1000) : ts),
                  getAggregatedChartData.total
                ]}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">Sin datos históricos disponibles</p>
            )}
          </div>
        </BaseCard>
      </div>

      {/* Storage Info Panel */}
      <div className="container-max-width mx-auto my-6">
        <StorageInfoPanel />
      </div>

      {showModal && (
        <div className="modal-overlay z-50">
          <div className="modal-panel max-w-6xl">
            <TemplateTestView
              template={template}
              OnClose={() => setShowModal(false)}
              onTestStarted={handleTestStarted}
            />
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

function StatCard({ title, value, icon, color }) {
  return (
    <div className="p-4 bg-primary rounded-xl border border-accent flex items-center gap-4">
      <div className={'badge badge-accent'}>{icon}</div>
      <div>
        <p className="text-secondary">{title}</p>
        <p className={`font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ label, current, max, unit, color }) {
  const percentage = Math.min((current / max) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex flex-row align-center justify-between items-center text-sm gap-4">
        <span className="text-xs">{label}</span>
        <span className="text-xs text-text-muted">
          {current} / {max} {unit}
        </span>
      </div>
      <div className="h-4 bg-primary rounded-full overflow-hidden border border-secondary-lighter">
        <div
          className={`h-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DonutChart({ label, value, max }) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);
  const radius = 48;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg height={radius * 2} width={radius * 2} className="rounded-full bg-transparent">
        <circle stroke="#e6eef6" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="#06b6d4" fill="transparent" strokeWidth={stroke} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius}
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={strokeDashoffset} transform={`rotate(-90 ${radius} ${radius})`} />
      </svg>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-black text-text">{value} / {max}</p>
      </div>
    </div>
  );
}

function OpportunityPanelHistorical({ opportunityData, apiLimits, granularity }) {
  if (!opportunityData.timestamps || opportunityData.timestamps.length === 0) {
    return <p className="text-sm text-slate-400">No hay datos para mostrar. Ejecuta un test para comenzar.</p>;
  }

  const limitLine = apiLimits.quotaDaily || null;
  const maxCumulative = Math.max(...opportunityData.cumulativeCounts, 0);

  // Convert timestamps to Unix seconds for uPlot
  const timestampsInSeconds = opportunityData.timestamps.map((ts) => {
    // Check if timestamp is in milliseconds or seconds
    return ts > 10000000000 ? Math.floor(ts / 1000) : ts;
  });

  console.log('[OpportunityPanelHistorical] Data:', {
    dataPoints: timestampsInSeconds.length,
    firstTimestamp: new Date(timestampsInSeconds[0] * 1000).toISOString(),
    lastTimestamp: new Date(timestampsInSeconds[timestampsInSeconds.length - 1] * 1000).toISOString(),
    maxCumulative,
    limitLine,
  });

  const opportunityChartOpts = {
    title: 'Peticiones Acumuladas Over Time',
    width: 850,
    height: 300,
    scales: {
      x: { 
        auto: false,
        range: [
          Math.min(...timestampsInSeconds),
          Math.max(...timestampsInSeconds),
        ]
      },
      y: {
        auto: false,
        range: [0, limitLine ? Math.max(limitLine * 1.2, maxCumulative * 1.1) : maxCumulative * 1.2],
      },
    },
    axes: [
      { 
        label: 'Tiempo',
        values: (u, vals) => vals.map(v => {
          const date = new Date(v * 1000);
          if (granularity === '1d') {
            return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          } else if (granularity === '1h' || granularity === '6h') {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          } else {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          }
        }),
      },
      { 
        label: 'Peticiones Acumuladas', 
        side: 1,
        values: (u, vals) => vals.map(v => Math.round(v).toLocaleString()),
      },
    ],
    series: [
      { label: 'Tiempo' },
      {
        label: 'Peticiones',
        stroke: '#06b6d4',
        fill: 'rgba(6,179,212,0.15)',
        width: 3,
        points: {
          show: true,
          size: 6,
          width: 2,
          stroke: '#06b6d4',
          fill: '#ffffff',
        },
      },
      ...(limitLine
        ? [
            {
              label: `Límite (${limitLine})`,
              stroke: '#ef4444',
              width: 2,
              dash: [10, 5],
              points: { show: false },
            },
          ]
        : []),
    ],
  };

  // Build data array with converted timestamps
  const data = [timestampsInSeconds, opportunityData.cumulativeCounts];
  if (limitLine) {
    const limitPoints = timestampsInSeconds.map(() => limitLine);
    data.push(limitPoints);
  }

  return (
    <div className="w-full">
      <UPlotChart options={opportunityChartOpts} data={data} />
      {limitLine && (
        <div className="mt-4 text-xs text-slate-400">
          <p>
            Límite identificado: <span className="font-bold text-text">{limitLine.toLocaleString()} peticiones</span>
          </p>
          <p>
            Granularidad: <span className="font-mono">{granularity}</span> | Total acumulado: <span className="font-bold text-cyan-400">{maxCumulative.toLocaleString()}</span>
          </p>
        </div>
      )}
      {!limitLine && (
        <div className="mt-4 text-xs text-slate-400">
          <p>
            Granularidad: <span className="font-mono">{granularity}</span> | Total acumulado: <span className="font-bold text-cyan-400">{maxCumulative.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function OpportunityPanel({ liveResults, apiLimits, running }) {
  if (!liveResults || liveResults.length === 0) {
    return <p className="text-sm text-slate-400">No hay datos para mostrar.</p>;
  }

  // Extract timestamps and build cumulative requests over time
  const startTime = new Date(liveResults[0].timestamp).getTime();
  let cumulativeCount = 0;
  const timePoints = [];
  const requestPoints = [];

  liveResults.forEach((r) => {
    const resultTime = new Date(r.timestamp).getTime();
    const secondsElapsed = Math.floor((resultTime - startTime) / 1000);
    cumulativeCount++;
    timePoints.push(secondsElapsed);
    requestPoints.push(cumulativeCount);
  });

  // Add limit line if available
  const limitLine = apiLimits.quotaDaily || null;

  const opportunityChartOpts = {
    title: 'Cumulative Requests Over Time',
    width: '100%',
    height: 300,
    scales: {
      x: { auto: true },
      y: { auto: false, range: [0, limitLine ? Math.max(limitLine * 1.2, Math.max(...requestPoints)) : Math.max(...requestPoints)] }
    },
    axes: [
      { label: 'Time (seconds)' },
      { label: 'Cumulative Requests', side: 1 }
    ],
    series: [
      { label: 'Time (s)' },
      {
        label: 'Requests',
        stroke: '#06b6d4',
        fill: 'rgba(6,179,212,0.1)',
        width: 2,
      },
      ...(limitLine
        ? [
            {
              label: `Daily Limit (${limitLine})`,
              stroke: '#ef4444',
              width: 2,
              dash: [5, 5],
            },
          ]
        : []),
    ],
  };

  // Build data array: [times, requests, limitLine if exists]
  const data = [timePoints, requestPoints];
  if (limitLine) {
    // Add a plateau line at the limit
    const limitPoints = timePoints.map(() => limitLine);
    data.push(limitPoints);
  }

  return (
    <div className="w-full">
      <UPlotChart options={opportunityChartOpts} data={data} />
      {limitLine && (
        <div className="mt-4 text-xs text-slate-400">
          <p>Límite diario identificado: <span className="font-bold text-text">{limitLine} peticiones</span></p>
        </div>
      )}
    </div>
  );
}

function RealTimePanel({ liveResults }) {
  return (
    <div className="space-y-2 max-h-96 overflow-auto">
      {liveResults.length === 0 && <p className="text-sm text-slate-400">No hay datos en tiempo real.</p>}
      {liveResults.slice().reverse().map((r, idx) => (
        <div key={`${r.timestamp}-${idx}`} className="p-2 border-b border-secondary-lighter flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</p>
              <p className={`font-black ${r.status === 'ok' ? 'text-emerald-500' : r.status === 'rate_limited' ? 'text-amber-500' : 'text-rose-500'}`}>{r.status}</p>
              <p className="text-xs text-slate-400">{r.durationMs}ms</p>
            </div>
            <div className="text-xs text-text mt-1">
              <div>{r.request?.method || r.method || 'GET'} {r.request?.url || r.url || ''}</div>
              <div className="text-slate-400 mt-1">{(r.response && r.response.body) ? (typeof r.response.body === 'string' ? r.response.body.slice(0, 200) : JSON.stringify(r.response.body).slice(0, 200)) : ''}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
