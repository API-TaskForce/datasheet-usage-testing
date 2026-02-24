import React, { useEffect, useState } from 'react';
import { getTestLogs } from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';
import BaseButton from '../components/BaseButton.jsx';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function TestLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTestLogs();
      // Sort by createdAt descending (newest first)
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setLogs(sorted);
      if (sorted.length === 0) {
        toast.info('No test logs found');
      } else {
        toast.success(`Loaded ${sorted.length} test logs`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load test logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'failed':
        return 'badge-danger';
      case 'queued':
        return 'badge-warning';
      case 'running':
        return 'badge-info';
      case 'rate_limited':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const getResultStats = (results) => {
    if (!results || results.length === 0) return null;
    
    const stats = {
      total: results.length,
      success: 0,
      rateLimited: 0,
      error: 0,
    };

    results.forEach(r => {
      if (r.statusCode >= 200 && r.statusCode < 300) stats.success++;
      else if (r.statusCode === 429) stats.rateLimited++;
      else stats.error++;
    });

    return stats;
  };

  return (
    <div className="w-full p-6 container-max-width">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Test Logs</h1>
        <BaseButton
          variant="primary"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </BaseButton>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-medium text-gray-700">Filter by status:</span>
        {['all', 'completed', 'running', 'queued', 'failed'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          Error: {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-gray-500 py-8">Loading test logs...</p>
      )}

      {!loading && filteredLogs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No test logs found</p>
        </div>
      )}

      {!loading && filteredLogs.length > 0 && (
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const isExpanded = expandedLogId === log.id;
            const stats = getResultStats(log.results);
            const duration = log.finishedAt && log.startedAt
              ? `${new Date(log.finishedAt) - new Date(log.startedAt)}ms`
              : 'N/A';

            return (
              <div
                key={log.id}
                className="section-card cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Log header (always visible) */}
                <button
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="w-full text-left flex items-center justify-between gap-4 p-4 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`badge ${getStatusBadgeClass(log.status)}`}>
                        {log.status.toUpperCase()}
                      </span>
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-700 truncate">
                        {log.id}
                      </code>
                    </div>
                    <p className="text-sm text-gray-600">
                      {log.config?.endpoint && (
                        <>
                          <span className="font-medium">{log.config.endpoint.split('/').slice(2).join('/')}</span>
                          {' '} {log.config.request?.method || 'GET'}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(log.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {stats && (
                      <div className="text-right text-sm">
                        <p className="text-gray-700">
                          <span className="font-bold">{stats.total}</span> requests
                        </p>
                        <p className="text-xs text-gray-500">
                          {stats.success} OK • {stats.error} Errors • {stats.rateLimited} Limited
                        </p>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Log details (expanded) */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    {/* Config */}
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 mb-2">Configuration</h3>
                      <div className="bg-gray-50 p-3 rounded text-xs text-gray-700 space-y-1 overflow-auto max-h-32">
                        <p><span className="font-medium">Endpoint:</span> {log.config?.endpoint}</p>
                        <p><span className="font-medium">Method:</span> {log.config?.request?.method}</p>
                        <p><span className="font-medium">Clients:</span> {log.config?.clients}</p>
                        <p><span className="font-medium">Total Requests:</span> {log.config?.totalRequests}</p>
                      </div>
                    </div>

                    {/* Summary */}
                    {log.summary && (
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 mb-2">Summary</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 bg-green-50 p-3 rounded">
                            <p className="text-xs text-gray-600">OK</p>
                            <p className="font-bold text-lg text-green-700">{log.summary.ok || 0}</p>
                          </div>
                          <div className="flex-1 bg-red-50 p-3 rounded">
                            <p className="text-xs text-gray-600">Errors</p>
                            <p className="font-bold text-lg text-red-700">{log.summary.error || 0}</p>
                          </div>
                          <div className="flex-1 bg-yellow-50 p-3 rounded">
                            <p className="text-xs text-gray-600">Rate Limited</p>
                            <p className="font-bold text-lg text-yellow-700">{log.summary.rateLimit || 0}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-xs text-gray-600">Avg Time</p>
                            <p className="font-bold text-lg text-blue-700">{log.summary.avgMs || 0}ms</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {log.results && log.results.length > 0 && (
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 mb-2">Results ({log.results.length})</h3>
                        <div className="space-y-2 max-h-40 overflow-auto">
                          {log.results.slice(0, 10).map((result, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-2 rounded ${
                                result.statusCode >= 200 && result.statusCode < 300
                                  ? 'bg-green-50 text-green-900'
                                  : result.statusCode === 429
                                  ? 'bg-yellow-50 text-yellow-900'
                                  : 'bg-red-50 text-red-900'
                              }`}
                            >
                              <span className="font-bold">#{result.seq}</span> -{' '}
                              <span className="font-bold">{result.statusCode}</span> -{' '}
                              {result.status} - {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                          ))}
                          {log.results.length > 10 && (
                            <p className="text-xs text-gray-500 text-center py-2">
                              +{log.results.length - 10} more results
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timing */}
                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded space-y-1">
                      <p><span className="font-medium">Created:</span> {formatDate(log.createdAt)}</p>
                      {log.startedAt && <p><span className="font-medium">Started:</span> {formatDate(log.startedAt)}</p>}
                      {log.finishedAt && <p><span className="font-medium">Finished:</span> {formatDate(log.finishedAt)}</p>}
                      {log.startedAt && log.finishedAt && (
                        <p><span className="font-medium">Duration:</span> {duration}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
