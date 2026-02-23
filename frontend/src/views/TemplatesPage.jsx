import React, { useEffect, useState } from 'react';
import TemplateList from '../components/TemplateList.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import TemplateTestView from '../components/TemplateTestView.jsx';
import '../style.css';

import { getTemplates } from '../services/apiTemplateService.js';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showTest, setShowTest] = useState(false);
  const [testTemplate, setTestTemplate] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 'var(--spacing-2xl) var(--spacing-md)',
        background: 'var(--color-background)',
        minWidth: '100%',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {loading && <p className="text-lg">Loading templates...</p>}
        {error && <div className="alert alert-error">Error: {error}</div>}

        <TemplateList
          templates={templates}
          onEdit={(t) => {
            setEditing(t);
            setShowForm(true);
          }}
          onCreate={() => {
            setEditing(null);
            setShowForm(true);
          }}
          onTest={(t) => {
            setTestTemplate(t);
            setShowTest(true);
          }}
          onRefresh={load}
        />

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <div className="p-4">
                <TemplateForm
                  template={editing}
                  onDone={() => {
                    setShowForm(false);
                    load();
                  }}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            </div>
          </div>
        )}

        {showTest && testTemplate && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <div
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <h3 className="text-lg font-semibold">Testing: {testTemplate.name}</h3>
                <button
                  onClick={() => setShowTest(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
              <div className="p-4 flex flex-col gap-4 w-full">
                <TemplateTestView template={testTemplate} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
