import React, { useState } from 'react';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';
import AuthBadge from './AuthBadge.jsx';
import { Pencil, PencilLine, Play, TestTube2, Trash2, MoreVertical, Settings2 } from 'lucide-react';

export default function TemplateList({
  templates = [],
  onSelect,
  onEdit,
  onCreate,
  onTest,
  onDelete,
  onRefresh,
  onManageConfigs,
}) {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">API Templates</h2>
        <BaseButton variant="primary" onClick={onCreate} size="md">
          + New API
        </BaseButton>
      </div>

      <div className="flex flex-col gap-4">
        {templates.map((t) => (
          <BaseCard key={t.id}>
            <div className="flex items-start justify-between mb-3 border-b border-red-500 p-3">
              <div className="flex flex-row items-center justify-between mb-3 gap-4">
                <h3 className="font-bold text-lg">{t.name}</h3>
                <p className="flex text-sm text-gray-600 bg-gray-100 p-2 rounded-xl text-center">
                  {t.apiUri}
                </p>
              </div>
              <span
                className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-warning'}`}
              >
                {t.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-start justify-between mb-3">
              <AuthBadge authMethod={t.authMethod} authCredential={t.authCredential} />
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 justify-between items-center">
              <div className="flex gap-2">
                <BaseButton size="sm" variant="secondary" onClick={() => onSelect(t)}>
                  <TestTube2 size={16} /> Dashboard
                </BaseButton>
                <BaseButton size="sm" variant="primary" onClick={() => onManageConfigs(t)}>
                  <Settings2 size={16} /> Predefined Tests
                </BaseButton>
              </div>

              <div className="relative">
                <button
                  onClick={() => toggleMenu(t.id)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical size={20} className="text-gray-500" />
                </button>

                {openMenu === t.id && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-2 z-10 animate-fade-in text-slate-700 font-medium">
                    <button
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700"
                      onClick={() => {
                        onEdit(t);
                        setOpenMenu(null);
                      }}
                    >
                      <Pencil size={14} /> Edit Template
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-red-600"
                      onClick={() => {
                        onDelete(t);
                        setOpenMenu(null);
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </BaseCard>
        ))}
      </div>
    </>
  );
}
