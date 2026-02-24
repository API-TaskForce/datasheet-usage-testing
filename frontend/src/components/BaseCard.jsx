import React from 'react'

export default function BaseCard({children, className = ''}){
  return (
    <div className={`section-card ${className}`}>{children}</div>
  )
}
