import React from 'react'

export default function BaseButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    background: 'btn-background',
    success: 'btn-success',
    ghost: 'btn-ghost',
    icon: 'btn-icon'
  }[variant] || 'bg-blue-600 text-white'

  const sizeClass = {
    sm: 'px-4 py-1 text-sm',
    md: 'px-8 py-2 text-base',
    lg: 'px-10 py-3 text-lg',
    icon: 'p-2 w-fit'
  }[size] || 'px-4 py-2 text-base'

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
