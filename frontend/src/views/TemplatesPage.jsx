import React, { useEffect, useState } from 'react';
import TemplateList from '../components/TemplateList.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import TemplateTestView from '../components/TemplateTestView.jsx';
import TestConfigModal from '../components/TestConfigModal.jsx';
import Tooltip from '../components/Tooltip.jsx';

import {
  getTemplates,
  deleteTemplate,
  getCollections,
  createCollection,
  deleteCollection,
} from '../services/apiTemplateService.js';
import { useToast } from '../stores/toastStore.jsx';

export default function TemplatesPage({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showTest, setShowTest] = useState(false);
  const [testTemplate, setTestTemplate] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTemplate, setConfigTemplate] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [templatesData, collectionsData] = await Promise.all([
        getTemplates(),
        getCollections(),
      ]);
      setTemplates(templatesData);
      setCollections(collectionsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Seguro que deseas eliminar "${template.name}"?`)) {
      return;
    }

    setDeleting(template.id);
    try {
      await deleteTemplate(template.id);
      setTemplates(templates.filter((t) => t.id !== template.id));
      toast.success(`Plantilla "${template.name}" eliminada correctamente`);
    } catch (err) {
      toast.error(`No se pudo eliminar la plantilla: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateCollection = async () => {
    const name = window.prompt('Nombre de la nueva colección');
    if (!name || !name.trim()) return;

    try {
      const created = await createCollection({ name: name.trim(), color: '#0ea5e9' });
      setCollections((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Colección "${created.name}" creada correctamente`);
    } catch (err) {
      toast.error(`No se pudo crear la colección: ${err.message}`);
    }
  };

  const handleDeleteCollection = async (collection) => {
    if (
      !window.confirm(`Eliminar coleccion "${collection.name}"? Las APIs quedaran sin asignar.`)
    ) {
      return;
    }

    try {
      await deleteCollection(collection.id);
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
      setTemplates((prev) =>
        prev.map((t) => (t.collectionId === collection.id ? { ...t, collectionId: null } : t))
      );
      if (selectedCollectionId === collection.id) {
        setSelectedCollectionId('all');
      }
      toast.success(`Colección "${collection.name}" eliminada`);
    } catch (err) {
      toast.error(`No se pudo eliminar la colección: ${err.message}`);
    }
  };

  const filteredTemplates =
    selectedCollectionId === 'all'
      ? templates
      : templates.filter((t) => (t.collectionId || '') === selectedCollectionId);

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="w-full p-6 container-max-width mx-auto">
        {loading && <p className="text-lg p-6">Cargando tus APIs...</p>}
        {error && <div className="alert alert-error m-6">Error: {error}</div>}

        {!loading && (
          <div className="mb-4 p-3 border border-border rounded-lg bg-primary">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-semibold text-text">Colecciones</p>
              <button
                type="button"
                onClick={handleCreateCollection}
                className="badge badge-info cursor-pointer"
              >
                + Nueva colección
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setSelectedCollectionId('all')}
                className={`badge cursor-pointer ${selectedCollectionId === 'all' ? 'badge-success' : 'badge-secondary'}`}
              >
                Todas ({templates.length})
              </button>
              {collections.map((col) => {
                const count = templates.filter((t) => t.collectionId === col.id).length;
                return (
                  <div key={col.id} className="flex items-center gap-1">
                    <Tooltip text={col.description || col.name}>
                      <button
                        type="button"
                        onClick={() => setSelectedCollectionId(col.id)}
                        className={`badge cursor-pointer ${selectedCollectionId === col.id ? 'badge-success' : 'badge-secondary'}`}
                      >
                        {col.name} ({count})
                      </button>
                    </Tooltip>
                    <Tooltip text="Eliminar colección" placement="bottom">
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(col)}
                        className="badge badge-warning cursor-pointer"
                      >
                        x
                      </button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <TemplateList
          templates={filteredTemplates}
          collections={collections}
          onSelect={onSelectTemplate}
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
          onManageConfigs={(t) => {
            setConfigTemplate(t);
            setShowConfigModal(true);
          }}
        />

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-panel">
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
        )}

        {showTest && testTemplate && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <TemplateTestView template={testTemplate} OnClose={() => setShowTest(false)} />
            </div>
          </div>
        )}

        {showConfigModal && configTemplate && (
          <TestConfigModal template={configTemplate} onClose={() => setShowConfigModal(false)} />
        )}
      </div>
    </div>
  );
}
