import React, { useEffect, useState } from 'react';
import TemplateList from '../components/TemplateList.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import TemplateTestView from '../components/TemplateTestView.jsx';

import { getTemplates, deleteTemplate } from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showTest, setShowTest] = useState(false);
  const [testTemplate, setTestTemplate] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

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

  const handleDelete = async (template) => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    setDeleting(template.id);
    try {
      await deleteTemplate(template.id);
      setTemplates(templates.filter(t => t.id !== template.id));
      toast.success(`Template "${template.name}" deleted successfully`);
    } catch (err) {
      toast.error(`Failed to delete template: ${err.message}`);
    } finally {
      setDeleting(null);
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
          onDelete={handleDelete}
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
                className="p-4 flex items-center justify-between border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h3 className="text-lg font-semibold">Testing: {testTemplate.name}</h3>
                <button
                  onClick={() => setShowTest(false)}
                  className="text-xl font-normal bg-none border-0 p-0 cursor-pointer" 
                  style={{ color: 'var(--color-text)' }}
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
