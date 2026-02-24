import React, { useState, useRef, useEffect } from 'react';
import QuotaChart from './QuotaChart.jsx';
import TestResultModal from './TestResultModal.jsx';
import { testApi, getTestResults } from '../services/apiTemplateService.js';
import BaseButton from './BaseButton.jsx';
import { Undo, Undo2, Plus, Key, Zap, Play, Square, X, ChevronDown } from 'lucide-react';
import BaseCard from './BaseCard.jsx';

export default function TemplateTestView({ template, OnClose }) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/');
  const [queryParams, setQueryParams] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [body, setBody] = useState('');
  const [bodyValidationError, setBodyValidationError] = useState(null);
  const [consoleLines, setConsoleLines] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandQueryParams, setExpandQueryParams] = useState(true);
  const [expandHeaders, setExpandHeaders] = useState(true);
  const [expandBody, setExpandBody] = useState(true);
  const [expandConfig, setExpandConfig] = useState(true);
  
  // Test configuration
  const [clients, setClients] = useState(1);
  const [totalRequests, setTotalRequests] = useState(1);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  
  const consoleRef = useRef();

  useEffect(() => {
    // prepare auth header
    const h = [];
    if (template) {
      if (template.authMethod === 'API_TOKEN' || template.authMethod === 'BEARER')
        h.push({ key: 'Authorization', value: `Bearer ${template.authCredential}` });
      else if (template.authMethod === 'BASIC_AUTH')
        h.push({ key: 'Authorization', value: `Basic ${template.authCredential}` });
    }
    setHeaders(h);
  }, [template]);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  // Validate JSON body
  const validateBody = (bodyText) => {
    if (!bodyText || bodyText.trim() === '') {
      setBodyValidationError(null);
      return true;
    }
    try {
      JSON.parse(bodyText);
      setBodyValidationError(null);
      return true;
    } catch (err) {
      setBodyValidationError(`Invalid JSON: ${err.message}`);
      return false;
    }
  };

  // Build full URL with query params
  const buildFullUrl = () => {
    const base = template.apiUri || '';
    const p = path.startsWith('/') ? path : '/' + path;
    let url = base.replace(/\/$/, '') + p;

    const validParams = queryParams.filter((q) => q.key && q.value);
    if (validParams.length > 0) {
      const qs = validParams
        .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
        .join('&');
      url += '?' + qs;
    }

    return url;
  };

  const runTest = async () => {
    // Validate body if present
    if (body && !validateBody(body)) {
      return;
    }

    const url = buildFullUrl();
    setIsLoading(true);
    setConsoleLines([]);
    setConsoleLines((l) => [...l, { type: 'info', text: `Starting test...` }]);
    setConsoleLines((l) => [...l, { type: 'info', text: `Configuration: ${clients} clients, ${totalRequests} total requests, ${timeoutMs}ms timeout` }]);

    const hdrs = { 'Content-Type': 'application/json' };
    headers.forEach((h) => {
      if (h.key) hdrs[h.key] = h.value;
    });

    try {
      let bodyToSend = null;
      if (body && body.trim()) {
        try {
          bodyToSend = JSON.parse(body);
        } catch (e) {
          bodyToSend = body;
        }
      }

      // Create test payload
      const testConfig = {
        endpoint: url,
        request: {
          method,
          headers: hdrs,
          body: bodyToSend,
        },
        clients: parseInt(clients) || 1,
        totalRequests: parseInt(totalRequests) || 1,
        timeoutMs: parseInt(timeoutMs) || 5000,
      };

      setConsoleLines((l) => [...l, { type: 'info', text: `${method} ${url}` }]);

      // Execute test via testApi
      const { jobId } = await testApi(testConfig);
      setConsoleLines((l) => [...l, { type: 'info', text: `Job created: ${jobId}` }]);

      // Poll for results with timeout of 5 minutes
      let job;
      let attempts = 0;
      const maxAttempts = 600; // 600 * 500ms = 5 minutes

      while (attempts < maxAttempts) {
        job = await getTestResults(jobId);

        if (job.status === 'completed' || job.status === 'failed') {
          setConsoleLines((l) => [...l, { type: 'success', text: `Test completed with status: ${job.status}` }]);
          setConsoleLines((l) => [
            ...l,
            {
              type: 'info',
              text: `Summary: ${job.summary.ok} OK, ${job.summary.error} Errors, ${job.summary.rateLimit} Rate Limited | Avg: ${job.summary.avgMs}ms`,
            },
          ]);

          // Store result for modal
          setTestResult(job);
          setShowResultModal(true);
          break;
        } else {
          setConsoleLines((l) => [
            ...l,
            { type: 'info', text: `Status: ${job.status} | Results so far: ${job.results?.length || 0}` },
          ]);
        }

        // Wait 500ms before retry
        await new Promise((r) => setTimeout(r, 500));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        setConsoleLines((l) => [...l, { type: 'error', text: 'Test timeout: did not complete within 5 minutes' }]);
      }
    } catch (err) {
      console.error('[TemplateTestView] Error during test execution:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
      const fullMsg = `ERROR: ${errorMsg}`;
      setConsoleLines((l) => [...l, { type: 'error', text: fullMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConsole = () => {
    setConsoleLines([]);
  };

  return (
    <BaseCard>
      <div className="section-card-header items-center justify-between">
        <h2 className="text-2xl font-semibold text-text">Test API</h2>
        <BaseButton variant="ghost" size="sm" onClick={OnClose}>
          <X size={16} />
        </BaseButton>
      </div>
      <div className="flex flex-col w-full md:flex-row gap-6">
        <div className="section-card w-1/2">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-semibold text-text">API Request</h2>
          </div>

          <div className="py-4">
            <p className="text-sm text-gray-600">Configure your API Request.</p>
          </div>

          {/* Method and Path */}
          <div className="form-row mb-4">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="form-select w-36 flex-none"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
              <option>HEAD</option>
            </select>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="form-input"
              placeholder="/endpoint"
            />
            <BaseButton variant="primary" size="lg" disabled={isLoading} onClick={runTest}>
              {isLoading ? <Square size={16} /> : <Play size={16} />}
            </BaseButton>
          </div>

          {/* Query Parameters */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandQueryParams(!expandQueryParams)}>
              <div className="flex items-center gap-2">
                <ChevronDown size={18} className={`transition-transform ${expandQueryParams ? '' : '-rotate-90'}`} />
                <p className="form-label mb-0">Query Parameters</p>
              </div>
              <BaseButton
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setQueryParams([...queryParams, { key: '', value: '' }]);
                }}
              >
                + Add Parameter
              </BaseButton>
            </div>

            {expandQueryParams && queryParams.length > 0 && (
              <div className="list-container max-h-40 p-4">
                {queryParams.map((q, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 last:mb-0">
                    <input
                      value={q.key}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].key = e.target.value;
                        setQueryParams(copy);
                      }}
                      className="form-input w-auto flex-none"
                      placeholder="Key"
                    />
                    <input
                      value={q.value}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].value = e.target.value;
                        setQueryParams(copy);
                      }}
                      className="form-input flex-1"
                      placeholder="Value"
                    />
                    <BaseButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const copy = [...queryParams];
                        copy.splice(idx, 1);
                        setQueryParams(copy);
                      }}
                    >
                      <Undo size={16} />
                    </BaseButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Headers */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandHeaders(!expandHeaders)}>
              <div className="flex items-center gap-2">
                <ChevronDown size={18} className={`transition-transform ${expandHeaders ? '' : '-rotate-90'}`} />
                <p className="form-label mb-0">Headers</p>
              </div>
              <BaseButton
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setHeaders([...headers, { key: '', value: '' }]);
                }}
              >
                + Add Header
              </BaseButton>
            </div>

            {expandHeaders && (
              <div className="list-container max-h-40 p-4">
                {headers.length === 0 ? (
                  <p className="text-xs text-gray-500">No custom headers added</p>
                ) : (
                  headers.map((h, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 last:mb-0">
                      <input
                        value={h.key}
                        onChange={(e) => {
                          const copy = [...headers];
                          copy[idx].key = e.target.value;
                          setHeaders(copy);
                        }}
                        className="form-input w-auto flex-none"
                        placeholder="Key"
                      />
                      <input
                        value={h.value}
                        onChange={(e) => {
                          const copy = [...headers];
                          copy[idx].value = e.target.value;
                          setHeaders(copy);
                        }}
                        className="form-input flex-1"
                        placeholder="Value"
                      />
                      <BaseButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const copy = [...headers];
                          copy.splice(idx, 1);
                          setHeaders(copy);
                        }}
                      >
                        <Undo size={16} />
                      </BaseButton>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandBody(!expandBody)}>
              <div className="flex items-center gap-2">
                <ChevronDown size={18} className={`transition-transform ${expandBody ? '' : '-rotate-90'}`} />
                <p className="form-label mb-0">Body (JSON)</p>
              </div>
              {bodyValidationError && (
                <span className="text-xs text-red-600">{bodyValidationError}</span>
              )}
            </div>
            {expandBody && (
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  validateBody(e.target.value);
                }}
                rows={6}
                className={`form-textarea ${bodyValidationError ? 'border-red-500' : ''}`}
                placeholder="{}"
              />
            )}
          </div>

          {/* Test Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandConfig(!expandConfig)}>
              <div className="flex items-center gap-2">
                <ChevronDown size={18} className={`transition-transform ${expandConfig ? '' : '-rotate-90'}`} />
                <p className="form-label mb-0">Test Configuration</p>
              </div>
            </div>
            {expandConfig && (
              <div className="space-y-4 p-4 bg-gray-50 rounded border border-gray-200">
                <div className="form-group">
                  <label className="form-label muted">Number of Clients</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={clients}
                    onChange={(e) => setClients(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Concurrent clients making requests</p>
                </div>

                <div className="form-group">
                  <label className="form-label muted">Total Requests</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={totalRequests}
                    onChange={(e) => setTotalRequests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Total requests across all clients</p>
                </div>

                <div className="form-group">
                  <label className="form-label muted">Timeout (ms)</label>
                  <input
                    type="number"
                    min="1000"
                    max="30000"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Math.max(1000, parseInt(e.target.value) || 5000))}
                    className="form-input"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Request timeout in milliseconds</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Console & Stats Section */}
        <div className="flex flex-col w-1/2">
          {/* Console */}
          <div className="section-card">
            <div className="flex items-center justify-between mb-4">
              <p className="form-label">Console Output</p>
              <BaseButton variant="secondary" size="sm" onClick={clearConsole}>
                <Undo size={16} /> Clear Console
              </BaseButton>
            </div>
            <div className="console-panel flex-1" ref={consoleRef}>
              {consoleLines.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Run a test to see console output</p>
              ) : (
                consoleLines.map((ln, i) => (
                  <div
                    key={i}
                    className={ln.type === 'req' ? 'console-line-req' : 'console-line-res'}
                  >
                    <span>{ln.type === 'req' ? '→ ' : '← '}</span>
                    <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {ln.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats & Quota */}
          {testResult && (
            <div className="flex flex-col gap-4">
              <div className="section-card">
                <p className="form-label mb-3">Last Response Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-bold">
                      {testResult.status} {testResult.statusText}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-bold">{testResult.duration}ms</span>
                  </div>
                  {Object.keys(testResult.headers || {}).length > 0 && (
                    <div>
                      <span className="text-gray-600 block mb-1">Response Headers:</span>
                      <div className="bg-gray-50 p-2 rounded text-xs max-h-24 overflow-auto">
                        {Object.entries(testResult.headers).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value).slice(0, 50)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Test Result Modal */}
        {showResultModal && (
          <TestResultModal
            result={testResult}
            template={template}
            onClose={() => setShowResultModal(false)}
          />
        )}
      </div>
    </BaseCard>
  );
}
