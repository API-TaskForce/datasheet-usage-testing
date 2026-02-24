import React, { useState, useRef, useEffect } from 'react';
import QuotaChart from './QuotaChart.jsx';
import TestResultModal from './TestResultModal.jsx';
import { proxyRequest } from '../services/apiTemplateService.js';
import BaseButton from './BaseButton.jsx';
import { Undo, Undo2, Plus, Key, Zap, Play, Square, X } from 'lucide-react';
import BaseCard from './BaseCard.jsx';

export default function TemplateTestView({ template }) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/');
  const [queryParams, setQueryParams] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [body, setBody] = useState('');
  const [bodyValidationError, setBodyValidationError] = useState(null);
  const [consoleLines, setConsoleLines] = useState([]);
  const [rateLimit, setRateLimit] = useState({});
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaTotal, setQuotaTotal] = useState(100);
  const [testResult, setTestResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    setConsoleLines((l) => [...l, { type: 'req', text: `${method} ${url}` }]);

    const hdrs = { 'Content-Type': 'application/json' };
    headers.forEach((h) => {
      if (h.key) hdrs[h.key] = h.value;
    });

    const start = Date.now();
    try {
      let bodyToSend = null;
      if (body && body.trim()) {
        try {
          bodyToSend = JSON.parse(body);
        } catch (e) {
          bodyToSend = body;
        }
      }

      const proxyRes = await proxyRequest(url, method, hdrs, bodyToSend);
      const duration = Date.now() - start;

      // Extract response data
      const { status, statusText, data, headers: resHeaders } = proxyRes;
      const responseText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

      // Store result for modal
      setTestResult({
        status,
        statusText,
        data,
        duration,
        headers: resHeaders || {},
        url,
        method,
        requestHeaders: hdrs,
        requestBody: body,
      });
      setShowResultModal(true);

      // Handle rate limit headers from proxy response
      if (resHeaders && Object.keys(resHeaders).length > 0) {
        setRateLimit(resHeaders);
        // Parse remaining from headers
        const remaining =
          resHeaders['x-ratelimit-remaining'] ||
          resHeaders['x-rate-limit-remaining'] ||
          resHeaders['ratelimit-remaining'];
        const limit =
          resHeaders['x-ratelimit-limit'] ||
          resHeaders['x-rate-limit-limit'] ||
          resHeaders['ratelimit-limit'];
        if (remaining && limit) {
          setQuotaUsed(Math.max(0, parseInt(limit) - parseInt(remaining)));
          setQuotaTotal(parseInt(limit));
        }
      }

      setConsoleLines((l) => [
        ...l,
        { type: 'res', text: `${status} ${statusText} — ${duration}ms` },
        { type: 'res', text: responseText.slice(0, 2000) },
      ]);
    } catch (err) {
      console.error('[TemplateTestView] Error during request:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
      const fullMsg = `ERROR (${err.response?.status || 'unknown'}): ${errorMsg}`;
      setConsoleLines((l) => [...l, { type: 'res', text: fullMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConsole = () => {
    setConsoleLines([]);
  };

  return (
    <BaseCard>
      <div className="flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold text-text">Test API</h2>
        <BaseButton variant="secondary" size="icon" onClick={clearConsole}>
          <X size={16} />
        </BaseButton>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="section-card">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-semibold text-text">Test API</h2>
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
            <div className="form-row p-2 flex items-center gap-2 justify-between">
              <p className="form-label mb-0 flex items-center gap-2">Query Parameters</p>
              <BaseButton
                variant="secondary"
                size="sm"
                onClick={() => setQueryParams([...queryParams, { key: '', value: '' }])}
              >
                + Add Parameter
              </BaseButton>
            </div>

            {queryParams.length > 0 && (
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
                      size="icon"
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
            <div className="form-row p-2 flex items-center gap-2 justify-between">
              <p className="form-label mb-0 flex items-center gap-2">Headers</p>
              <BaseButton
                variant="secondary"
                size="sm"
                onClick={() => setHeaders([...headers, { key: '', value: '' }])}
              >
                + Add Header
              </BaseButton>
            </div>

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
          </div>

          {/* Body */}
          <div>
            <div className="form-label p-2 flex items-center justify-between">
              <p className="form-label mb-0">Body (JSON)</p>
              {bodyValidationError && (
                <span className="text-xs text-red-600">{bodyValidationError}</span>
              )}
            </div>
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
          </div>
        </div>

        {/* Console & Stats Section */}
        <div className="flex flex-col h-full gap-6">
          {/* Console */}
          <div className="section-card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="form-label">Console Output</p>
              <button
                onClick={clearConsole}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Clear
              </button>
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
