import { Check, CircleAlert, Info, MessageCircleWarning, X } from 'lucide-react';
import React, { useEffect } from 'react';

export default function Toast({ id, message, type = 'info', onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const iconEmoji = {
    success: <Check size={16} />,
    error: <X size={16} />,
    warning: <CircleAlert size={16} />,
    info: <Info size={16} />,
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
