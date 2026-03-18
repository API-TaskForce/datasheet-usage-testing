import React, { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

function percentileFromSorted(sortedValues, percentile) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return null;
  const p = Math.min(1, Math.max(0, percentile));
  const idx = (sortedValues.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower];
  const weight = idx - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
export default function UPlotChart({ options, data }) {
  const chartRef = useRef(null);
  const uPlotInstance = useRef(null);
  const resizeObserverRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const computeSmartRanges = (nextData) => {
    if (!Array.isArray(nextData) || !Array.isArray(nextData[0]) || nextData[0].length === 0) {
      return null;
    }

    const smartZoom = options?.smartZoom || {};
    const smartEnabled = smartZoom.enabled !== false;

    const explicitXRange =
      Array.isArray(options?.scales?.x?.range) &&
      options.scales.x.range.length === 2 &&
      options.scales.x.range.every((value) => Number.isFinite(value));
    const explicitYRange =
      Array.isArray(options?.scales?.y?.range) &&
      options.scales.y.range.length === 2 &&
      options.scales.y.range.every((value) => Number.isFinite(value));
    const overrideExplicit = smartZoom.overrideExplicitRanges === true;

    const finiteX = nextData[0].filter((v) => Number.isFinite(v));
    if (finiteX.length === 0) return null;

    const domainXMin = Math.min(...finiteX);
    const domainXMax = Math.max(...finiteX);

    let xRange = null;
    if (explicitXRange && !overrideExplicit) {
      xRange = { min: options.scales.x.range[0], max: options.scales.x.range[1] };
    } else {
      const xPaddingRatio = Number.isFinite(smartZoom.xPaddingRatio)
        ? Math.max(0, smartZoom.xPaddingRatio)
        : 0.02;
      const xSpan = Math.max(0, domainXMax - domainXMin);
      const xPad = xSpan > 0 ? xSpan * xPaddingRatio : 1;
      xRange = {
        min: domainXMin - xPad,
        max: domainXMax + xPad,
      };
    }

    let yRange = null;
    if (explicitYRange && !overrideExplicit) {
      yRange = { min: options.scales.y.range[0], max: options.scales.y.range[1] };
    } else {
      const configuredSeries = Array.isArray(options?.autoScaleSeriesIndices)
        ? options.autoScaleSeriesIndices.filter(
            (idx) => Number.isInteger(idx) && idx > 0 && idx < nextData.length
          )
        : [];
      const seriesToScale =
        configuredSeries.length > 0
          ? configuredSeries
          : Array.from({ length: Math.max(0, nextData.length - 1) }, (_, idx) => idx + 1);

      const yCandidates = [];
      for (const i of seriesToScale) {
        const series = Array.isArray(nextData[i]) ? nextData[i] : [];
        for (const value of series) {
          if (value != null && Number.isFinite(value)) {
            yCandidates.push(value);
          }
        }
      }

      if (yCandidates.length > 0) {
        let minCandidate = Math.min(...yCandidates);
        let maxCandidate = Math.max(...yCandidates);

        if (smartEnabled && yCandidates.length > 8 && smartZoom.trimOutliers !== false) {
          const sortedY = [...yCandidates].sort((a, b) => a - b);
          const lowP = Number.isFinite(smartZoom.trimLowPercentile)
            ? Math.min(0.2, Math.max(0, smartZoom.trimLowPercentile))
            : 0.02;
          const highP = Number.isFinite(smartZoom.trimHighPercentile)
            ? Math.max(0.8, Math.min(1, smartZoom.trimHighPercentile))
            : 0.98;
          const robustMin = percentileFromSorted(sortedY, Math.min(lowP, highP));
          const robustMax = percentileFromSorted(sortedY, Math.max(lowP, highP));
          if (Number.isFinite(robustMin) && Number.isFinite(robustMax) && robustMax > robustMin) {
            minCandidate = robustMin;
            maxCandidate = robustMax;
          }
        }

        const yPaddingRatio = Number.isFinite(smartZoom.yPaddingRatio)
          ? Math.max(0, smartZoom.yPaddingRatio)
          : 0.12;
        const span = Math.max(0, maxCandidate - minCandidate);
        const pad = span > 0 ? span * yPaddingRatio : Math.max(1, Math.abs(maxCandidate) * 0.1);
        const anchorZero = smartZoom.anchorZero === true || options?.autoScaleFromZero === true;

        let minY = anchorZero ? Math.min(0, minCandidate - pad) : minCandidate - pad;
        let maxY = maxCandidate + pad;

        if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY <= minY) {
          minY = 0;
          maxY = Math.max(1, maxCandidate || 1);
        }

        yRange = {
          min: minY,
          max: maxY,
        };
      } else {
        yRange = { min: 0, max: 1 };
      }
    }

    return { xRange, yRange };
  };

  const applyAutoViewport = (instance, nextData) => {
    const ranges = computeSmartRanges(nextData);
    if (!ranges?.xRange || !ranges?.yRange) return;

    instance.batch(() => {
      instance.setScale('x', ranges.xRange);
      instance.setScale('y', ranges.yRange);
    });
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
            setScale: false,
          },
        },
      };

      uPlotInstance.current = new uPlot(mergedOptions, data, chartRef.current);
      applyAutoViewport(uPlotInstance.current, data);
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

          if (Array.isArray(data[0]) && data[0].length > 0) {
            applyAutoViewport(uPlotInstance.current, data);
          }
        }
        setIsUpdating(false);
      }, 50); // Small delay for smooth transition
    } catch (error) {
      console.error('[UPlotChart] Error updating data:', error);
      setIsUpdating(false);
    }
  }, [data, options]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        opacity: isUpdating ? 0.92 : 1,
        transition: 'all 0.3s ease-out',
      }}
    />
  );
}
