import React, { useState, useEffect } from 'react';
import { HardDrive, RefreshCw, Download, Trash2 } from 'lucide-react';
import { getStorageStats, exportHistory, clearAllHistory } from '../hooks/useTestHistory.js';
import BaseCard from './BaseCard.jsx';
import BaseButton from './BaseButton.jsx';

export default function StorageInfoPanel() {
  const [stats, setStats] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const refreshStats = () => {
    console.log('[StorageInfoPanel] Refreshing storage stats');
    setStats(getStorageStats());
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const handleExport = () => {
    try {
      const exportData = exportHistory();
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-history-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      console.log('[StorageInfoPanel] Export completed');
    } catch (error) {
      console.error('[StorageInfoPanel] Export failed:', error);
    }
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar TODO el historial de tests? Esta acción no se puede deshacer.')) {
      clearAllHistory();
      refreshStats();
      console.log('[StorageInfoPanel] All history cleared');
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <BaseCard className="p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
      >
        <HardDrive size={18} className="text-cyan-400" />
        <h3 className="text-sm font-bold text-text flex-1">Almacenamiento Local</h3>
        <span className="text-xs text-slate-400">{stats.totalTests} tests</span>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-400">Templates</p>
              <p className="font-bold text-text">{stats.templates}</p>
            </div>
            <div>
              <p className="text-slate-400">Total Tests</p>
              <p className="font-bold text-text">{stats.totalTests}</p>
            </div>
            <div>
              <p className="text-slate-400">Tamaño</p>
              <p className="font-bold text-cyan-400">{stats.totalSize}</p>
            </div>
            <div>
              <p className="text-slate-400">Cuota Max</p>
              <p className="font-bold text-slate-300">{stats.maxQuota}</p>
            </div>
          </div>

          {stats.byTemplate.length > 0 && (
            <div className="border-t border-slate-600 pt-3">
              <p className="text-xs font-bold text-slate-300 mb-2">Por Template:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {stats.byTemplate.map((item) => (
                  <div key={item.templateId} className="text-xs text-slate-400 p-2 bg-slate-900/30 rounded">
                    <p className="font-mono text-cyan-400">{item.templateId}</p>
                    <p className="text-slate-500">{item.testCount} tests • {item.size}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-600">
            <BaseButton
              onClick={refreshStats}
              className="!p-2 !text-xs flex-1"
            >
              <RefreshCw size={12} />
              Actualizar
            </BaseButton>
            <BaseButton
              onClick={handleExport}
              className="!p-2 !text-xs flex-1"
            >
              <Download size={12} />
              Exportar
            </BaseButton>
            <BaseButton
              onClick={handleClear}
              className="!p-2 !text-xs flex-1 !bg-red-500/20 !text-red-400 hover:!bg-red-500/30"
            >
              <Trash2 size={12} />
              Limpiar
            </BaseButton>
          </div>
        </div>
      )}
    </BaseCard>
  );
}
