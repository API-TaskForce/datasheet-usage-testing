import React from 'react';
import BaseCard from '../BaseCard.jsx';
import AutoRefreshSelector from './AutoRefreshSelector.jsx';
import { useToast } from '../../stores/toastStore.jsx';
import BaseButton from '../BaseButton.jsx';

export default function SafeModeAutoRefreshCard({
  safeModeEnabled,
  onSafeModeChange,
  safeRequestCount,
  running,
  autoRefreshEnabled,
  refreshIntervalSeconds,
  onToggleAutoRefresh,
  onRefreshIntervalChange,
  loadingDefaultConfig,
}) {
  const toast = useToast();

  const handleSafeModeToggle = () => {
    const newValue = !safeModeEnabled;
    onSafeModeChange(newValue);
    if (newValue) {
      toast.info('Modo Seguro activado, las peticiones se regularán para evitar errores 4XX');
    }
  };

  return (
    <div className="flex flex-row gap-4 items-center justify-start w-1/2 p-4">
      <BaseButton
        onClick={handleSafeModeToggle}
        disabled={running}
        variant={safeModeEnabled ? 'primary' : 'secondary'}
        className={running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      >
        {safeModeEnabled ? 'Regulación Segura' : 'Regulación Normal'}
      </BaseButton>
      <AutoRefreshSelector
        enabled={autoRefreshEnabled}
        interval={refreshIntervalSeconds}
        onToggle={onToggleAutoRefresh}
        onIntervalChange={onRefreshIntervalChange}
        disabled={loadingDefaultConfig}
      />
    </div>
  );
}
