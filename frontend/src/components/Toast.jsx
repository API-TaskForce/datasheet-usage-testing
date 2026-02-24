import React, { useEffect } from 'react';

export default function Toast({ id, message, type = 'info', onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const bgColor = {
    success: '#22863a',
    error: '#cb2431',
    warning: '#ffc107',
    info: '#0366d6',
  }[type];

  const textColor = type === 'warning' ? '#333' : '#fff';

  const iconEmoji = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ⓘ',
  }[type];

  return (
    <div className={`toast ${type}`}>
      <span className="toast-icon">{iconEmoji}</span>
      <span className="toast-message">{message}</span>
      <button
        onClick={onDismiss}
        className="toast-close"
      >
        ×
      </button>
    </div>
  );
}
