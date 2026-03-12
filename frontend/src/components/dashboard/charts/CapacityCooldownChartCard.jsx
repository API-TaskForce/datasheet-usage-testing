import React from 'react';
import BaseCard from '../../BaseCard.jsx';
import UPlotChart from '../../UPlotChart.jsx';

export default function CapacityCooldownChartCard({
  capacityViewInterval,
  onCapacityViewIntervalChange,
  apiLimits,
  capacityResults,
  capacityChartData,
  capacityCooldownOpts,
}) {
  return (
    <BaseCard className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold mb-0">Capacidad / Cuota con Cooldown 4XX</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Intervalo:</label>
          <select
            value={capacityViewInterval}
            onChange={(e) => onCapacityViewIntervalChange(e.target.value)}
            className="form-select !py-1 !px-2 !text-xs min-w-[90px]"
          >
            <option value="auto">Auto</option>
            <option value="5">5s</option>
            <option value="15">15s</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
            <option value="120">120s</option>
            <option value="300">300s</option>
          </select>
          <span className="badge badge-info text-xs">
            {apiLimits.windowModel === 'UNLIMITED'
              ? 'Unlimited'
              : apiLimits.windowModel === 'SLIDING_WINDOW'
                ? 'Sliding Window'
                : apiLimits.windowModel === 'FIXED_WINDOW'
                  ? 'Fixed Window'
                  : 'Unknown model'}
          </span>
        </div>
      </div>
      <div className="p-2 flex-1">
        {capacityResults.length > 0 ? (
          <>
            <UPlotChart
              options={capacityCooldownOpts}
              data={capacityChartData.data}
              persistenceKey="api-dashboard-capacity-chart"
            />
            <div className="mt-2 text-xs text-slate-400 flex justify-between items-center">
              {(apiLimits.windowModel === 'FIXED_WINDOW' ||
                apiLimits.windowModel === 'SLIDING_WINDOW') && (
                <span>
                  Tráfico acumulado se resetea al alcanzar el límite de rate (
                  {apiLimits.windowModel === 'FIXED_WINDOW' ? 'Ventana Fija' : 'Ventana Deslizante'})
                  {' '}o al recibir error 4XX
                </span>
              )}
              <span className="text-blue-400 font-medium ml-auto">
                Intervalo de rate: {capacityChartData.intervalSeconds}s | Cooldown = sin peticiones
                {' '}(wasted capacity) | Drag = zoom | Doble click = reset
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">
            Ejecuta un test para ver la evolucion de capacidad y cooldown
          </p>
        )}
      </div>
    </BaseCard>
  );
}
