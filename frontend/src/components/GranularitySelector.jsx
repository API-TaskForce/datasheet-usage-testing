import React from 'react';
import { Clock } from 'lucide-react';

const GRANULARITY_OPTIONS = [
  { value: '30s', label: '30s' },
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '1d', label: '1 day' },
];

export default function GranularitySelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Clock size={16} className="text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 bg-primary border border-accent rounded-lg text-sm text-text cursor-pointer hover:border-secondary transition-colors"
      >
        {GRANULARITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { GRANULARITY_OPTIONS };
