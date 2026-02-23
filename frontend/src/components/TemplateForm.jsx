import React, { useState, useEffect } from 'react';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';
import AuthBadge from './AuthBadge.jsx';
import { createTemplate, updateTemplate } from '../services/apiTemplateService.js';

export default function TemplateForm({ template = null, onDone, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    authMethod: '',
    authCredential: '',
    apiUri: '',
    datasheet: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (template) setForm({ ...template });
  }, [template]);

  const handleChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (template) {
        await updateTemplate(template.id, form);
      } else {
        await createTemplate(form);
      }
      onDone && onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseCard>
      <div className="">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-row md:flex-row gap-4">
            <div className="form-group">
              <label className="form-label muted">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label muted">Auth Method</label>
              <select
                value={form.authMethod}
                onChange={(e) => handleChange('authMethod', e.target.value)}
                className="form-select"
              >
                <option value="">Select...</option>
                <option value="API_TOKEN">API Token</option>
                <option value="BASIC_AUTH">Basic</option>
                <option value="BEARER">Bearer</option>
                <option value="OAUTH2">OAuth2</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label muted">Auth Credential</label>
              <div className="flex items-center gap-2">
                <input
                  type={form.showCredential ? 'text' : 'password'}
                  value={form.authCredential}
                  onChange={(e) => handleChange('authCredential', e.target.value)}
                  className="form-input flex-1"
                />
                <AuthBadge authCredential={form.authCredential} compact={true} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label muted">API URL</label>
              <input
                type="url"
                value={form.apiUri}
                onChange={(e) => handleChange('apiUri', e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group ">
            <label className="form-label muted">Datasheet (YAML)</label>
            <textarea
              value={form.datasheet}
              onChange={(e) => handleChange('datasheet', e.target.value)}
              rows={16}
              className="form-textarea"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <BaseButton variant="secondary" onClick={onCancel}>
            Cancel
          </BaseButton>
          <BaseButton variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving...' : template ? 'Update' : 'Create'}
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  );
}
