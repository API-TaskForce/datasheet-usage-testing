import React, { useMemo, useState, useEffect } from 'react';
import BaseCard from '../components/BaseCard.jsx';
import BaseButton from '../components/BaseButton.jsx';
import ApiTemplateCard from '../components/ApiTemplateCard.jsx';
import CollectionForm from '../components/CollectionForm.jsx';
import TemplateForm from '../components/TemplateForm.jsx';
import TestConfigModal from '../components/TestConfigModal.jsx';
import { buildTemplateCoverUrl } from '../utils/templateCover.js';
import {
  getTemplates,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  deleteTemplate,
  updateTemplate,
} from '../services/apiTemplateService.js';
import ApiTemplateSelectorModal from '../components/ApiTemplateSelectorModal.jsx';
import { useToast } from '../stores/toastStore.jsx';

export default function CollectionsPage({ onSelectTemplate }) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [collections, setCollections] = useState([]);
  const [openCollectionIds, setOpenCollectionIds] = useState([]);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [savingCollectionForm, setSavingCollectionForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormCollectionId, setTemplateFormCollectionId] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTemplate, setConfigTemplate] = useState(null);
  const [showSelectorModalFor, setShowSelectorModalFor] = useState(null);
  const [backfillingImages, setBackfillingImages] = useState(false);
  const toast = useToast();

  const ensureTemplateImages = async (templatesToCheck) => {
    const pending = (templatesToCheck || [])
      .filter((template) => {
        const imageUrl = String(template?.imageUrl || '').trim();
        return !imageUrl || imageUrl.includes('logo.clearbit.com/');
      })
      .map((template) => {
        const inferred = buildTemplateCoverUrl(template);
        const current = String(template?.imageUrl || '').trim();
        if (!inferred || inferred === current) return null;

        return updateTemplate(template.id, {
          ...template,
          imageUrl: inferred,
        });
      })
      .filter(Boolean);

    if (pending.length === 0) return false;

    setBackfillingImages(true);
    try {
      await Promise.allSettled(pending);
      return true;
    } finally {
      setBackfillingImages(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, collectionsData] = await Promise.all([getTemplates(), getCollections()]);
      const normalizedTemplates = templatesData || [];
      const normalizedCollections = collectionsData || [];

      setTemplates(normalizedTemplates);
      setCollections(normalizedCollections);

      const imageBackfilled = await ensureTemplateImages(normalizedTemplates);
      if (imageBackfilled) {
        const refreshedTemplates = await getTemplates();
        setTemplates(refreshedTemplates || []);
      }

      setOpenCollectionIds((prev) =>
        prev.filter((id) => normalizedCollections.some((c) => c.id === id))
      );
    } catch (err) {
      toast.error(`Error cargando colecciones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const templatesByCollection = useMemo(() => {
    const map = {};
    collections.forEach((c) => {
      map[c.id] = templates
        .filter((t) => (t.collectionId || null) === c.id)
        .sort((a, b) => {
          const ao = Number.isFinite(a?.collectionOrder) ? a.collectionOrder : Number.MAX_SAFE_INTEGER;
          const bo = Number.isFinite(b?.collectionOrder) ? b.collectionOrder : Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return String(a?.name || '').localeCompare(String(b?.name || ''));
        });
    });
    return map;
  }, [templates, collections]);

  const handleCollectionSubmit = async (payload) => {
    setSavingCollectionForm(true);
    try {
      if (editingCollection) {
        const updated = await updateCollection(editingCollection.id, payload);
        setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Coleccion actualizada');
      } else {
        const created = await createCollection(payload);
        setCollections((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setOpenCollectionIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
        toast.success('Coleccion creada');
      }

      setShowCollectionForm(false);
      setEditingCollection(null);
    } catch (err) {
      toast.error(`No se pudo guardar la coleccion: ${err.message}`);
    } finally {
      setSavingCollectionForm(false);
    }
  };

  const handleDeleteCollection = async (collection) => {
    if (!window.confirm(`Eliminar coleccion "${collection.name}"? Las APIs quedaran sin coleccion.`)) {
      return;
    }

    try {
      await deleteCollection(collection.id);
      const nextCollections = collections.filter((c) => c.id !== collection.id);
      setCollections(nextCollections);
      setOpenCollectionIds((prev) => prev.filter((id) => id !== collection.id));
      setTemplates((prev) =>
        prev.map((t) => (t.collectionId === collection.id ? { ...t, collectionId: null } : t))
      );

      toast.success('Coleccion eliminada');
    } catch (err) {
      toast.error(`No se pudo eliminar la coleccion: ${err.message}`);
    }
  };

  const handleTemplateCreated = async () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setTemplateFormCollectionId('');
    await loadData();
  };

  const handleDeleteTemplate = async (template) => {
    if (!template?.id) return;
    if (!window.confirm(`Eliminar API "${template.name}"?`)) return;

    try {
      await deleteTemplate(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      toast.success('API eliminada');
    } catch (err) {
      toast.error(`No se pudo eliminar la API: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-6 container-max-width mx-auto">
        <p className="text-lg">Cargando colecciones...</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 container-max-width mx-auto space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold">Colecciones</h2>
          {backfillingImages && (
            <p className="text-xs text-slate-400 mt-1">Completando caratulas faltantes...</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <BaseButton variant="secondary" onClick={loadData}>
            Refrescar
          </BaseButton>
          <BaseButton
            variant="primary"
            onClick={() => {
              setEditingCollection(null);
              setShowCollectionForm(true);
            }}
          >
            + Nueva coleccion
          </BaseButton>
        </div>
      </div>

      {collections.length === 0 ? (
        <BaseCard>
          <div className="p-6 text-sm text-slate-400">No hay colecciones creadas todavía.</div>
        </BaseCard>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => {
            const apis = templatesByCollection[collection.id] || [];
            const isOpen = openCollectionIds.includes(collection.id);
            return (
              <BaseCard key={collection.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between cursor-pointer p-4 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setOpenCollectionIds((prev) =>
                      prev.includes(collection.id)
                        ? prev.filter((id) => id !== collection.id)
                        : [...prev, collection.id]
                    );
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: collection.color || '#0ea5e9' }}
                    />
                    <h3 className="text-lg font-bold text-text truncate">{collection.name}</h3>
                    <span className="badge badge-info">{apis.length} APIs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BaseButton
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSelectorModalFor(collection);
                      }}
                    >
                      + Nueva API en colección
                    </BaseButton>
                    <BaseButton
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCollection(collection);
                        setShowCollectionForm(true);
                      }}
                    >
                      Editar
                    </BaseButton>
                    <BaseButton
                      size="sm"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(collection);
                      }}
                    >
                      Eliminar
                    </BaseButton>
                  </div>
                </div>
                {isOpen && (
                  <div className="p-4 border-t border-border bg-slate-50">
                    {apis.length === 0 ? (
                      <div className="p-4 text-sm text-slate-400">
                        Esta colección no tiene APIs aún. Usa "Nueva API en colección" para agregar una.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {apis.map((template) => {
                          return (
                            <ApiTemplateCard
                              key={template.id}
                              template={template}
                              className="overflow-hidden"
                              showCover
                              coverFallbackText={template.name || 'API'}
                              onDashboard={onSelectTemplate}
                              onManageConfigs={(tpl) => {
                                setConfigTemplate(tpl);
                                setShowConfigModal(true);
                              }}
                              onEdit={(tpl) => {
                                setEditingTemplate(tpl);
                                setTemplateFormCollectionId(String(tpl?.collectionId || ''));
                                setShowTemplateForm(true);
                              }}
                              onDelete={handleDeleteTemplate}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </BaseCard>
            );
          })}
        </div>
      )}

      {showCollectionForm && (
        <div className="modal-overlay z-50" onClick={() => setShowCollectionForm(false)}>
          <div className="modal-panel max-w-xl" onClick={(e) => e.stopPropagation()}>
            <CollectionForm
              collection={editingCollection}
              onSubmit={handleCollectionSubmit}
              onCancel={() => {
                setShowCollectionForm(false);
                setEditingCollection(null);
              }}
              saving={savingCollectionForm}
            />
          </div>
        </div>
      )}

      {showTemplateForm && (
        <div className="modal-overlay z-50" onClick={() => setShowTemplateForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <TemplateForm
                template={editingTemplate}
                initialCollectionId={templateFormCollectionId}
                onDone={handleTemplateCreated}
                onCancel={() => {
                  setShowTemplateForm(false);
                  setEditingTemplate(null);
                  setTemplateFormCollectionId('');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showSelectorModalFor && (
        <ApiTemplateSelectorModal
          templates={templates.filter((t) => !t.collectionId || t.collectionId === showSelectorModalFor.id)}
          collection={showSelectorModalFor}
          onCreateNew={() => {
            setShowSelectorModalFor(null);
            setEditingTemplate(null);
            setTemplateFormCollectionId(String(showSelectorModalFor.id));
            setShowTemplateForm(true);
          }}
          onAddToCollection={async (ids) => {
            setShowSelectorModalFor(null);
            await Promise.all(
              ids.map((id) => {
                const template = templates.find((t) => t.id === id);
                if (!template) return Promise.resolve();

                return updateTemplate(id, {
                  ...template,
                  collectionId: showSelectorModalFor.id,
                });
              })
            );
            await loadData();
          }}
          onClose={() => setShowSelectorModalFor(null)}
        />
      )}

      {showConfigModal && configTemplate && (
        <TestConfigModal template={configTemplate} onClose={() => setShowConfigModal(false)} />
      )}
    </div>
  );
}
