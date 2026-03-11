import React from 'react';
import BaseCard from '../../BaseCard.jsx';
import UPlotChart from '../../UPlotChart.jsx';

export default function RealtimeStatusChartCard({ chartData }) {
  const safeX = chartData?.[0] || [Math.floor(Date.now() / 1000)];
  const safeSuccess = chartData?.[1] || [0];
  const safeRate = chartData?.[2] || [0];
  const safeError = chartData?.[3] || [0];
  const maxY = Math.max(1, ...safeSuccess, ...safeRate, ...safeError);

  const options = {
    title: 'Estado en Tiempo Real (success/rate/error)',
    height: 260,
    cursor: {
      drag: {
        x: true,
        y: false,
      },
    },
    scales: {
      x: {
        auto: true,
      },
      y: { auto: false, range: [0, maxY * 1.25] },
    },
    axes: [
      {
        label: 'Tiempo',
        values: (u, vals) =>
          vals.map((v) =>
            new Date(v * 1000).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          ),
      },
      { label: 'Peticiones', side: 1 },
    ],
    series: [
      { label: 'Tiempo' },
      { label: 'Success', stroke: '#10b981', width: 2 },
      { label: 'Rate Limited', stroke: '#f59e0b', width: 2 },
      { label: 'Error', stroke: '#ef4444', width: 2 },
    ],
  };

  return (
    <BaseCard className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 px-2 pt-2">
        <h3 className="text-lg font-bold mb-0">Estado en Tiempo Real</h3>
      </div>
      <div className="p-2 flex-1">
        <UPlotChart options={options} data={chartData} />
      </div>
    </BaseCard>
  );
}
