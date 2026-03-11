import React, { createContext, useState, useCallback, useRef, useEffect } from 'react';
import Toast from '../components/Toast.jsx';

export const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastsRef = useRef([]);
  const toastTimersRef = useRef(new Map());

  const clearToastTimer = useCallback((id) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback((id) => {
    clearToastTimer(id);
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      toastsRef.current = next;
      return next;
    });
  }, [clearToastTimer]);

  const updateToast = useCallback((id, message) => {
    const normalizedMessage = String(message || '').trim();
    setToasts((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, message: normalizedMessage } : t
      );
      toastsRef.current = next;
      return next;
    });
  }, []);

  const scheduleToastRemoval = useCallback((id, duration) => {
    if (!(duration > 0)) return;

    clearToastTimer(id);
    const timerId = setTimeout(() => {
      removeToast(id);
    }, duration);
    toastTimersRef.current.set(id, timerId);
  }, [clearToastTimer, removeToast]);

  const addToast = useCallback((message, type = 'info', duration = 3000, groupKey = null) => {
    const normalizedMessage = String(message || '').trim();
    const nextDuration = Number.isFinite(duration) ? duration : 3000;
    const normalizedGroupKey =
      String(groupKey || `${type}:${normalizedMessage}`)
        .trim()
        .toLowerCase() || `${type}:${normalizedMessage}`;

    const existing = toastsRef.current.find((t) => t.groupKey === normalizedGroupKey);

    if (existing) {
      const targetId = existing.id;
      setToasts((prev) => {
        const next = prev.map((t) =>
          t.id === targetId
            ? {
                ...t,
                message: normalizedMessage,
                duration: nextDuration,
                count: (t.count || 1) + 1,
              }
            : t
        );
        toastsRef.current = next;
        return next;
      });
      scheduleToastRemoval(targetId, nextDuration);
      return targetId;
    }

    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message: normalizedMessage,
      type,
      duration: nextDuration,
      count: 1,
      groupKey: normalizedGroupKey,
    };

    setToasts((prev) => {
      const next = [...prev, newToast];
      toastsRef.current = next;
      return next;
    });

    scheduleToastRemoval(id, nextDuration);
    return id;
  }, [scheduleToastRemoval]);

  useEffect(() => {
    return () => {
      for (const timerId of toastTimersRef.current.values()) {
        clearTimeout(timerId);
      }
      toastTimersRef.current.clear();
    };
  }, []);

  const success = useCallback((message, duration, groupKey) => 
    addToast(message, 'success', duration, groupKey), [addToast]);
  
  const error = useCallback((message, duration, groupKey) => 
    addToast(message, 'error', duration === undefined ? 5000 : duration, groupKey), [addToast]);
  
  const warning = useCallback((message, duration, groupKey) => 
    addToast(message, 'warning', duration, groupKey), [addToast]);
  
  const info = useCallback((message, duration, groupKey) => 
    addToast(message, 'info', duration, groupKey), [addToast]);

  const value = {
    addToast,
    removeToast,
    updateToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast
              message={toast.message}
              type={toast.type}
              count={toast.count || 1}
              onDismiss={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
