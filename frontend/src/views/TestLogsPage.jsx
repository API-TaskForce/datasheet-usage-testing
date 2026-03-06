import React, { useEffect, useState } from 'react';
import { getTestLogs, deleteTestLog, deleteAllTestLogs } from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';
import BaseButton from '../components/BaseButton.jsx';
import BaseCard from '../components/BaseCard.jsx';
import TestLogDetailModal from '../components/TestLogDetailModal.jsx';
import { RefreshCw, Trash2, Filter, X, CheckSquare, Square } from 'lucide-react';

export default function TestLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const toast = useToast();

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    setSelectedLogIds([]);
    try {
      const data = await getTestLogs();
      // Sort by createdAt descending (newest first)
      const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  const handleDeleteLog = async (logId) => {
    try {
      await deleteTestLog(logId);
      toast.success('Test log deleted successfully');
      loadLogs();
    } catch (err) {
      toast.error(`Failed to delete test log: ${err.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogIds.length === 0) return;

    try {
      await Promise.all(selectedLogIds.map((id) => deleteTestLog(id)));
      toast.success(`${selectedLogIds.length} test logs deleted successfully`);
      setBulkMode(false);
      loadLogs();
    } catch (err) {
      toast.error(`Failed to delete test logs: ${err.message}`);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllTestLogs();
      toast.success(`${result.count} test logs deleted successfully`);
      setShowDeleteConfirm(false);
      loadLogs();
    } catch (err) {
      toast.error(`Failed to delete all test logs: ${err.message}`);
    }
  };

  const toggleLogSelection = (logId) => {
    setSelectedLogIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map((log) => log.id));
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'badge badge-success';
      case 'failed':
        return 'badge badge-error';
      case 'queued':
        return 'badge badge-warning';
      case 'running':
        return 'badge badge-info';
      case 'rate_limited':
        return 'badge badge-warning';
      default:
        return 'badge badge-secondary';
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

    results.forEach((r) => {
      if (r.statusCode >= 200 && r.statusCode < 300) stats.success++;
      else if (r.statusCode === 429) stats.rateLimited++;
      else stats.error++;
    });

    return stats;
  };

  const statusOptions = [
    { value: 'all', label: 'All', count: logs.length },
    {
      value: 'completed',
      label: 'Completed',
      count: logs.filter((l) => l.status === 'completed').length,
    },
    {
      value: 'running',
      label: 'Running',
      count: logs.filter((l) => l.status === 'running').length,
    },
    { value: 'queued', label: 'Queued', count: logs.filter((l) => l.status === 'queued').length },
    { value: 'failed', label: 'Failed', count: logs.filter((l) => l.status === 'failed').length },
  ];

  return (
    <div className="w-full p-6 container-max-width">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Test Logs</h1>
          <p className="text-textMuted text-sm">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}{' '}
            {filterStatus !== 'all' && `(${filterStatus})`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BaseButton variant="secondary" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </BaseButton>

          {logs.length > 0 && (
            <BaseButton variant="secondary" onClick={() => setBulkMode(!bulkMode)}>
              {bulkMode ? <X size={16} /> : <CheckSquare size={16} />}
              {bulkMode ? 'Cancel Selection' : 'Select'}
            </BaseButton>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <BaseCard className="action-bar-row mb-6">
        {/* Filter Dropdown */}
        <div className="filter-dropdown">
            <BaseButton
              variant="secondary"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} />
              <span>{statusOptions.find((o) => o.value === filterStatus)?.label}</span>
              <span className="text-textMuted">({filteredLogs.length})</span>
            </BaseButton>

            {showFilterDropdown && (
              <div className="filter-menu">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterStatus(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`filter-menu-item ${
                      filterStatus === option.value ? 'active' : ''
                    }`}
                  >
                    <span className="text-text">{option.label}</span>
                    <span className="text-secondary text-xs"> {option.count}</span>
                  </button>
                ))}
              </div>
            )}
        </div>

          {/* Bulk Actions */}
          {bulkMode && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-textMuted hover:text-text transition-colors"
              >
                {selectedLogIds.length === filteredLogs.length ? 'Deselect All' : 'Select All'}
              </button>

              {selectedLogIds.length > 0 && (
                <BaseButton variant="danger" onClick={handleDeleteSelected}>
                  <Trash2 size={16} />
                  Delete Selected ({selectedLogIds.length})
                </BaseButton>
              )}
            </div>
          )}

          {/* Delete All Button */}
          {!bulkMode && logs.length > 0 && (
            <BaseButton variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={16} />
              Delete All
            </BaseButton>
          )}
      </BaseCard>

      {/* Error State */}
      {error && (
        <BaseCard className="mb-6 p-4 bg-red-50 border border-red-200">
          <p className="text-red-800">Error: {error}</p>
        </BaseCard>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw size={48} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-textMuted">Loading test logs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredLogs.length === 0 && (
        <BaseCard className="card-section text-center py-12">
          <p className="text-textMuted text-lg">No test logs found</p>
          {filterStatus !== 'all' && (
            <button
              onClick={() => setFilterStatus('all')}
              className="mt-4 text-accent hover:underline"
            >
              Clear filter
            </button>
          )}
        </BaseCard>
      )}

      {/* Logs List */}
      {!loading && filteredLogs.length > 0 && (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const stats = getResultStats(log.results);
            const duration =
              log.finishedAt && log.startedAt
                ? `${new Date(log.finishedAt) - new Date(log.startedAt)}ms`
                : 'N/A';
            const isSelected = selectedLogIds.includes(log.id);

            return (
              <BaseCard
                key={log.id}
                className={`cursor-pointer hover:shadow-lg transition-all border ${
                  isSelected ? 'border-accent ring-2 ring-accent' : 'border-border'
                } bg-primary`}
              >
                <div onClick={() => !bulkMode && setSelectedLog(log)} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Selection Checkbox */}
                    {bulkMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLogSelection(log.id);
                        }}
                        className="flex-shrink-0 mt-1"
                      >
                        {isSelected ? (
                          <CheckSquare size={20} className="text-accent" />
                        ) : (
                          <Square size={20} className="text-textMuted" />
                        )}
                      </button>
                    )}

                    {/* Log Info */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(log.status)}`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                        <code className="text-xs bg-bg px-2 py-1 rounded text-secondary">
                          {log.id}
                        </code>
                      </div>

                      {log.config?.endpoint && (
                        <div className="flex items-center gap-4 text-sm text-text font-medium flex-wrap bg-secondary/5 px-4 py-1 rounded-lg">
                          <span className="font-bold">{log.config.request?.method || 'GET'}</span>{' '}
                          <span className="font-mono">{log.config.endpoint}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-textMuted mt-2">
                        <span>Created: <strong>{formatDate(log.createdAt)}</strong></span>
                        {duration !== 'N/A' && <span>Duration: <strong>{duration}</strong></span>}
                      </div>
                    </div>

                    {/* Stats */}
                    {stats && (
                      <div className="text-right text-sm flex-shrink-0">
                        <p className="text-text font-bold mb-1">{stats.total} requests</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600">{stats.success} ✓</span>
                          <span className="text-red-600">{stats.error} ✗</span>
                          <span className="text-yellow-600">{stats.rateLimited} ⚠</span>
                        </div>
                      </div>
                    )}

                    {/* Delete Button */}
                    {!bulkMode && (
                      <BaseButton variant='icon' size='icon'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(log.id);
                        }}
                        title="Delete log"
                      >
                        <Trash2 size={18} />
                      </BaseButton>
                    )}
                  </div>
                </div>
              </BaseCard>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && <TestLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <BaseCard className="max-w-md w-full p-6 bg-background">
            <h3 className="text-xl font-bold text-text mb-4">Delete All Test Logs?</h3>
            <p className="text-textMuted mb-6">
              This action will permanently delete all {logs.length} test logs. This cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <BaseButton variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </BaseButton>
              <BaseButton variant="danger" onClick={handleDeleteAll}>
                <Trash2 size={16} />
                Delete All
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      )}
    </div>
  );
}
