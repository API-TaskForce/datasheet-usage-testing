import React from 'react';

/**
 * StatCard - Displays a statistic with an icon and label
 * @param {string} title - The label for the statistic
 * @param {string|number} value - The value to display
 * @param {React.ReactNode} icon - Icon component to display
 * @param {string} color - Tailwind color class for the value text
 */
export default function StatCard({ title, value, icon, color }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className={'badge badge-accent'}>{icon}</div>
      <div>
        <p className="text-secondary">{title}</p>
        <p className={`font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}
