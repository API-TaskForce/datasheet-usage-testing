import React, { useState, useEffect, useMemo, useRef } from 'react';
import yaml from 'js-yaml';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';
import AuthBadge from './AuthBadge.jsx';
import { createTemplate, updateTemplate } from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';
import { Code, Eye, CheckCircle, XCircle, Upload, X, FileText } from 'lucide-react';

const DEFAULT_DUMMY_CONFIG = {
  quotaMax: 1000,
  rateMax: 60,
  windowModel: 'FIXED_WINDOW',
  windowSeconds: 60,
  cooldownSeconds: 30,
  totalRequests: 80,
};

const DUMMY_DATASHEET = `associatedSaaS: Dummy Weather API
url: https://jsonplaceholder.typicode.com
planReference: DEMO-FREE
type: external-api
coolingPeriod: 30s
capacity:
  - value: 1000
    type: quota
    windowType: FIXED_WINDOW
    quotaResetTime: daily
    autoRecharge: true
    extraCharge: false
maxPower:
  value: 60
  type: rpm
  description: 60 requests per minute
  window: 60s
segmentation:
  - demo-users
  - web-client
`;

function buildDummyTemplateForm() {
  return {
    name: 'Dummy API Demo',
    authMethod: '',
    authCredential: '',
    apiUri: 'https://jsonplaceholder.typicode.com',
    datasheet: DUMMY_DATASHEET,
    status: 'active',
  };
}

