import React from 'react';
import { Play, Pause } from 'lucide-react';
import BaseButton from '../BaseButton';

/**
 * AutoRefreshSelector - Control for automatic test execution at intervals
 * @param {boolean} enabled - Whether auto-refresh is currently enabled
 * @param {number} interval - Current interval in seconds (5, 15, 30, 60, 120, 300)
 * @param {Function} onToggle - Callback when enable/disable is toggled
 * @param {Function} onIntervalChange - Callback when interval is changed
 * @param {boolean} disabled - Whether the control should be disabled (e.g., during manual test)
 */
export default function AutoRefreshSelector({ 
  enabled, 
  interval, 
  onToggle, 
  onIntervalChange,
  disabled = false 
}) {
  const intervalOptions = [
    { value: 5, label: '5s' },
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1min' },
    { value: 120, label: '2min' },
    { value: 300, label: '5min' },
  ];

  return (
    <div className="flex items-center gap-2">
      <BaseButton
        onClick={onToggle}
        disabled={disabled}
        variant={enabled ? 'background' : 'primary'}
      >{enabled ? <><Pause size={16} /> Detener</> : <><Play size={16} /> Iniciar</>}
      </BaseButton>

      <select
        value={interval}
        onChange={(e) => onIntervalChange(Number(e.target.value))}
        disabled={disabled || !enabled}
        className={`px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-text border border-border focus:border-secondary focus:outline-none transition-all ${
          disabled || !enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-secondary/10'
        }`}
      >
        {intervalOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {enabled && (
        <span className="badge badge-success">
          ● En ejecución
        </span>
      )}
    </div>
  );
}
