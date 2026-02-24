import React, { useState, useRef, useEffect } from 'react';
import BaseButton from './BaseButton.jsx';
import BaseCard from './BaseCard.jsx';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TestResultModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  if (!result) return null;

  // Extract summary data
  const summary = result.summary || { total: 0, ok: 0, error: 0, rateLimit: 0, avgMs: 0 };
  const results = result.results || [];
  
  // Set first result as selected by default
  useEffect(() => {
    if (results.length > 0 && !selectedResult) {
      setSelectedResult(results[0]);
    }
  }, [results, selectedResult]);

  const currentResult = selectedResult || results[0];

  const handleCopy = () => {
    if (currentResult?.response?.body) {
      navigator.clipboard.writeText(currentResult.response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Prepare Status Distribution Chart
  const statusChartData = {
    labels: [`OK (${summary.ok})`, `Errors (${summary.error})`, `Rate Limited (${summary.rateLimit})`],
    datasets: [
      {
        data: [summary.ok, summary.error, summary.rateLimit],
        backgroundColor: ['#22863a', '#cb2431', '#ffa31a'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            return `${ctx.label}: ${ctx.parsed}`;
          },
        },
      },
    },
  };

  // Extract rate limit headers from first result if available
  let rateLimitRemaining = null;
  let rateLimitTotal = null;

  if (currentResult?.response?.headers) {
    const headers = currentResult.response.headers;
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'] || headers['ratelimit-remaining'];
    const limit = headers['x-ratelimit-limit'] || headers['x-rate-limit-limit'] || headers['ratelimit-limit'];
    if (remaining && limit) {
      rateLimitRemaining = parseInt(remaining);
      rateLimitTotal = parseInt(limit);
    }
  }

  // Prepare Quota Usage Chart
  const quotaChartData = rateLimitTotal
    ? {
        labels: [`Used (${rateLimitTotal - rateLimitRemaining})`, `Remaining (${rateLimitRemaining})`],
        datasets: [
          {
            data: [rateLimitTotal - rateLimitRemaining, rateLimitRemaining],
            backgroundColor: ['#3b82f6', '#d1d5db'],
            borderColor: ['#fff', '#fff'],
            borderWidth: 2,
          },
        ],
      }
    : null;

  return (
    <div className="modal-overlay">
      <BaseCard>
        <div className="modal-panel flex flex-col" style={{ maxWidth: '1400px', maxHeight: '90vh' }}>
          {/* Header */}
          <div className="section-card-header flex justify-between items-start mb-0 border-b p-6 bg-blue-50">
            <div>
              <h2 className="text-xl font-bold text-blue-700">Test Results</h2>
              <p className="text-sm text-gray-600">Job ID: {result.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl font-normal cursor-pointer bg-none border-0 p-0 text-text"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-auto flex-1 flex flex-col">
            {/* Summary Statistics */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 text-text">Summary</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-white">
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-3xl font-bold text-text">{summary.total}</p>
                </div>
                <div className="flex-1 border border-green-200 rounded-lg p-4 bg-green-50">
                  <p className="text-sm text-green-600">Success</p>
                  <p className="text-3xl font-bold text-green-700">{summary.ok}</p>
                </div>
                <div className="flex-1 border border-red-200 rounded-lg p-4 bg-red-50">
                  <p className="text-sm text-red-600">Errors</p>
                  <p className="text-3xl font-bold text-red-700">{summary.error}</p>
                </div>
                <div className="flex-1 border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <p className="text-sm text-yellow-600">Rate Limited</p>
                  <p className="text-3xl font-bold text-yellow-700">{summary.rateLimit}</p>
                </div>
                <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-white">
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-3xl font-bold text-text">{summary.avgMs}ms</p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-lg mb-4 text-text">Status Distribution</h3>
                <div className="relative h-64 flex justify-center">
                  <Pie data={statusChartData} options={chartOptions} />
                </div>
              </div>

              {/* Quota Usage */}
              {quotaChartData && (
                <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
                  <h3 className="font-bold text-lg mb-4 text-text">Quota Usage</h3>
                  <div className="relative h-64 flex justify-center">
                    <Pie data={quotaChartData} options={chartOptions} />
                  </div>
                </div>
              )}
            </div>

            {/* Results List */}
            {results.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 text-text">Test Requests</h3>
                <div className="list-container max-h-64 border border-gray-200 rounded">
                  {results.map((r, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedResult(r)}
                      className={`list-item cursor-pointer border-b last:border-b-0 ${
                        selectedResult?.seq === r.seq ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600 min-w-8">#{r.seq}</span>
                        <span
                          className={`font-bold px-2 py-1 rounded text-sm ${
                            r.statusCode >= 200 && r.statusCode < 300
                              ? 'bg-green-100 text-green-700'
                              : r.statusCode === 429
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {r.statusCode}
                        </span>
                        <span className="text-gray-600">{r.durationMs}ms</span>
                        <span className="text-xs text-gray-500">{new Date(r.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Result Details */}
            {currentResult && (
              <div className="space-y-6">
                {/* Response Headers */}
                {currentResult.response?.headers && Object.keys(currentResult.response.headers).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-text">Response Headers</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-auto">
                      {Object.entries(currentResult.response.headers).map(([key, value]) => (
                        <div key={key} className="text-sm mb-2 last:mb-0">
                          <span className="font-bold text-blue-600">{key}:</span>
                          <span className="ml-2 text-gray-700 break-words">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Body */}
                <div>
                  <h3 className="text-lg font-bold mb-3 text-text">Response Body</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-auto font-mono text-sm">
                    {currentResult.response?.body || 'No response body'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-bg flex-shrink-0">
            <BaseButton variant="secondary" onClick={onClose}>
              Close
            </BaseButton>
            {currentResult?.response?.body && (
              <BaseButton variant="primary" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Response'}
              </BaseButton>
            )}
          </div>
        </div>
      </BaseCard>
    </div>
  );
}
