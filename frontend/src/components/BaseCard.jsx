import React from 'react';

export default function BaseCard({ children, className = '' }) {
  return <div className={`section-card h-full ${className}`}>{children}</div>;
}