export default function TemplateForm({ template = null, onDone, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    authMethod: '',
    authCredential: '',
    apiUri: '',
    datasheet: '',
    status: 'active',
  });
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [isDummyApi, setIsDummyApi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const fileInputRef = useRef(null);
  const manualBackupRef = useRef(null);
  const toast = useToast();

  // Parse datasheet to extract fields
  const datasheetParsed = useMemo(() => {
    if (!form.datasheet || form.datasheet.trim() === '') {
      return { valid: false, data: null, error: null };
    }

    try {
      const parsed = yaml.load(form.datasheet);
      return { valid: true, data: parsed, error: null };
    } catch (err) {
      return { valid: false, data: null, error: err.message };
    }
  }, [form.datasheet]);

  useEffect(() => {
    if (template) {
      setForm({ ...template });
      setRequiresAuth(!!(template.authMethod && template.authMethod.trim()));
      setIsDummyApi(!!template.isDummy);
      // If template has datasheet, show it as uploaded
      if (template.datasheet && template.datasheet.trim()) {
        setUploadedFileName(template.isDummy ? 'dummy-api.yml' : `${template.name || 'template'}.yml`);
      }
    }
  }, [template]);

  const handleChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleDummyToggle = (checked) => {
    if (checked) {
      manualBackupRef.current = {
        form,
        requiresAuth,
        uploadedFileName,
      };

      const dummyForm = buildDummyTemplateForm();
      setForm(dummyForm);
      setRequiresAuth(false);
      setUploadedFileName('dummy-api.yml');
      setIsDummyApi(true);
      toast.info('Dummy API activada con datos preconfigurados');
      return;
    }

    const backup = manualBackupRef.current;
    if (backup) {
      setForm(backup.form);
      setRequiresAuth(backup.requiresAuth);
      setUploadedFileName(backup.uploadedFileName);
    }
    setIsDummyApi(false);
    toast.info('Dummy API desactivada');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith('.yml') && !file.name.endsWith('.yaml')) {
      toast.error('Please upload a .yml or .yaml file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === 'string') {
          // Validate YAML syntax
          yaml.load(content);
          handleChange('datasheet', content);
          setUploadedFileName(file.name);
          toast.success(`File "${file.name}" loaded successfully`);
        }
      } catch (err) {
        toast.error(`Invalid YAML file: ${err.message}`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    handleChange('datasheet', '');
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Datasheet cleared');
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        isDummy: isDummyApi,
        dummyConfig: isDummyApi
          ? (template?.dummyConfig || DEFAULT_DUMMY_CONFIG)
          : null,
      };
      if (template) {
        await updateTemplate(template.id, payload);
        toast.success(`Template "${form.name}" updated successfully`);
      } else {
        await createTemplate(payload);
        toast.success(`Template "${form.name}" created successfully`);
      }
      onDone && onDone();
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to save template: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormatYAML = () => {
    try {
      if (!form.datasheet || form.datasheet.trim() === '') {
        toast.info('No YAML content to format');
        return;
      }

      // Parse YAML to validate and then dump it with proper formatting
      const parsed = yaml.load(form.datasheet);
      const formatted = yaml.dump(parsed, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
        sortKeys: false,
      });

      handleChange('datasheet', formatted);
      toast.success('YAML formatted and validated successfully');
    } catch (err) {
      toast.error(`Invalid YAML: ${err.message}`);
    }
  };

  return (
    <BaseCard>
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <h2 className="text-2xl font-semibold text-text">{template ? 'Edit API' : 'Create API'}</h2>
      </div>

      {/* Error Alert */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Two Column Layout */}
      <div className="flex flex-row w-full h-full gap-8">
        {/* LEFT COLUMN - Input Form */}
        <div className="flex flex-col gap-6 w-full h-full max-w-lg">
          {/* Basic Info - Name & API URL */}
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleDummyToggle(!isDummyApi)}
            >
              <input
                type="checkbox"
                checked={isDummyApi}
                onChange={(e) => handleDummyToggle(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 cursor-pointer"
              />
              <div>
                <span className="text-text font-medium">Crear API Dummy (demo)</span>
                <p className="text-xs text-slate-500">
                  Carga una API ficticia con URL y datasheet preconfigurados para validar renderizado
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label muted">Template Name</label>
              <input
                type="text"
                placeholder="e.g., PostMan API"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label muted">API Base URL</label>
              <input
                type="url"
                placeholder="https://api.example.com/v1"
                value={form.apiUri}
                onChange={(e) => handleChange('apiUri', e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Authentication Section */}
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                if (isDummyApi) return;
                setRequiresAuth(!requiresAuth);
                if (requiresAuth) {
                  handleChange('authMethod', '');
                  handleChange('authCredential', '');
                }
              }}
            >
              <input
                type="checkbox"
                checked={requiresAuth}
                onChange={() => {}}
                disabled={isDummyApi}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="text-text font-medium">
                This API requires authentication
                {isDummyApi ? ' (deshabilitado en modo Dummy)' : ''}
              </span>
            </div>

            {requiresAuth && (
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label muted">Authentication Method</label>
                  <select
                    value={form.authMethod}
                    onChange={(e) => handleChange('authMethod', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select authentication method...</option>
                    <option value="API_TOKEN">API Token</option>
                    <option value="BASIC_AUTH">Basic Auth</option>
                    <option value="BEARER">Bearer Token</option>
                    <option value="RAPID_API">Rapid API</option>
                    <option value="OAUTH2">OAuth2</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label muted">Credential</label>
                  <div className="flex items-center gap-3">
                    <input
                      type={form.showCredential ? 'text' : 'password'}
                      placeholder="Enter your credential securely"
                      value={form.authCredential}
                      onChange={(e) => handleChange('authCredential', e.target.value)}
                      className="form-input flex-1"
                    />
                    <AuthBadge authCredential={form.authCredential} compact={true} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Datasheet YAML */}
          <div className="form-group">
            <label className="form-label muted">API Datasheet (YAML)</label>

            {/* File Upload Area */}
            {!uploadedFileName ? (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yml,.yaml"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="datasheet-file-input"
                />
                <label
                  htmlFor="datasheet-file-input"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload size={40} className="text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">YAML files only (.yml, .yaml)</p>
                  </div>
                </label>
              </div>
            ) : (
              <BaseCard className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-muted" />
                  <div>
                    <p className="text-sm font-medium text-muted">{uploadedFileName}</p>
                    <p className="text-xs text-muted">
                      {form.datasheet.split('\n').length} lines •{' '}
                      {(form.datasheet.length / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <BaseButton
                    variant="icon"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload size={14} />
                  </BaseButton>
                  <BaseButton variant="icon" size="icon" onClick={handleClearFile} type="button">
                    <X size={14} />
                  </BaseButton>
                </div>
              </BaseCard>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-text">API Preview</h3>
          </div>

          <BaseCard>
            <div className="space-y-4">
              {/* Basic Fields */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <PreviewField label="Template Name" value={form.name} />
                  <PreviewField label="API Base URL" value={form.apiUri} />
                  <PreviewField
                    label="Authentication"
                    value={requiresAuth ? form.authMethod || 'Not configured' : 'No authentication'}
                  />
                </div>
              </div>

              <hr className="border-gray-300" />

              {/* Datasheet Extracted Fields */}
              <div className="flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text uppercase tracking-wide">
                    Datasheet Information
                  </h4>
                  {datasheetParsed.valid ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : form.datasheet?.trim() ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : null}
                </div>

                {!form.datasheet?.trim() && (
                  <p className="text-xs text-slate-400 italic">No datasheet provided yet</p>
                )}

                {datasheetParsed.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600 font-mono">{datasheetParsed.error}</p>
                  </div>
                )}

                {datasheetParsed.valid && datasheetParsed.data && (
                  <div className="flex flex-col gap-1 h-full">
                    <PreviewField
                      label="Associated SaaS"
                      value={datasheetParsed.data.associatedSaaS}
                    />
                    <PreviewField label="Product URL" value={datasheetParsed.data.url} />
                    <PreviewField
                      label="Plan Reference"
                      value={datasheetParsed.data.planReference}
                    />
                    <PreviewField label="Type" value={datasheetParsed.data.type} />
                    <PreviewField
                      label="Cooling Period"
                      value={datasheetParsed.data.coolingPeriod}
                    />
                    <div className="flex flex-row gap-2 w-full">
                      {/* Capacity */}
                      {datasheetParsed.data.capacity &&
                        Array.isArray(datasheetParsed.data.capacity) && (
                          <BaseCard className="flex flex-col gap-2 p-4 h-full">
                            <div>
                              <p className="text-xs font-medium text-text">Quota</p>
                            </div>
                            {datasheetParsed.data.capacity.map((cap, idx) => (
                              <div key={idx} className="space-y-1">
                                <PreviewField label="Value" value={cap.value} compact />
                                <PreviewField label="Type" value={cap.type} compact />
                                <PreviewField label="Window Type" value={cap.windowType} compact />
                                <PreviewField
                                  label="Quota Reset"
                                  value={cap.quotaResetTime}
                                  compact
                                />
                                <PreviewField
                                  label="Auto Recharge"
                                  value={cap.autoRecharge}
                                  compact
                                />
                                <PreviewField
                                  label="Extra Charge"
                                  value={cap.extraCharge}
                                  compact
                                />
                              </div>
                            ))}
                          </BaseCard>
                        )}

                      {/* Max Power */}
                      {datasheetParsed.data.maxPower && (
                        <BaseCard className="flex flex-col gap-2 p-4 h-full">
                          <p className="text-xs font-medium text-text">Rate</p>
                          <PreviewField
                            label="Value"
                            value={
                              datasheetParsed.data.maxPower.value || datasheetParsed.data.maxPower
                            }
                            compact
                          />
                          <PreviewField
                            label="Type"
                            value={datasheetParsed.data.maxPower.type}
                            compact
                          />
                          <PreviewField
                            label="Description"
                            value={datasheetParsed.data.maxPower.description}
                            compact
                          />
                        </BaseCard>
                      )}
                    </div>

                    {/* Segmentation */}
                    {datasheetParsed.data.segmentation &&
                      Array.isArray(datasheetParsed.data.segmentation) && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted">Segmentation</p>
                          <div className="pl-3 border-l-2 border-green-300 space-y-1">
                            {datasheetParsed.data.segmentation.map((seg, idx) => (
                              <p key={idx} className="text-xs text-text">
                                {typeof seg === 'string' ? seg : JSON.stringify(seg)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <BaseButton variant="secondary" onClick={onCancel}>
          Cancel
        </BaseButton>
        <BaseButton variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block animate-spin">⏳</span>
              Saving...
            </span>
          ) : template ? (
            'Update Template'
          ) : (
            'Create Template'
          )}
        </BaseButton>
      </div>
    </BaseCard>
  );
}

// Helper component for preview fields
function PreviewField({ label, value, compact = false }) {
  if (!value) return null;

  return (
    <div className={compact ? 'text-xs' : ''}>
      <span className="text-muted font-medium">{label}: </span>
      <span className="text-text">{value}</span>
    </div>
  );
}
