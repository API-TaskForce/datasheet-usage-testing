import React from 'react';

/**
 * DonutChart - Displays a circular progress chart (donut style)
 * @param {string} label - The label for the chart
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 */
export default function DonutChart({ label, value, max }) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);
  const radius = 48;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg height={radius * 2} width={radius * 2} className="rounded-full bg-transparent">
        <circle
          stroke="#e6eef6"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#06b6d4"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-black text-text">
          {value} / {max}
        </p>
      </div>
    </div>
  );
}
