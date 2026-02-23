import React, { useEffect, useRef } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function QuotaChart({ rateLimit = {}, quotaUsed = 0, quotaTotal = 100 }) {
  const chartRef = useRef(null);

  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);
  const limitReached = quotaRemaining === 0;

  const data = {
    labels: [`Used (${quotaUsed})`, `Remaining (${quotaRemaining})`],
    datasets: [
      {
        data: [quotaUsed, quotaRemaining],
        backgroundColor: [
          limitReached ? '#dc2626' : '#3b82f6',
          '#d1d5db',
        ],
        borderColor: ['#fff', '#fff'],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            return `${ctx.label}: ${ctx.parsed}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 w-full">
      <h3 className="font-bold text-lg mb-4">Quota Usage</h3>
      <div className="relative h-64 mb-4 justify-center flex">
        <Pie data={data} options={options} ref={chartRef} />
      </div>

      {rateLimit && Object.keys(rateLimit).length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">Rate Limit Headers</h4>
          <div className="space-y-1 text-sm">
            {Object.entries(rateLimit).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600">{key}:</span>
                <span className="font-mono text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
