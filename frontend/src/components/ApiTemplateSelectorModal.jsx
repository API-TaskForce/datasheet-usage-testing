import React, { useState } from 'react';
import BaseButton from './BaseButton.jsx';

export default function ApiTemplateSelectorModal({
  templates = [],
  onCreateNew,
  onAddToCollection,
  onClose,
  collection,
}) {
  const [selected, setSelected] = useState([]);

  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (selected.length > 0) {
      onAddToCollection(selected);
    }
  };

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div className="modal-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <h2 className="text-xl font-bold mb-2">Añadir APIs a "{collection?.name}"</h2>
          {templates.length === 0 ? (
            <div className="space-y-4">
              <p className="text-slate-500">No existen APIs templates aún.</p>
              <BaseButton variant="primary" onClick={onCreateNew}>
                Crear nueva API Template
              </BaseButton>
            </div>
          ) : (
            <>
              <p className="text-slate-500 mb-3">Selecciona una o varias APIs para añadir a la colección.</p>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto mb-4 border border-border rounded-lg p-2 bg-bg">
                {templates.map((t) => (
                  <label
                    key={t.id}
                    className="flex flex-row items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(t.id)}
                      onChange={() => handleToggle(t.id)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="font-medium text-text flex-1">{t.name}</span>
                    <span className="badge badge-secondary text-xs truncate max-w-40">{t.apiUri}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <BaseButton variant="secondary" onClick={onClose}>Cancelar</BaseButton>
                <BaseButton variant="primary" onClick={handleAdd} disabled={selected.length === 0}>
                  Añadir a colección
                </BaseButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
