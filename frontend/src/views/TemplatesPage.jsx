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
      setTemplates(templates.filter((t) => t.id !== template.id));
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
    <div style={{ minHeight: '100vh', width: '100%', paddingTop: '2rem' }}>
      <div className="w-full p-6 container-max-width mx-auto">
        {loading && <p className="text-lg p-6">Loading templates...</p>}
        {error && <div className="alert alert-error m-6">Error: {error}</div>}

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
              <div className="p-4">
                <TemplateTestView template={testTemplate} OnClose={() => setShowTest(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
