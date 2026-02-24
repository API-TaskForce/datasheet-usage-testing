import React, { useState, useRef, useEffect } from 'react';
import BaseButton from './BaseButton.jsx';
import { testApi, getTestResults } from '../services/apiTemplateService.js';

export default function TestResultModal({ result, onClose, template }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'configure'
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [consoleLines, setConsoleLines] = useState([]);
  const consoleRef = useRef();

  // Configuration state
  const [clients, setClients] = useState(5);
  const [totalRequests, setTotalRequests] = useState(20);
  const [customHeaders, setCustomHeaders] = useState([]);
  const [requestBody, setRequestBody] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(5000);

  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLines]);

  const handleCopy = () => {
    if (selectedResult?.response?.body) {
      navigator.clipboard.writeText(selectedResult.response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (idx) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== idx));
  };

  const updateHeader = (idx, field, value) => {
    const updated = [...customHeaders];
    updated[idx][field] = value;
    setCustomHeaders(updated);
  };

  const executeTest = async () => {
    if (!template) return;

    setIsExecuting(true);
    setConsoleLines([]);
    setTestResults(null);
    setSelectedResult(null);

    try {
      const base = template.apiUri || '';
      const path = result?.path || '/';
      const url = base.replace(/\/$/, '') + path;

      // Build headers
      const headers = {};
      if (template.authMethod && template.authCredential) {
        if (template.authMethod === 'API_TOKEN') {
          headers['Authorization'] = `Bearer ${template.authCredential}`;
        } else if (template.authMethod === 'BEARER') {
          headers['Authorization'] = `Bearer ${template.authCredential}`;
        } else if (template.authMethod === 'BASIC_AUTH') {
          headers['Authorization'] = `Basic ${template.authCredential}`;
        }
      }

      // Add custom headers
      customHeaders.forEach(h => {
        if (h.key) headers[h.key] = h.value;
      });

      setConsoleLines(l => [...l, { type: 'info', text: `Starting rate limit test...` }]);
      setConsoleLines(l => [...l, { type: 'info', text: `Configuration: ${clients} clients, ${totalRequests} total requests` }]);

      const payload = {
        endpoint: url,
        request: {
          method: result?.method || 'GET',
          headers,
          body: requestBody ? JSON.parse(requestBody) : null,
        },
        clients,
        totalRequests,
        timeoutMs,
      };

      const jobData = await testApi(payload);
      const jobId = jobData.jobId;
      setConsoleLines(l => [...l, { type: 'info', text: `Test started (Job ID: ${jobId})` }]);

      // Poll for job completion
      let jobDone = false;
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes max

      while (!jobDone && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;

        try {
          const job = await getTestResults(jobId);
          
          if (job.status === 'completed') {
            jobDone = true;
            setTestResults(job);
            setConsoleLines(l => [...l, { type: 'success', text: `Test completed!` }]);
            setConsoleLines(l => [...l, { type: 'info', text: `Results: ${job.summary.ok} OK, ${job.summary.error} Errors, ${job.summary.rateLimit} Rate Limited` }]);
            
            if (job.results.length > 0) {
              setSelectedResult(job.results[0]);
            }
          }
        } catch (err) {
          // Job still not ready, continue polling
          if (err.status === 404) {
            // Job not found yet
          } else {
            throw err;
          }
        }
      }

      if (!jobDone) {
        setConsoleLines(l => [...l, { type: 'error', text: 'Test timeout: did not complete within 5 minutes' }]);
      }
    } catch (err) {
      console.error('Error executing test:', err);
      const errorMsg = err.message || 'Unknown error';
      setConsoleLines(l => [...l, { type: 'error', text: `Error: ${errorMsg}` }]);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!result && !testResults) return null;

  const currentResult = selectedResult || result;
  const { status, statusText, data, duration, headers = {} } = currentResult;
  const responseText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  const isSuccess = status >= 200 && status < 300;
  const statusColor = isSuccess ? '#22863a' : '#cb2431';
  const statusBgColor = isSuccess ? '#f0f9f4' : '#fdeaea';

  return (
    <div className="modal-overlay">
      <div className="modal-panel flex flex-col" style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="section-card-header flex justify-between items-start mb-0 border-b p-6" style={{ background: statusBgColor }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: statusColor }}>
              Test Response & Configuration
            </h2>
            <p className="header-subtitle">
              View results and configure new tests
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl font-normal cursor-pointer bg-none border-0 p-0 text-text" 
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs-container flex-shrink-0">
          <button
            onClick={() => setActiveTab('results')}
            className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          >
            Results {testResults && `(${testResults.results.length} requests)`}
          </button>
          <button
            onClick={() => setActiveTab('configure')}
            className={`tab-button ${activeTab === 'configure' ? 'active' : ''}`}
          >
            Configure Test
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto flex-1 flex flex-col">
          
          {activeTab === 'results' ? (
            <>
              {/* Status Summary */}
              {currentResult && (
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <div className="flex-1 stat-card" style={{ borderColor: statusColor, background: statusBgColor }}>
                    <p className="stat-title" style={{ color: statusColor }}>
                      Status
                    </p>
                    <p className="stat-value" style={{ color: statusColor }}>
                      {status}
                    </p>
                    <p className="stat-label" style={{ color: statusColor }}>
                      {statusText}
                    </p>
                  </div>

                  <div className="flex-1 stat-card stat-card.info">
                    <p className="stat-title">
                      Duration
                    </p>
                    <p className="stat-value" style={{ color: '#0366d6' }}>
                      {duration}ms
                    </p>
                  </div>

                  <div className="stat-card">
                    <p className="stat-title">
                      Size
                    </p>
                    <p className="stat-value" style={{ color: '#6366f1' }}>
                      {(responseText.length / 1024).toFixed(2)}KB
                    </p>
                  </div>
                </div>
              )}

              {/* Test Results List */}
              {testResults && testResults.results.length > 0 && (
                <div className="mb-8">
                  <h3 className="form-label mb-4">
                    Test Requests ({testResults.results.length})
                  </h3>
                  <div className="list-container max-h-64">
                    {testResults.results.map((r, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedResult(r)}
                        className={`list-item cursor-pointer ${selectedResult?.seq === r.seq ? 'selected bg-blue-50' : ''}`}
                      >
                        <span>
                          <span style={{ fontWeight: 'bold', color: '#0366d6' }}>#{r.seq}</span>
                          <span style={{ marginLeft: '0.5rem', color: r.statusCode >= 400 ? '#cb2431' : '#22863a' }}>
                            {r.statusCode}
                          </span>
                        <span className="text-text-secondary">
                          {r.durationMs}ms
                        </span>
                      </span>
                      <span className="text-xs text-text-secondary">
                          {new Date(r.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Headers */}
              {currentResult && Object.keys(headers).length > 0 && (
                <div className="mb-8">
                  <h3 className="form-label mb-4">
                    Response Headers
                  </h3>
                  <div className="code-block min-h-24">
                    {Object.entries(headers).map(([key, value]) => (
                      <div key={key} className="mb-3 text-sm">
                        <span className="font-bold text-blue-600">{key}:</span>
                        <span className="ml-2 text-text break-words">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Body */}
              <div>
                <h3 className="form-label mb-4">
                  Response Body
                </h3>
                <div className="code-block">
                  {responseText}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Configure Test Form */}
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex-1 form-group-col">
                  <label className="form-label">Number of Clients</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={clients}
                    onChange={(e) => setClients(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    disabled={isExecuting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Number of concurrent clients making requests
                  </p>
                </div>

                <div className="flex-1 form-group-col">
                  <label className="form-label">Total Requests</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={totalRequests}
                    onChange={(e) => setTotalRequests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    disabled={isExecuting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Total requests to be distributed among clients
                  </p>
                </div>

                <div className="form-group-col">
                  <label className="form-label">Timeout (ms)</label>
                  <input
                    type="number"
                    min="1000"
                    max="30000"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Math.max(1000, parseInt(e.target.value) || 5000))}
                    className="form-input"
                    disabled={isExecuting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Request timeout (ms)
                  </p>
                </div>
              </div>

              {/* Custom Headers */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <label className="form-label">Custom Headers</label>
                  <button
                    onClick={addHeader}
                    className="btn-secondary"
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    disabled={isExecuting}
                  >
                    + Add Header
                  </button>
                </div>

                {customHeaders.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    No custom headers added
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {customHeaders.map((h, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Header name"
                          value={h.key}
                          onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                          className="form-input flex-1"
                          disabled={isExecuting}
                        />
                        <input
                          type="text"
                          placeholder="Header value"
                          value={h.value}
                          onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                          className="form-input flex-1"
                          disabled={isExecuting}
                        />
                        <button
                          onClick={() => removeHeader(idx)}
                          className="btn-danger"
                          style={{ padding: '0.5rem 1rem' }}
                          disabled={isExecuting}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Request Body */}
              <div className="mb-8">
                <label className="form-label">Request Body (JSON)</label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="form-textarea"
                  placeholder='{"key": "value"}'
                  disabled={isExecuting}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Optional JSON body for POST/PUT requests
                </p>
              </div>

              {/* Console Output */}
              {isExecuting && (
                <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem' }} className="text-text">
                      Test Progress
                    </p>
                    <div
                      ref={consoleRef}
                      className="bg-gray-100 border border-gray-200 rounded p-4 max-h-52 overflow-y-auto font-mono text-sm leading-6"
                    >
                      {consoleLines.length === 0 ? (
                        <span className="text-text-secondary">Waiting for test to start...</span>
                    ) : (
                      consoleLines.map((line, idx) => (
                        <div
                          key={idx}
                          className={line.type === 'error' ? 'console-line-error' : line.type === 'success' ? 'console-line-success' : line.type === 'info' ? 'console-line-info' : 'console-line-req'}
                        >
                          {line.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-bg flex-shrink-0">
          {activeTab === 'results' && (
            <>
              <BaseButton variant="secondary" onClick={onClose}>
                Close
              </BaseButton>
              {currentResult && currentResult.response?.body && (
                <BaseButton 
                  variant="primary" 
                  onClick={handleCopy}
                >
                  {copied ? 'Copie' : 'Copy Response'}
                </BaseButton>
              )}
            </>
          )}
          {activeTab === 'configure' && (
            <>
              <BaseButton 
                variant="secondary" 
                onClick={() => setActiveTab('results')}
                disabled={isExecuting}
              >
                Back to Results
              </BaseButton>
              <BaseButton 
                variant="primary" 
                onClick={executeTest}
                disabled={isExecuting}
              >
                {isExecuting ? 'Running Test...' : 'Run Rate Limit Test'}
              </BaseButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
