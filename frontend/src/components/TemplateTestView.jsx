import React, { useState, useEffect, useRef } from 'react';
import { getTestConfigs } from '../services/apiTemplateService.js';
import BaseButton from './BaseButton.jsx';
import { Undo, X } from 'lucide-react';
import BaseCard from './BaseCard.jsx';
import { useToast } from '../stores/toastStore.jsx';

export default function TemplateTestView({ template, OnClose, onConfigChange, initialConfig = null }) {
  const toast = useToast();
  const hasHydratedInitialConfig = useRef(false);
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
    hasHydratedInitialConfig.current = false;
  }, [template?.id]);

  useEffect(() => {
    if (!initialConfig || hasHydratedInitialConfig.current) return;

    setMethod(initialConfig.method || 'GET');
    setPath(initialConfig.path || '/');
    setClients(Math.max(1, parseInt(initialConfig.clients || 1, 10)));
    setTotalRequests(Math.max(1, parseInt(initialConfig.totalRequests || 1, 10)));
    setTimeoutMs(Math.max(1000, parseInt(initialConfig.timeoutMs || 5000, 10)));
    setBody(initialConfig.body || '');
    setQueryParams(Array.isArray(initialConfig.queryParams) ? initialConfig.queryParams : []);
    setHeaders(Array.isArray(initialConfig.headers) ? initialConfig.headers : []);
    hasHydratedInitialConfig.current = true;
  }, [initialConfig]);

  useEffect(() => {
    // prepare auth header
    const authHeaders = [];
    if (template) {
      if (template.authMethod === 'API_TOKEN' || template.authMethod === 'BEARER')
        authHeaders.push({ key: 'Authorization', value: `Bearer ${template.authCredential}` });
      else if (template.authMethod === 'BASIC_AUTH')
        authHeaders.push({ key: 'Authorization', value: `Basic ${template.authCredential}` });
      else if (template.authMethod === 'RAPID_API' || template.authMethod === 'RAPIDAPI')
        authHeaders.push({ key: 'x-rapidapi-key', value: template.authCredential || '' });
    }
    setHeaders((prev) => {
      const nonAuth = (prev || []).filter((item) => {
        const k = String(item?.key || '').toLowerCase();
        return k !== 'authorization' && k !== 'x-rapidapi-key';
      });
      const next = [...nonAuth, ...authHeaders];
      if (JSON.stringify(prev || []) === JSON.stringify(next)) {
        return prev;
      }
      return next;
    });
  }, [template?.authMethod, template?.authCredential]);

  useEffect(() => {
    // Load predefined configs
    const loadConfigs = async () => {
      setLoadingConfigs(true);
      try {
        if (!template?.id) {
          setPredefinedConfigs([]);
          return;
        }
        const data = await getTestConfigs(template.id);
        const normalized = (data || []).map((cfg) => ({
          ...cfg,
          isDefault: Boolean(cfg?.isDefault),
        }));
        setPredefinedConfigs(normalized);

        const defaultConfig = normalized.find((cfg) => cfg.isDefault);
        if (defaultConfig && !initialConfig) {
          setMethod(defaultConfig.method);
          setPath(defaultConfig.path);
          setClients(defaultConfig.clients);
          setTotalRequests(defaultConfig.totalRequests);
          setTimeoutMs(defaultConfig.timeoutMs);
          setBody(defaultConfig.body || '');
        }
      } catch (err) {
        console.error('Failed to load predefined configs');
      } finally {
        setLoadingConfigs(false);
      }
    };
    loadConfigs();
  }, [template?.id]);

  useEffect(() => {
    if (!onConfigChange) return;

    onConfigChange({
      method,
      path,
      headers,
      queryParams,
      body,
      clients: Math.max(1, parseInt(clients || 1, 10)),
      totalRequests: Math.max(1, parseInt(totalRequests || 1, 10)),
      timeoutMs: Math.max(1000, parseInt(timeoutMs || 5000, 10)),
    });
  }, [
    method,
    path,
    headers,
    queryParams,
    body,
    clients,
    totalRequests,
    timeoutMs,
    onConfigChange,
  ]);

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

  const handleFormatJSON = () => {
    try {
      if (!body || body.trim() === '') {
        toast.info('No JSON content to format');
        return;
      }

      let jsonStr = body;

      // Remove trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

      // Fix unquoted object keys - comprehensive multi-pass approach
      // Pass 1: Keys after { or , (handles most common cases)
      jsonStr = jsonStr.replace(/([{,\n]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');
      
      // Pass 2: Keys at start of document or after whitespace
      jsonStr = jsonStr.replace(/^\s*([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/m, '"$1":');
      
      // Pass 3: Keys after opening bracket in array of objects
      jsonStr = jsonStr.replace(/(\[\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');

      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, 2);
      setBody(formatted);
      toast.success('JSON formatted and corrected successfully');
    } catch (err) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  };

  return (
    <BaseCard className="h-full overflow-hidden">
      <div className="section-card-header items-center justify-between">
        <h2 className="text-2xl font-semibold text-text">Manual Test Configuration</h2>
        <BaseButton variant="icon" size="icon" onClick={OnClose}>
          <X size={16} />
        </BaseButton>
      </div>
      <div className="flex flex-col w-full">
          {/* Predefined Tests Selector */}
          {loadingConfigs && (
            <p className="text-xs text-slate-500">Loading predefined configurations...</p>
          )}
          {predefinedConfigs.length > 0 && !loadingConfigs && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row items-center gap-2">
                <label className="flex text-text font-bold text-secondary">
                  Predefined Test Configuration
                </label>
              </div>

              <div className="flex flex-row items-center justify-between w-full gap-4">
                <select
                  onChange={(e) => applyPredefinedConfig(e.target.value)}
                  className="form-select h-fit w-full bg-transparent p-4 rounded-xl border border-border outline-none text-xs text-secondary cursor-pointer"
                >
                  <option value="">Select a saved test...</option>
                  {predefinedConfigs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.isDefault ? '[Default] ' : ''}
                      {c.testName} ({c.method})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Method and Path */}
          <div className="form-row">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="form-select w-fit h-full align-center items-center justify-between text-sm font-bold uppercase"
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
          </div>

          {/* Tabs Panel */}
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
          
          <div className="expandible-content">
            {activeTab === 'params' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2">
                  <p className="form-label mb-0">Query Parameters</p>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueryParams([...queryParams, { key: '', value: '' }])}
                  >
                    + Add Parameter
                  </BaseButton>
                </div>

                {queryParams.length === 0 ? (
                  <p className="text-xs text-muted">No query parameters added</p>
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
                    variant="ghost"
                    size="sm"
                    onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                  >
                    + Add Header
                  </BaseButton>
                </div>

                {headers.length === 0 ? (
                  <p className="text-xs text-muted">No custom headers added</p>
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
                          variant="icon"
                          size="icon"
                          onClick={() => {
                            const copy = [...headers];
                            copy.splice(idx, 1);
                            setHeaders(copy);
                          }}
                        >
                          <X size={16} />
                        </BaseButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="form-label mb-0">Body (JSON)</p>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    onClick={handleFormatJSON}
                  >
                    Format JSON
                  </BaseButton>
                </div>
                {bodyValidationError && (
                  <span className="text-xs text-red-600 block mb-2">{bodyValidationError}</span>
                )}
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
              <div className="space-y-4">
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
    </BaseCard>
  );
}
