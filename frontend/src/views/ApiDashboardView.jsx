import React, { useEffect, useState, useMemo, useRef } from 'react';
import UPlotChart from '../components/UPlotChart.jsx';
import TemplateTestView from '../components/TemplateTestView.jsx';
import { getActiveJobResults, testApi, getTestResults } from '../services/apiTemplateService.js';
import { Play, Activity, BarChart3, Clock, AlertCircle, LayoutDashboard } from 'lucide-react';
import BaseButton from '../components/BaseButton.jsx';
import BaseCard from '../components/BaseCard.jsx';

export default function ApiDashboardView({ template }) {
  const [running, setRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Real-time metrics from current test
  const [liveResults, setLiveResults] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);

  // Final summary from completed test
  const [summary, setSummary] = useState(null);

  // Chart states
  const [timeline, setTimeline] = useState([Date.now() / 1000]);
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
    setTimeline([Date.now() / 1000]);
    setSeriesData({ success: [0], rateLimit: [0], error: [0] });
    setSummary(null);

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
      setSummary(finalJob.summary);
      setLiveResults(finalJob.results || []);
      setRunning(false);
    } catch (err) {
      console.error('Failed to fetch final results:', err);
      setRunning(false);
    }
  };

  const processResults = (results) => {
    if (!results || results.length === 0) return;

    // Group by second for the chart
    const lastResult = results[results.length - 1];
    const lastTs = Math.floor(new Date(lastResult.timestamp).getTime() / 1000);

    setTimeline((prev) => {
      if (prev.includes(lastTs)) return prev;
      return [...prev, lastTs].slice(-60); // Keep last 60 seconds
    });

    // Calculate status counts
    const successCount = results.filter((r) => r.status === 'ok').length;
    const rlCount = results.filter((r) => r.status === 'rate_limited').length;
    const errCount = results.filter((r) => r.status === 'error').length;

    setSeriesData((prev) => ({
      success: [...prev.success, successCount].slice(-60),
      rateLimit: [...prev.rateLimit, rlCount].slice(-60),
      error: [...prev.error, errCount].slice(-60),
    }));

    setLiveResults(results);
  };

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const chartData = useMemo(
    () => [timeline, seriesData.success, seriesData.rateLimit, seriesData.error],
    [timeline, seriesData]
  );

  const mainChartOpts = {
    title: 'Request vs Response Traffic',
    width: 800,
    height: 300,
    scales: { x: { time: true }, y: { range: [0, null] } },
    series: [
      {},
      { label: 'Success', stroke: '#10b981', width: 2, fill: 'rgba(16, 185, 129, 0.1)' },
      { label: 'Rate Limited', stroke: '#f59e0b', width: 2, fill: 'rgba(245, 158, 11, 0.1)' },
      { label: 'Error', stroke: '#ef4444', width: 2, fill: 'rgba(239, 68, 68, 0.1)' },
    ],
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

          <BaseButton onClick={() => setShowModal(true)} disabled={running}>
            <Play size={18} fill="currentColor" />
            {running ? 'Running...' : 'Test'}
          </BaseButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Requests"
            value={summary?.total || liveResults.length}
            icon={<Activity size={20} />}
            color="text-text"
          />
          <StatCard
            title="Success"
            value={summary?.ok || liveResults.filter((r) => r.status === 'ok').length}
            icon={<Activity size={20} />}
            color="text-text"
          />
          <StatCard
            title="Rate Limited"
            value={
              summary?.rateLimit || liveResults.filter((r) => r.status === 'rate_limited').length
            }
            icon={<AlertCircle size={20} />}
            color="text-text"
          />
          <StatCard
            title="Avg Latency"
            value={`${(summary?.avgMs || liveResults.reduce((acc, r) => acc + r.durationMs, 0) / (liveResults.length || 1)).toFixed(1)}ms`}
            icon={<Clock size={20} />}
            color="text-text"
          />
        </div>
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
            <UPlotChart options={mainChartOpts} data={chartData} />
          </div>
        </BaseCard>

        {/* Quota & Limits Bar Charts */}
        <BaseCard className="p-8 gap-4">
          <h3 className="text-lg font-bold text-text text-center">API Limits & Quota</h3>
          <ProgressBar
            label="Request Quota Usage"
            current={summary?.total || liveResults.length}
            max={template?.quotaLimit || 1000}
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
          </div>
        </BaseCard>
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
