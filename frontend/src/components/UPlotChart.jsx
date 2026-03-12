import React, { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

function buildViewportStorageKey(persistenceKey) {
  if (!persistenceKey) return null;
  return `uplot-viewport:${persistenceKey}`;
}

function readPersistedViewport(persistenceKey) {
  const storageKey = buildViewportStorageKey(persistenceKey);
  if (!storageKey || typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    const validX = parsed?.x && Number.isFinite(parsed.x.min) && Number.isFinite(parsed.x.max);
    const validY = parsed?.y && Number.isFinite(parsed.y.min) && Number.isFinite(parsed.y.max);

    if (!validX && !validY) {
      return null;
    }

    return {
      x: validX ? parsed.x : null,
      y: validY ? parsed.y : null,
    };
  } catch (error) {
    console.warn('[UPlotChart] Failed to read persisted viewport:', error);
    return null;
  }
}

function writePersistedViewport(persistenceKey, viewport) {
  const storageKey = buildViewportStorageKey(persistenceKey);
  if (!storageKey || typeof window === 'undefined' || !viewport) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(viewport));
  } catch (error) {
    console.warn('[UPlotChart] Failed to persist viewport:', error);
  }
}

function clearPersistedViewport(persistenceKey) {
  const storageKey = buildViewportStorageKey(persistenceKey);
  if (!storageKey || typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('[UPlotChart] Failed to clear persisted viewport:', error);
  }
}

function createConventionalZoomPlugin() {
  return {
    hooks: {
      ready: (u) => {
        const over = u.over;
        if (!over) return;

        const initialX = { min: u.scales.x.min, max: u.scales.x.max };
        const initialY = { min: u.scales.y.min, max: u.scales.y.max };
        u._initialViewport = { x: initialX, y: initialY };
        u._viewportState = { x: initialX, y: initialY };
        u._isApplyingViewport = false;

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
          u._viewportState = {
            x: { ...initialX },
            y: { ...initialY },
          };
          clearPersistedViewport(u._persistenceKey);
          u.batch(() => {
            u._isApplyingViewport = true;
            u.setScale('x', initialX);
            u.setScale('y', initialY);
            u._isApplyingViewport = false;
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
      setScale: (u, key) => {
        if (u._isApplyingViewport) {
          return;
        }

        if (key !== 'x' && key !== 'y') {
          return;
        }

        const scale = u.scales?.[key];
        if (!Number.isFinite(scale?.min) || !Number.isFinite(scale?.max)) {
          return;
        }

        u._viewportState = {
          ...(u._viewportState || {}),
          [key]: {
            min: scale.min,
            max: scale.max,
          },
        };

        if (u._hasManualViewport) {
          writePersistedViewport(u._persistenceKey, u._viewportState);
        }
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

export default function UPlotChart({ options, data, persistenceKey = null }) {
  const chartRef = useRef(null);
  const uPlotInstance = useRef(null);
  const interactionPluginRef = useRef(createConventionalZoomPlugin());
  const resizeObserverRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const clampRangeToDomain = (range, domainMin, domainMax) => {
    if (
      !range ||
      !Number.isFinite(range.min) ||
      !Number.isFinite(range.max) ||
      !Number.isFinite(domainMin) ||
      !Number.isFinite(domainMax)
    ) {
      return null;
    }

    if (domainMax <= domainMin) {
      return { min: domainMin, max: domainMax };
    }

    const width = Math.max(0, range.max - range.min);
    const clampedWidth = Math.min(width, domainMax - domainMin);
    let nextMin = Math.max(domainMin, range.min);
    let nextMax = nextMin + clampedWidth;

    if (nextMax > domainMax) {
      nextMax = domainMax;
      nextMin = Math.max(domainMin, nextMax - clampedWidth);
    }

    if (nextMin === nextMax) {
      return { min: domainMin, max: domainMax };
    }

    return { min: nextMin, max: nextMax };
  };

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
      uPlotInstance.current._persistenceKey = persistenceKey;
      uPlotInstance.current._hasManualViewport = false;

      const persistedViewport = readPersistedViewport(persistenceKey);
      if (persistedViewport) {
        const xValues = Array.isArray(data?.[0]) ? data[0] : [];
        const domainMin = xValues.length > 0 ? Math.min(...xValues) : null;
        const domainMax = xValues.length > 0 ? Math.max(...xValues) : null;
        const persistedX = clampRangeToDomain(persistedViewport.x, domainMin, domainMax);
        const persistedY = persistedViewport.y;

        uPlotInstance.current._viewportState = {
          x: persistedX || uPlotInstance.current._viewportState?.x || null,
          y: persistedY || uPlotInstance.current._viewportState?.y || null,
        };
        uPlotInstance.current._hasManualViewport = Boolean(persistedX || persistedY);

        if (uPlotInstance.current._hasManualViewport) {
          uPlotInstance.current.batch(() => {
            uPlotInstance.current._isApplyingViewport = true;
            if (persistedX) {
              uPlotInstance.current.setScale('x', persistedX);
            }
            if (persistedY && Number.isFinite(persistedY.min) && Number.isFinite(persistedY.max)) {
              uPlotInstance.current.setScale('y', persistedY);
            }
            uPlotInstance.current._isApplyingViewport = false;
          });
        }
      }
    } catch (error) {
      console.error('[UPlotChart] Error creating chart:', error);
    }
  }, [options, persistenceKey]);

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
          const currentViewport = uPlotInstance.current._viewportState || null;
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
              uPlotInstance.current._isApplyingViewport = true;
              uPlotInstance.current.setScale('x', { min: xMin, max: xMax });
              uPlotInstance.current.setScale('y', yRange);
              uPlotInstance.current._isApplyingViewport = false;
            });
          } else if (uPlotInstance.current._hasManualViewport && Array.isArray(data[0]) && data[0].length > 0) {
            const domainMin = Math.min(...data[0]);
            const domainMax = Math.max(...data[0]);
            const persistedX = clampRangeToDomain(currentViewport?.x, domainMin, domainMax);
            const persistedY = currentViewport?.y;

            uPlotInstance.current.batch(() => {
              uPlotInstance.current._isApplyingViewport = true;
              if (persistedX) {
                uPlotInstance.current.setScale('x', persistedX);
              }
              if (persistedY && Number.isFinite(persistedY.min) && Number.isFinite(persistedY.max)) {
                uPlotInstance.current.setScale('y', persistedY);
              }
              uPlotInstance.current._isApplyingViewport = false;
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
