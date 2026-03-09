import React from 'react';
import UPlotChart from '../UPlotChart.jsx';

/**
 * OpportunityPanelHistorical - Displays historical cumulative requests over time with optional limit line
 * @param {Object} opportunityData - Object containing timestamps and cumulativeCounts arrays
 * @param {Object} apiLimits - Object with quotaDaily limit
 * @param {string} granularity - Time granularity ('1m', '1h', '6h', '1d')
 */
export function OpportunityPanelHistorical({ opportunityData, apiLimits, granularity }) {
  if (!opportunityData.timestamps || opportunityData.timestamps.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No hay datos para mostrar. Ejecuta un test para comenzar.
      </p>
    );
  }

  const limitLine = apiLimits.quotaDaily || null;
  const maxCumulative = Math.max(...opportunityData.cumulativeCounts, 0);

  // Convert timestamps to Unix seconds for uPlot
  const timestampsInSeconds = opportunityData.timestamps.map((ts) => {
    // Check if timestamp is in milliseconds or seconds
    return ts > 10000000000 ? Math.floor(ts / 1000) : ts;
  });

  console.log('[OpportunityPanelHistorical] Data:', {
    dataPoints: timestampsInSeconds.length,
    firstTimestamp: new Date(timestampsInSeconds[0] * 1000).toISOString(),
    lastTimestamp: new Date(
      timestampsInSeconds[timestampsInSeconds.length - 1] * 1000
    ).toISOString(),
    maxCumulative,
    limitLine,
  });

  const opportunityChartOpts = {
    title: 'Peticiones Acumuladas Over Time',
    width: 850,
    height: 300,
    scales: {
      x: {
        auto: false,
        range: [Math.min(...timestampsInSeconds), Math.max(...timestampsInSeconds)],
      },
      y: {
        auto: false,
        range: [
          0,
          limitLine ? Math.max(limitLine * 1.2, maxCumulative * 1.1) : maxCumulative * 1.2,
        ],
      },
    },
    axes: [
      {
        label: 'Tiempo',
        values: (u, vals) =>
          vals.map((v) => {
            const date = new Date(v * 1000);
            if (granularity === '1d') {
              return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            } else if (granularity === '1h' || granularity === '6h') {
              return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            } else {
              return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
            }
          }),
      },
      {
        label: 'Peticiones Acumuladas',
        side: 1,
        values: (u, vals) => vals.map((v) => Math.round(v).toLocaleString()),
      },
    ],
    series: [
      { label: 'Tiempo' },
      {
        label: 'Peticiones',
        stroke: '#06b6d4',
        fill: 'rgba(6,179,212,0.15)',
        width: 3,
        points: {
          show: true,
          size: 6,
          width: 2,
          stroke: '#06b6d4',
          fill: '#ffffff',
        },
      },
      ...(limitLine
        ? [
            {
              label: `Límite (${limitLine})`,
              stroke: '#ef4444',
              width: 2,
              dash: [10, 5],
              points: { show: false },
            },
          ]
        : []),
    ],
  };

  // Build data array with converted timestamps
  const data = [timestampsInSeconds, opportunityData.cumulativeCounts];
  if (limitLine) {
    const limitPoints = timestampsInSeconds.map(() => limitLine);
    data.push(limitPoints);
  }

  return (
    <div className="w-full">
      <UPlotChart options={opportunityChartOpts} data={data} />
      {limitLine && (
        <div className="mt-4 text-xs text-slate-400">
          <p>
            Límite identificado:{' '}
            <span className="font-bold text-text">{limitLine.toLocaleString()} peticiones</span>
          </p>
          <p>
            Granularidad: <span className="font-mono">{granularity}</span> | Total acumulado:{' '}
            <span className="font-bold text-cyan-400">{maxCumulative.toLocaleString()}</span>
          </p>
        </div>
      )}
      {!limitLine && (
        <div className="mt-4 text-xs text-slate-400">
          <p>
            Granularidad: <span className="font-mono">{granularity}</span> | Total acumulado:{' '}
            <span className="font-bold text-cyan-400">{maxCumulative.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * OpportunityPanel - Displays real-time cumulative requests over time with optional limit line
 * @param {Array} liveResults - Array of test results with timestamps
 * @param {Object} apiLimits - Object with quotaDaily limit
 * @param {boolean} running - Whether test is currently running
 */
export function OpportunityPanel({ liveResults, apiLimits, running }) {
  if (!liveResults || liveResults.length === 0) {
    return <p className="text-sm text-slate-400">No hay datos para mostrar.</p>;
  }

  // Extract timestamps and build cumulative requests over time
  const startTime = new Date(liveResults[0].timestamp).getTime();
  let cumulativeCount = 0;
  const timePoints = [];
  const requestPoints = [];

  liveResults.forEach((r) => {
    const resultTime = new Date(r.timestamp).getTime();
    const secondsElapsed = Math.floor((resultTime - startTime) / 1000);
    cumulativeCount++;
    timePoints.push(secondsElapsed);
    requestPoints.push(cumulativeCount);
  });

  // Add limit line if available
  const limitLine = apiLimits.quotaDaily || null;

  const opportunityChartOpts = {
    title: 'Cumulative Requests Over Time',
    width: '100%',
    height: 300,
    scales: {
      x: { auto: true },
      y: {
        auto: false,
        range: [
          0,
          limitLine
            ? Math.max(limitLine * 1.2, Math.max(...requestPoints))
            : Math.max(...requestPoints),
        ],
      },
    },
    axes: [{ label: 'Time (seconds)' }, { label: 'Cumulative Requests', side: 1 }],
    series: [
      { label: 'Time (s)' },
      {
        label: 'Requests',
        stroke: '#06b6d4',
        fill: 'rgba(6,179,212,0.1)',
        width: 2,
      },
      ...(limitLine
        ? [
            {
              label: `Daily Limit (${limitLine})`,
              stroke: '#ef4444',
              width: 2,
              dash: [5, 5],
            },
          ]
        : []),
    ],
  };

  // Build data array: [times, requests, limitLine if exists]
  const data = [timePoints, requestPoints];
  if (limitLine) {
    // Add a plateau line at the limit
    const limitPoints = timePoints.map(() => limitLine);
    data.push(limitPoints);
  }

  return (
    <div className="w-full">
      <UPlotChart options={opportunityChartOpts} data={data} />
      {limitLine && (
        <div className="mt-4 text-xs text-slate-400">
          <p>
            Límite diario identificado:{' '}
            <span className="font-bold text-text">{limitLine} peticiones</span>
          </p>
        </div>
      )}
    </div>
  );
}
