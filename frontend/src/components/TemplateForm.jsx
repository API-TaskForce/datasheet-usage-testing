import React, { useState, useEffect } from 'react';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';
import AuthBadge from './AuthBadge.jsx';
import { createTemplate, updateTemplate } from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (template) {
      setForm({ ...template });
      setRequiresAuth(!!(template.authMethod && template.authMethod.trim()));
    }
  }, [template]);

  const handleChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (template) {
        await updateTemplate(template.id, form);
        toast.success(`Template "${form.name}" updated successfully`);
      } else {
        await createTemplate(form);
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

  return (
    <BaseCard>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-semibold text-text">
            {template ? 'Edit API' : 'Create API'}
          </h2>
        </div>

        {/* Error Alert */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Basic Info - Name & API URL */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="form-group flex-1">
              <label className="form-label muted">Template Name</label>
              <input
                type="text"
                placeholder="e.g., PostMan API"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group flex-1">
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
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setRequiresAuth(!requiresAuth);
                if (requiresAuth) {
                  handleChange('authMethod', '');
                  handleChange('authCredential', '');
                }
              }}>
              <input
                type="checkbox"
                checked={requiresAuth}
                onChange={() => {}}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="text-text font-medium">This API requires authentication</span>
            </div>

            {requiresAuth && (
              <div className="flex flex-col md:flex-row gap-6 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="form-group flex-1">
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
                    <option value="OAUTH2">OAuth2</option>
                  </select>
                </div>

                <div className="form-group flex-1">
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
            <textarea
              value={form.datasheet}
              onChange={(e) => handleChange('datasheet', e.target.value)}
              placeholder="endpoints:&#10;  - path: /users&#10;    method: GET&#10;    description: List all users"
              rows={18}
              className="form-textarea font-mono text-sm"
            />
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
            ) : template ? 'Update Template' : 'Create Template'}
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  );
}
