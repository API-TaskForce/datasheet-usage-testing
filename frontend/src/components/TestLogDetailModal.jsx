import React, { useState } from 'react';
import BaseButton from './BaseButton.jsx';
import BaseCard from './BaseCard.jsx';
import { X, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function TestLogDetailModal({ log, onClose }) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    config: true,
    summary: true,
    results: false,
  });

  if (!log) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'failed':
        return 'badge-error';
      case 'queued':
        return 'badge-warning';
      case 'running':
        return 'badge-info';
      case 'rate_limited':
        return 'badge-accent';
      default:
        return 'badge-secondary';
    }
  };

  const getResultStatusClass = (statusCode) => {
    if (statusCode >= 200 && statusCode < 300) {
      return 'badge-success';
    } else if (statusCode === 429) {
      return 'badge-warning';
    } else {
      return 'badge-error';
    }
  };

  const duration = log.finishedAt && log.startedAt
    ? `${new Date(log.finishedAt) - new Date(log.startedAt)}ms`
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="modal-panel">
        {/* Header */}
        <div className="card-header">
          <div>
            <h2 className="text-2xl font-bold text-text mb-2">Test Log Details</h2>
            <div className="flex items-center gap-3">
              <span className={`status-badge ${getStatusBadgeClass(log.status)}`}>
                {log.status.toUpperCase()}
              </span>
              <code className="text-xs bg-bg px-2 py-1 rounded text-textMuted">
                {log.id}
              </code>
            </div>
          </div>
          <BaseButton
            variant="ghost"
            onClick={onClose}
            className="text-textMuted hover:text-text"
          >
            <X size={24} />
          </BaseButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Timing Information */}
          <BaseCard className="card-section">
            <div className="stats-grid text-sm">
              <div>
                <p className="text-textMuted font-medium mb-1">Created</p>
                <p className="text-text">{formatDate(log.createdAt)}</p>
              </div>
              {log.startedAt && (
                <div>
                  <p className="text-textMuted font-medium mb-1">Started</p>
                  <p className="text-text">{formatDate(log.startedAt)}</p>
                </div>
              )}
              {log.finishedAt && (
                <div>
                  <p className="text-textMuted font-medium mb-1">Finished</p>
                  <p className="text-text">{formatDate(log.finishedAt)}</p>
                </div>
              )}
              {duration !== 'N/A' && (
                <div>
                  <p className="text-textMuted font-medium mb-1">Duration</p>
                  <p className="text-text font-bold">{duration}</p>
                </div>
              )}
            </div>
          </BaseCard>

          {/* Configuration Section */}
          {log.config && (
            <BaseCard className="expandible-section">
              <button
                onClick={() => toggleSection('config')}
                className="expandible-header"
              >
                <h3 className="card-title">Configuration</h3>
                {expandedSections.config ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {expandedSections.config && (
                <div className="expandible-content space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-medium text-textMuted">Endpoint:</span>
                    <span className="text-text font-mono">{log.config.endpoint || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-medium text-textMuted">Method:</span>
                    <span className="text-text font-bold">{log.config.request?.method || 'GET'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-medium text-textMuted">Clients:</span>
                    <span className="text-text">{log.config.clients || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-medium text-textMuted">Total Requests:</span>
                    <span className="text-text">{log.config.totalRequests || 'N/A'}</span>
                  </div>
                  {log.config.request?.headers && Object.keys(log.config.request.headers).length > 0 && (
                    <div className="pt-2">
                      <p className="font-medium text-textMuted mb-2">Headers:</p>
                      <pre className="bg-bg p-3 rounded text-xs overflow-auto max-h-32 border border-border">
                        {JSON.stringify(log.config.request.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.config.request?.body && (
                    <div className="pt-2">
                      <p className="font-medium text-textMuted mb-2">Body:</p>
                      <pre className="bg-bg p-3 rounded text-xs overflow-auto max-h-32 border border-border">
                        {typeof log.config.request.body === 'string' 
                          ? log.config.request.body 
                          : JSON.stringify(log.config.request.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </BaseCard>
          )}

          {/* Summary Section */}
          {log.summary && (
            <BaseCard className="expandible-section">
              <button
                onClick={() => toggleSection('summary')}
                className="expandible-header"
              >
                <h3 className="card-title">Summary</h3>
                {expandedSections.summary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {expandedSections.summary && (
                <div className="expandible-content stats-grid">
                  <div className="stat-card stat-card-success">
                    <p className="stat-label text-green-700">Success</p>
                    <p className="stat-value text-green-800">{log.summary.ok || 0}</p>
                  </div>
                  <div className="stat-card stat-card-error">
                    <p className="stat-label text-red-700">Errors</p>
                    <p className="stat-value text-red-800">{log.summary.error || 0}</p>
                  </div>
                  <div className="stat-card stat-card-warning">
                    <p className="stat-label text-yellow-700">Rate Limited</p>
                    <p className="stat-value text-yellow-800">{log.summary.rateLimit || 0}</p>
                  </div>
                  <div className="stat-card stat-card-info">
                    <p className="stat-label text-blue-700">Avg Response</p>
                    <p className="stat-value text-blue-800">{log.summary.avgMs || 0}ms</p>
                  </div>
                </div>
              )}
            </BaseCard>
          )}

          {/* Results Section */}
          {log.results && log.results.length > 0 && (
            <BaseCard className="expandible-section">
              <button
                onClick={() => toggleSection('results')}
                className="expandible-header"
              >
                <h3 className="card-title">
                  Results ({log.results.length})
                </h3>
                {expandedSections.results ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {expandedSections.results && (
                <div className="expandible-content space-y-2 max-h-96 overflow-y-auto">
                  {log.results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${getResultStatusClass(result.statusCode)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">#{result.seq}</span>
                          <span className="font-bold text-lg">{result.statusCode}</span>
                          <span className="text-sm">{result.status}</span>
                        </div>
                        <span className="text-xs opacity-75">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {result.response?.body && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium opacity-75">Response Body:</span>
                            <button
                              onClick={() => handleCopy(result.response.body)}
                              className="text-xs px-2 py-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors flex items-center gap-1"
                            >
                              {copied ? <Check size={12} /> : <Copy size={12} />}
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre className="text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto max-h-32">
                            {typeof result.response.body === 'string'
                              ? result.response.body
                              : JSON.stringify(result.response.body, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </BaseCard>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer">
          <BaseButton
            variant="secondary"
            onClick={onClose}
          >
            Close
          </BaseButton>
        </div>
      </div>
    </div>
  );
}
