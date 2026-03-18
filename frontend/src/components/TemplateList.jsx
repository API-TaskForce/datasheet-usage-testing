import React from 'react';
import BaseButton from './BaseButton.jsx';
import ApiTemplateCard from './ApiTemplateCard.jsx';

export default function TemplateList({
  templates = [],
  collections = [],
  onSelect,
  onEdit,
  onCreate,
  onTest,
  onDelete,
  onRefresh,
  onManageConfigs,
}) {
  const collectionMap = collections.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">APIs</h2>
        <BaseButton variant="primary" onClick={onCreate} size="md">
          + Nueva API
        </BaseButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t) => (
          <ApiTemplateCard
            key={t.id}
            template={t}
            className="overflow-hidden"
            collectionName={collectionMap[t.collectionId]?.name || null}
            onDashboard={onSelect}
            onManageConfigs={onManageConfigs}
            onEdit={onEdit}
            onDelete={onDelete}
            showAuthBadge
          />
        ))}
      </div>
    </>
  );
}
