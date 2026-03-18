import React, { useEffect, useState } from 'react';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';

const DEFAULT_FORM = {
  name: '',
  description: '',
  color: '#0ea5e9',
};

export default function CollectionForm({ collection = null, onSubmit, onCancel, saving = false }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (collection) {
      setForm({
        name: collection.name || '',
        description: collection.description || '',
        color: collection.color || '#0ea5e9',
      });
      return;
    }

    setForm(DEFAULT_FORM);
  }, [collection]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({
      name: String(form.name || '').trim(),
      description: String(form.description || '').trim(),
      color: String(form.color || '').trim() || '#0ea5e9',
    });
  };

  return (
    <BaseCard>
      <form onSubmit={handleSubmit} className="p-3 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-text">
            {collection ? 'Editar colección' : 'Crear colección'}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="form-group">
            <label className="form-label muted">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="form-input"
              placeholder="Ej: APIs Weather"
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div className="form-group">
            <label className="form-label muted">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="form-input"
              rows={3}
              maxLength={240}
              placeholder="Opcional"
            />
          </div>

          <div className="form-group">
            <label className="form-label muted">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="h-10 w-16 rounded border border-border bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="form-input"
                placeholder="#0ea5e9"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <BaseButton type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </BaseButton>
          <BaseButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : collection ? 'Guardar cambios' : 'Crear colección'}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  );
}
