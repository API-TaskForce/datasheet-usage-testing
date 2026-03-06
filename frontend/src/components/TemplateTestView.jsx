import React, { useState, useEffect } from 'react';
import { testApi, getTestConfigs } from '../services/apiTemplateService.js';
import BaseButton from './BaseButton.jsx';
import { Undo, Play, Square, X } from 'lucide-react';
import BaseCard from './BaseCard.jsx';

export default function TemplateTestView({ template, OnClose, onTestStarted }) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/');
  const [queryParams, setQueryParams] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [body, setBody] = useState('');
  const [bodyValidationError, setBodyValidationError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('params');

  // Predefined tests
  const [predefinedConfigs, setPredefinedConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  // Test configuration
  const [clients, setClients] = useState(1);
  const [totalRequests, setTotalRequests] = useState(1);
  const [timeoutMs, setTimeoutMs] = useState(5000);

  useEffect(() => {
    // prepare auth header
    const h = [];
    if (template) {
      if (template.authMethod === 'API_TOKEN' || template.authMethod === 'BEARER')
        h.push({ key: 'Authorization', value: `Bearer ${template.authCredential}` });
      else if (template.authMethod === 'BASIC_AUTH')
        h.push({ key: 'Authorization', value: `Basic ${template.authCredential}` });
      else if (template.authMethod === 'RAPID_API' || template.authMethod === 'RAPIDAPI')
        h.push({ key: 'x-rapidapi-key', value: template.authCredential || '' });
    }
    setHeaders(h);

    // Load predefined configs
    const loadConfigs = async () => {
      setLoadingConfigs(true);
      try {
        if (!template?.id) {
          setPredefinedConfigs([]);
          return;
        }
        const data = await getTestConfigs(template.id);
        const normalized = (data || []).map((cfg) => ({ ...cfg, isDefault: Boolean(cfg?.isDefault) }));
        setPredefinedConfigs(normalized);

        const defaultConfig = normalized.find((cfg) => cfg.isDefault);
        if (defaultConfig) {
          applyPredefinedConfig(defaultConfig.id);
        }
      } catch (err) {
        console.error('Failed to load predefined configs');
      } finally {
        setLoadingConfigs(false);
      }
    };
    loadConfigs();
  }, [template]);

  const applyPredefinedConfig = (configId) => {
    const config = predefinedConfigs.find((c) => c.id === configId);
    if (!config) return;

    setMethod(config.method);
    setPath(config.path);
    setClients(config.clients);
    setTotalRequests(config.totalRequests);
    setTimeoutMs(config.timeoutMs);
    setBody(config.body || '');
    // If we had dynamic headers in config, we'd apply them here too
  };

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

      // Execute test via testApi
      const { jobId } = await testApi(testConfig);

      // Delegate monitoring to parent component (dashboard)
      if (onTestStarted) {
        onTestStarted(jobId);
      }
    } catch (err) {
      console.error('[TemplateTestView] Error during test execution:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
      alert(`Error starting test: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseCard className="h-[50vh] overflow-hidden">
      <div className="section-card-header items-center justify-between">
        <h2 className="text-2xl font-semibold text-text">Test API</h2>
        <BaseButton variant="ghost" size="sm" onClick={OnClose}>
          <X size={16} />
        </BaseButton>
      </div>
      <div className="flex flex-col lg:flex-row w-full h-full gap-6">
        <div className="section-card w-full h-full lg:w-5/12 gap-4">
          {/* Header */}
          <h2 className="text-2xl font-semibold text-text">API Request</h2>
          <div className="flex flex-row gap-4 p-2">
            {/* Method and Path */}
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
                <option>HEAD</option>
              </select>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="form-input"
                placeholder="/endpoint"
              />
              <BaseButton variant="primary" size="md" disabled={isLoading} onClick={runTest}>
                {isLoading ? <Square size={16} /> : <Play size={16} />}
              </BaseButton>
            </div>
          </div>

          <div className="card-section w-full gap-4">
            {/* Predefined Tests Selector */}
            {loadingConfigs && (
              <p className="text-xs text-slate-500">Loading predefined configurations...</p>
            )}
            {predefinedConfigs.length > 0 && !loadingConfigs && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-row items-center gap-2">
                  <label className="flex text-text font-bold text-secondary">
                    Predefined Configuration
                  </label>
                </div>

                <div className="flex flex-row items-center justify-between w-full gap-4">
                  <select
                    onChange={(e) => applyPredefinedConfig(e.target.value)}
                    className="form-select h-fit w-full bg-transparent px-2 rounded-full border-2 border-border outline-none text-xs text-secondary cursor-pointer"
                  >
                    <option value="">Select a saved test...</option>
                    {predefinedConfigs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.isDefault ? '[Default] ' : ''}{c.testName} ({c.method})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Panel */}
        <div className="section-card w-full h-full lg:w-7/12 gap-4">
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('params')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'params'
                  ? 'bg-secondary text-white'
                  : 'bg-primary text-text hover:bg-secondary/20'
              }`}
            >
              Query Params
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('headers')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'headers'
                  ? 'bg-secondary text-white'
                  : 'bg-primary text-text hover:bg-secondary/20'
              }`}
            >
              Headers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'json'
                  ? 'bg-secondary text-white'
                  : 'bg-primary text-text hover:bg-secondary/20'
              }`}
            >
              Body JSON
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'config'
                  ? 'bg-secondary text-white'
                  : 'bg-primary text-text hover:bg-secondary/20'
              }`}
            >
              Test Configuration
            </button>
          </div>
          <div className="pt-1">
            {activeTab === 'params' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="form-label mb-0">Query Parameters</p>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setQueryParams([...queryParams, { key: '', value: '' }])}
                  >
                    + Add Parameter
                  </BaseButton>
                </div>

                {queryParams.length === 0 ? (
                  <p className="text-xs text-slate-500">No query parameters added</p>
                ) : (
                  <div className="list-container max-h-64 p-4 overflow-y-auto">
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
            )}

            {activeTab === 'headers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="form-label mb-0">Headers</p>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                  >
                    + Add Header
                  </BaseButton>
                </div>

                {headers.length === 0 ? (
                  <p className="text-xs text-slate-500">No custom headers added</p>
                ) : (
                  <div className="list-container max-h-64 p-4 overflow-y-auto">
                    {headers.map((h, idx) => (
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'json' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
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
                  rows={14}
                  className={`form-textarea ${bodyValidationError ? 'border-red-500' : ''}`}
                  placeholder="{}"
                />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="card-section space-y-4 p-4 bg-gray-50 rounded border border-gray-200">
                <p className="form-label mb-0">Test Configuration</p>

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
      </div>
    </BaseCard>
  );
}
