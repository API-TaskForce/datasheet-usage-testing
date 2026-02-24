import React from 'react';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';
import AuthBadge from './AuthBadge.jsx';
import { Pencil, PencilLine, TestTube2, Trash2 } from 'lucide-react';
export default function TemplateList({ templates = [], onEdit, onCreate, onTest, onDelete, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">API Templates</h2>
        <BaseButton variant="primary" onClick={onCreate} size='lg'>
          + New API
        </BaseButton>
      </div>

      <div className="flex flex-col gap-4">
        {templates.map((t) => (
          <BaseCard key={t.id}>
            <div className="flex items-start justify-between mb-3 border-b border-red-500 p-3">
              <div className='flex flex-row items-center justify-between mb-3 gap-4'>
                <h3 className="font-bold text-lg">{t.name}</h3>
                <p className="flex text-sm text-gray-600 bg-gray-100 p-2 rounded-xl text-center">{t.apiUri}</p>
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
            <div
              className="flex gap-2 mt-4 pt-4 border-t border-gray-200"
            >
              <BaseButton size="sm" variant="secondary" onClick={() => onEdit(t)}>
                <Pencil size={16} /> Edit
              </BaseButton>
              <BaseButton size="sm" variant="success" onClick={() => onTest(t)}>
                <TestTube2 size={16} /> Test
              </BaseButton>
              <BaseButton size="sm" variant="primary" onClick={() => onDelete(t)}>
                <Trash2 size={16} /> Delete
              </BaseButton>
            </div>
          </BaseCard>
        ))}
      </div>
    </div>
  );
}
