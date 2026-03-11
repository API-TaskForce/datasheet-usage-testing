import React, { useMemo } from 'react';
import uPlot from 'uplot';
import BaseCard from '../../BaseCard.jsx';
import UPlotChart from '../../UPlotChart.jsx';

const TIME_SCALE_OPTIONS = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: 'all', label: 'Todo' },
];

export default function HistoricalInstantChartCard({
  trafficChartData,
  trafficTimeScale,
  onTrafficTimeScaleChange,
}) {
  const safeData = trafficChartData?.data || [
    [Math.floor(Date.now() / 1000)],
    [null],
    [0],
    [null],
    [null],
  ];
  const windowSeconds = trafficChartData?.windowSeconds || 30;

  const options = useMemo(
    () => ({
      height: 260,
      cursor: { drag: { x: true, y: false } },
      autoScaleSeriesIndices: [1, 2],
      autoScalePadding: 1.25,
      scales: {
        x: { auto: true },
        y: { auto: true },
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
        {
          label: 'Peticiones instantaneas',
          stroke: '#22c55e',
          fill: 'rgba(34,197,94,0.40)',
          width: 1,
          points: { show: false },
          paths: uPlot.paths.bars({ size: [0.7, 60], align: 1 }),
        },
        {
          label: 'Trafico de peticiones',
          stroke: '#2563eb',
          width: 3,
        },
        {
          label: 'Example rate limit',
          stroke: '#ef4444',
          width: 2,
          dash: [8, 4],
          points: { show: false },
        },
        {
          label: 'Cooldown / Rate Limitado',
          stroke: '#f87171',
          width: 0,
          fill: 'rgba(248,113,113,0.20)',
          points: { show: false },
        },
      ],
    }),
    [windowSeconds]
  );

  return (
    <BaseCard className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 px-2 pt-2">
        <h3 className="text-lg font-bold mb-0">Tráfico de Peticiones</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Escala tiempo:</label>
          <select
            value={trafficTimeScale || '1h'}
            onChange={(e) => onTrafficTimeScaleChange?.(e.target.value)}
            className="form-select !py-1 !px-2 !text-xs min-w-[90px]"
          >
            {TIME_SCALE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="px-2 -mt-1 mb-1 text-xs text-slate-400">
        Línea azul = tráfico · Barras verdes = instantáneas · Rojo = rate limit · Ventana {windowSeconds}s
      </div>
      <div className="p-2 flex-1">
        <UPlotChart options={options} data={safeData} />
      </div>
    </BaseCard>
  );
}
