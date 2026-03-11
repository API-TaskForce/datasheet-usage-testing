import React, { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

function createConventionalZoomPlugin() {
  return {
    hooks: {
      ready: (u) => {
        const over = u.over;
        if (!over) return;

        const initialX = { min: u.scales.x.min, max: u.scales.x.max };
        const initialY = { min: u.scales.y.min, max: u.scales.y.max };

        let dragStartX = null;
        let dragStartY = null;

        const onMouseDown = (e) => {
          if (e.button !== 0) return;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
        };

        const onMouseUp = (e) => {
          if (dragStartX == null || dragStartY == null) return;

          const dx = Math.abs(e.clientX - dragStartX);
          const dy = Math.abs(e.clientY - dragStartY);

          // If user dragged enough, we assume a native zoom selection occurred.
          if (dx > 4 || dy > 4) {
            u._hasManualViewport = true;
          }

          dragStartX = null;
          dragStartY = null;
        };

        const onDoubleClick = () => {
          u._hasManualViewport = false;
          u.batch(() => {
            u.setScale('x', initialX);
            u.setScale('y', initialY);
          });
        };

        over.addEventListener('mousedown', onMouseDown);
        over.addEventListener('mouseup', onMouseUp);
        over.addEventListener('dblclick', onDoubleClick);

        u._customCleanup = () => {
          over.removeEventListener('mousedown', onMouseDown);
          over.removeEventListener('mouseup', onMouseUp);
          over.removeEventListener('dblclick', onDoubleClick);
        };
      },
      destroy: (u) => {
        if (typeof u._customCleanup === 'function') {
          u._customCleanup();
          u._customCleanup = null;
        }
      },
    },
  };
}

export default function UPlotChart({ options, data }) {
  const chartRef = useRef(null);
  const uPlotInstance = useRef(null);
  const interactionPluginRef = useRef(createConventionalZoomPlugin());
  const resizeObserverRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (uPlotInstance.current) {
      return;
    }

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
      const initialWidth = Math.max(320, chartRef.current.clientWidth || options.width || 600);
      const initialHeight = options.height || 280;

      const mergedOptions = {
        ...options,
        width: initialWidth,
        height: initialHeight,
        cursor: {
          ...options.cursor,
          drag: {
            ...(options.cursor?.drag || {}),
            setScale: true,
          },
        },
        plugins: [...(options.plugins || []), interactionPluginRef.current],
      };

      uPlotInstance.current = new uPlot(mergedOptions, data, chartRef.current);
      uPlotInstance.current._hasManualViewport = false;
    } catch (error) {
      console.error('[UPlotChart] Error creating chart:', error);
    }
  }, [options]);

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (uPlotInstance.current) {
        uPlotInstance.current.destroy();
        uPlotInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!uPlotInstance.current || !chartRef.current) return;

    const targetHeight = options?.height || 280;

    const resizeChart = () => {
      if (!uPlotInstance.current || !chartRef.current) return;

      const nextWidth = Math.max(320, chartRef.current.clientWidth || 320);
      uPlotInstance.current.setSize({ width: nextWidth, height: targetHeight });
    };

    resizeChart();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        resizeChart();
      });
      resizeObserverRef.current.observe(chartRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [options?.height]);

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
      // Smooth update with subtle fade effect
      setIsUpdating(true);
      setTimeout(() => {
        if (uPlotInstance.current) {
          uPlotInstance.current.setData(data);

          // Keep full-range autoscale only when user has not manually zoomed/panned.
          if (!uPlotInstance.current._hasManualViewport && Array.isArray(data[0]) && data[0].length > 0) {
            const explicitXRange = Array.isArray(options?.scales?.x?.range)
              && options.scales.x.range.length === 2
              && options.scales.x.range.every((value) => Number.isFinite(value));
            const explicitYRange = Array.isArray(options?.scales?.y?.range)
              && options.scales.y.range.length === 2
              && options.scales.y.range.every((value) => Number.isFinite(value));

            const xMin = explicitXRange ? options.scales.x.range[0] : Math.min(...data[0]);
            const xMax = explicitXRange ? options.scales.x.range[1] : Math.max(...data[0]);

            const yCandidates = [];
            const configuredSeries = Array.isArray(options?.autoScaleSeriesIndices)
              ? options.autoScaleSeriesIndices.filter((idx) => Number.isInteger(idx) && idx > 0 && idx < data.length)
              : [];
            const seriesToScale = configuredSeries.length > 0
              ? configuredSeries
              : Array.from({ length: Math.max(0, data.length - 1) }, (_, idx) => idx + 1);

            for (const i of seriesToScale) {
              const series = Array.isArray(data[i]) ? data[i] : [];
              series.forEach((v) => {
                if (v != null && Number.isFinite(v)) yCandidates.push(v);
              });
            }

            const yMin = 0;
            const yPadding = Number.isFinite(options?.autoScalePadding)
              ? Math.max(1, options.autoScalePadding)
              : 1.2;
            const autoYMax = yCandidates.length > 0 ? Math.max(...yCandidates) * yPadding : 1;
            const yRange = explicitYRange
              ? {
                  min: options.scales.y.range[0],
                  max: options.scales.y.range[1],
                }
              : {
                  min: yMin,
                  max: Math.max(1, autoYMax),
                };

            uPlotInstance.current.batch(() => {
              uPlotInstance.current.setScale('x', { min: xMin, max: xMax });
              uPlotInstance.current.setScale('y', yRange);
            });
          }
        }
        setIsUpdating(false);
      }, 50); // Small delay for smooth transition
    } catch (error) {
      console.error('[UPlotChart] Error updating data:', error);
      setIsUpdating(false);
    }
  }, [data]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        opacity: isUpdating ? 0.92 : 1,
        transition: 'opacity 0.15s ease-in-out',
      }}
    />
  );
}
