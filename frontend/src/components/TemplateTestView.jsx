import React, { useState, useRef, useEffect } from 'react';
import QuotaChart from './QuotaChart.jsx';
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
    setConsoleLines((l) => [...l, { type: 'req', text: `${method} ${url}` }]);
    const hdrs = { 'Content-Type': 'application/json' };
    headers.forEach((h) => {
      if (h.key) hdrs[h.key] = h.value;
    });
    const start = Date.now();
    try {
      const proxyRes = await proxyRequest(url, method, hdrs, body || null);
      const t = Date.now() - start;
      
      // Extract response data
      const { status, statusText, data, headers: resHeaders } = proxyRes;
      const responseText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

      // Handle rate limit headers from proxy response
      if (resHeaders && Object.keys(resHeaders).length > 0) {
        setRateLimit(resHeaders);
        // Parse remaining from headers
        const remaining = resHeaders['x-ratelimit-remaining'] || 
                         resHeaders['x-rate-limit-remaining'] || 
                         resHeaders['ratelimit-remaining'];
        const limit = resHeaders['x-ratelimit-limit'] || 
                     resHeaders['x-rate-limit-limit'] || 
                     resHeaders['ratelimit-limit'];
        if (remaining && limit) {
          setQuotaUsed(Math.max(0, parseInt(limit) - parseInt(remaining)));
          setQuotaTotal(parseInt(limit));
        }
      }

      setConsoleLines((l) => [
        ...l,
        { type: 'res', text: `${status} ${statusText} — ${t}ms` },
        { type: 'res', text: responseText.slice(0, 2000) },
      ]);
    } catch (err) {
      console.error('[TemplateTestView] Error during request:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
      const fullMsg = `ERROR (${err.response?.status || 'unknown'}): ${errorMsg}`;
      setConsoleLines((l) => [...l, { type: 'res', text: fullMsg }]);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-row lg:flex-row bg-white gap-4 p-4 w-full">
        <div className="flex flex-col gap-4 flex-1">
          <p className="form-label">Request</p>
          <div className="flex gap-2 mb-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="form-select w-32"
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
          </div>

          <div className="mb-3">
            <p className="form-label mb-2">Headers</p>
            {headers.map((h, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  value={h.key}
                  onChange={(e) => {
                    const copy = [...headers];
                    copy[idx].key = e.target.value;
                    setHeaders(copy);
                  }}
                  className="form-input w-1-3"
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
              </div>
            ))}
          </div>

          <div className="mb-3">
            <p className="form-label mb-2">Body (JSON)</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="form-textarea"
              placeholder="{}"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={runTest} className="btn-primary">
              Run Test
            </button>
          </div>
        </div>

        <div className='flex flex-row lg:flex-row gap-4 flex-1'>
          <div className="flex flex-col bg-white shadow rounded-lg p-4 flex-1">
            <p className="form-label mb-3">Console</p>
            <div
              className="console-root border rounded p-3 h-full overflow-y-auto bg-gray-900 text-gray-100"
              ref={consoleRef}
            >
              {consoleLines.map((ln, i) => (
                <div
                  key={i}
                  className={`console-line ${ln.type === 'req' ? 'text-blue-400' : 'text-green-400'} font-mono text-xs mb-1`}
                >
                  {ln.type === 'req' ? '→ ' : '← '}
                  {ln.text}
                </div>
              ))}
            </div>
          </div>

          {quotaTotal > 0 && (
            <div className="flex-1">
              <QuotaChart rateLimit={rateLimit} quotaUsed={quotaUsed} quotaTotal={quotaTotal} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
