import React, { useState } from 'react';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import Tooltip from './Tooltip.jsx';

export default function ApiTemplateActionsMenu({ template, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Tooltip text="Más opciones" placement="left">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <MoreVertical size={20} className="text-gray-500" />
        </button>
      </Tooltip>

      {open && (
        <div className="absolute bottom-2 right-0 mb-2 w-48 bg-white shadow-xl rounded-lg animate-fade-in text-slate-700 font-medium">
          <button
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700"
            onClick={() => {
              onEdit(template);
              setOpen(false);
            }}
          >
            <Pencil size={14} /> Editar plantilla
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-red-600"
            onClick={() => {
              onDelete(template);
              setOpen(false);
            }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}