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
    <div className="stat-card flex items-center gap-4 px-6">
      <div className='text-muted'>{icon}</div>
      <div className="flex flex-row items-center justify-between w-full">
        <p className="text-secondary">{title}</p>
        <p className={`badge badge-secondary ${color}`}>{value}</p>
      </div>
    </div>
  );
}
