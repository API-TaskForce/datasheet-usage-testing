import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export default function UPlotChart({ options, data }) {
  const chartRef = useRef(null);
  const uPlotInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      uPlotInstance.current = new uPlot(options, data, chartRef.current);
    }

    return () => {
      if (uPlotInstance.current) {
        uPlotInstance.current.destroy();
        uPlotInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (uPlotInstance.current) {
      uPlotInstance.current.setData(data);
    }
  }, [data]);

  return <div ref={chartRef} />;
}
