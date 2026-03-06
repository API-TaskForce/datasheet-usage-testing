import {CircleX, CircleCheck, CircleAlert, Info} from 'lucide-react';
import React, { useEffect } from 'react';

export default function Toast({ id, message, type = 'info', onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const iconEmoji = {
    success: <CircleCheck size={24} />,
    error: <CircleX size={24} />,
    warning: <CircleAlert size={24} />,
    info: <Info size={24} />,
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
