import React from 'react';

const TABS = [
  { key: 'charts', label: 'Graficas' },
  { key: 'realtime', label: 'Peticiones en tiempo real' },
  { key: 'cooldown', label: 'Eventos de cooldown' },
  { key: 'storage', label: 'Almacenamiento local' },
];

export default function ApiDashboardTabs({ activeTab, onChange }) {
  return (
    <div className="container-max-width mx-auto px-6">
      <div className="flex flex-wrap gap-2 border-b border-secondary-lighter pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-secondary text-white'
                : 'bg-primary text-text hover:bg-secondary/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
