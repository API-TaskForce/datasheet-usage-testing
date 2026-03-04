import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export default function UPlotChart({ options, data }) {
  const chartRef = useRef(null);
  const uPlotInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) {
      console.warn('[UPlotChart] Missing chart container or data:', { hasRef: !!chartRef.current, dataLength: data?.length });
      return;
    }

    // Validate data structure
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      console.error('[UPlotChart] Invalid data structure:', data);
      return;
    }

    // Log data info
    console.log('[UPlotChart] Initializing chart:', {
      series: data.length,
      dataPoints: data[0]?.length,
      firstTimestamp: data[0]?.[0],
      lastTimestamp: data[0]?.[data[0].length - 1],
      title: options.title,
    });

    try {
      uPlotInstance.current = new uPlot(options, data, chartRef.current);
    } catch (error) {
      console.error('[UPlotChart] Error creating chart:', error);
    }

    return () => {
      if (uPlotInstance.current) {
        uPlotInstance.current.destroy();
        uPlotInstance.current = null;
      }
    };
  }, [options]);

  useEffect(() => {
    if (!uPlotInstance.current || !data || data.length === 0) {
      return;
    }

    // Validate data before updating
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      console.error('[UPlotChart] Invalid data for update:', data);
      return;
    }

    try {
      uPlotInstance.current.setData(data);
    } catch (error) {
      console.error('[UPlotChart] Error updating data:', error);
    }
  }, [data]);

  return <div ref={chartRef} />;
}
