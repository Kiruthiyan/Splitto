import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'emerald' | 'amber' | 'rose' | 'navy' | 'gray' | 'blue'
  size?: 'sm' | 'md'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  className = '',
}) => {
  const variantClasses = {
    sky: 'bg-sky-50 text-sky-800 border-sky-200/80',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/80',
    navy: 'bg-slate-900 text-slate-100 border-slate-700',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200/80',
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 rounded font-semibold',
    md: 'text-xs px-2.5 py-0.5 rounded-full font-semibold',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 border leading-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
