import React from 'react';

/**
 * ProgressBar - Displays a progress bar with label, current/max values, and unit
 * @param {string} label - The label for the progress bar
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {string} unit - Unit label (e.g., "reqs", "success")
 * @param {string} color - Tailwind background color/gradient class for the progress bar
 */
export default function ProgressBar({ label, current, max, unit, color }) {
  const percentage = Math.min((current / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex flex-row align-center justify-between items-center text-sm gap-4">
        <span className="text-xs">{label}</span>
        <span className="text-xs text-text-muted">
          {current} / {max} {unit}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`h-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
