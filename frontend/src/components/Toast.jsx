import {CircleX, CircleCheck, CircleAlert, Info} from 'lucide-react';
import React from 'react';

export default function Toast({ message, type = 'info', onDismiss, count = 1 }) {

  const iconEmoji = {
    success: <CircleCheck size={24} />,
    error: <CircleX size={24} />,
    warning: <CircleAlert size={24} />,
    info: <Info size={24} />,
  }[type];

  return (
    <div className={`toast ${type}`}>
      <span className="toast-icon">{iconEmoji}</span>
      {count > 1 && <span className="toast-count">({count} toasts)</span>}
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
