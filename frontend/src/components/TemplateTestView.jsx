import React, { useState, useRef, useEffect } from 'react';
import QuotaChart from './QuotaChart.jsx';
import TestResultModal from './TestResultModal.jsx';
import { proxyRequest } from '../services/apiTemplateService.js';

export default function TemplateTestView({ template }) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/');
  const [headers, setHeaders] = useState([]);
  const [body, setBody] = useState('');
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

  const runTest = async () => {
    const base = template.apiUri || '';
    const p = path.startsWith('/') ? path : '/' + path;
    const url = base.replace(/\/$/, '') + p;

    setIsLoading(true);
    setConsoleLines((l) => [...l, { type: 'req', text: `${method} ${url}` }]);

    const hdrs = { 'Content-Type': 'application/json' };
    headers.forEach((h) => {
      if (h.key) hdrs[h.key] = h.value;
    });

    const start = Date.now();
    try {
      const proxyRes = await proxyRequest(url, method, hdrs, body || null);
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

  return (
    <div className="w-full flex flex-row gap-6 p-6 container-max-width">
      {/* Request Section */}
      <div className="section-grid w-full">
        <div className="section-card ">
          <p className="form-label mb-4">Request</p>

          <div className="form-row">
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
            </select>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="form-input flex-1"
              placeholder="/"
            />
            <button
              onClick={runTest}
              className="btn-primary"
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.6 : 1, flex: 'none' }}
            >
              {isLoading ? 'Testing...' : 'Run Test'}
            </button>
          </div>

          <div className="mb-4">
            <p className="form-label mb-2">Headers</p>
            <div className="list-container max-h-40">
              {headers.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No custom headers added
                </p>
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
                      className="form-input w-1/3 flex-none"
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
                    <button
                      onClick={() => {
                        const copy = headers.filter((_, i) => i !== idx);
                        setHeaders(copy);
                      }}
                      className="btn-danger p-2 text-sm flex-none"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              <button
                onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                className="btn-secondary mt-2 text-sm p-2"
              >
                + Add Header
              </button>
            </div>
          </div>

          <div>
            <p className="form-label mb-2">Body (JSON)</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="form-textarea"
              placeholder="{}"
            />
          </div>
        </div>
      </div>

      {/* Console & Stats Section */}
      <div className="section-grid-cols-2">
        {/* Console */}
        <div className="section-card flex flex-col">
          <p className="form-label mb-4">Console Output</p>
          <div
            className="console-panel"
            ref={consoleRef}
          >
            {consoleLines.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Run a test to see console output
              </p>
            ) : (
              consoleLines.map((ln, i) => (
                <div
                  key={i}
                  className={ln.type === 'req' ? 'console-line-req' : 'console-line-res'}
                >
                  <span>{ln.type === 'req' ? '→ ' : '← '}</span>
                  <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{ln.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats & Quota */}
        <div className="flex-col-gap">
          {quotaTotal > 0 && (
            <div className="section-card">
              <QuotaChart rateLimit={rateLimit} quotaUsed={quotaUsed} quotaTotal={quotaTotal} />
            </div>
          )}
        </div>
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
  );
}
