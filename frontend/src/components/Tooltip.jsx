import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip — envuelve cualquier elemento y muestra un globo descriptivo al hacer hover.
 *
 * @param {string}  text        - Texto del tooltip. Si está vacío no renderiza nada extra.
 * @param {React.ReactNode} children - Elemento que dispara el tooltip.
 * @param {'top'|'bottom'|'left'|'right'} placement - Posición del globo (defecto: 'top').
 * @param {number} showDelay - Retardo en ms antes de mostrar el tooltip (defecto: 220).
 * @param {string}  className   - Clases extra para el contenedor.
 */
export default function Tooltip({ text, children, placement = 'top', showDelay = 220, className = '' }) {
  if (!text) return <>{children}</>;

  const tooltipRef = useRef(null);
  const showTimerRef = useRef(null);
  const canUseDom = typeof window !== 'undefined' && typeof document !== 'undefined';
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    setTooltipSize({ width: rect.width, height: rect.height });
  }, [visible, text]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }
    };
  }, []);

  const floatingPosition = useMemo(() => {
    if (!canUseDom) {
      return { left: 0, top: 0 };
    }

    const gap = 14;
    const pad = 8;
    const { x, y } = cursor;
    let left = x + gap;
    let top = y + gap;

    if (placement === 'top') {
      left = x - tooltipSize.width / 2;
      top = y - tooltipSize.height - gap;
    } else if (placement === 'bottom') {
      left = x - tooltipSize.width / 2;
      top = y + gap;
    } else if (placement === 'left') {
      left = x - tooltipSize.width - gap;
      top = y - tooltipSize.height / 2;
    } else if (placement === 'right') {
      left = x + gap;
      top = y - tooltipSize.height / 2;
    }

    const maxLeft = Math.max(pad, window.innerWidth - tooltipSize.width - pad);
    const maxTop = Math.max(pad, window.innerHeight - tooltipSize.height - pad);

    return {
      left: Math.min(Math.max(pad, left), maxLeft),
      top: Math.min(Math.max(pad, top), maxTop),
    };
  }, [canUseDom, cursor, placement, tooltipSize.height, tooltipSize.width]);

  const handleMouseMove = (event) => {
    setCursor({ x: event.clientX, y: event.clientY });
  };

  const showWithDelay = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (showDelay <= 0) {
      setVisible(true);
      return;
    }

    showTimerRef.current = setTimeout(() => {
      setVisible(true);
      showTimerRef.current = null;
    }, showDelay);
  };

  const hideTooltip = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setVisible(false);
  };

  const handleMouseEnter = (event) => {
    setCursor({ x: event.clientX, y: event.clientY });
    showWithDelay();
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const handleFocus = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    showWithDelay();
  };

  const handleBlur = () => {
    hideTooltip();
  };

  return (
    <span
      className={`flex w-fit ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {canUseDom &&
        visible &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            aria-hidden={!visible}
            className={`tooltip-floating tooltip-floating-${placement} ${visible ? 'is-visible' : ''}`}
            style={{ left: `${floatingPosition.left}px`, top: `${floatingPosition.top}px` }}
          >
            <span className={`tooltip-arrow tooltip-arrow-${placement}`} aria-hidden="true" />
            <span>{text}</span>
          </span>,
          document.body
        )}
    </span>
  );
}
