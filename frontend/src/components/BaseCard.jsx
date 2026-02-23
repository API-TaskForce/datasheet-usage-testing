import React from 'react'

export default function BaseCard({children, className = ''}){
  return (
    <div className={`card-root ${className}`}>{children}</div>
  )
}
