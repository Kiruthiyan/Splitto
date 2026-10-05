import React from 'react'

interface AvatarProps {
  name: string
  isMe?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  isMe = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg font-bold',
  }

  const getBgColor = (str: string, me: boolean) => {
    if (me) {
      return 'bg-sky-600 text-white'
    }
    const colors = [
      'bg-indigo-600 text-white',
      'bg-blue-600 text-white',
      'bg-teal-600 text-white',
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
      'bg-purple-600 text-white',
      'bg-cyan-600 text-white',
    ]
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizeClasses[size]} rounded-full font-bold flex items-center justify-center shadow-xs select-none ${getBgColor(
          name,
          isMe
        )} ${className}`}
        title={name}
        aria-label={name}
      >
        {initials}
      </div>
      {isMe && size !== 'sm' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 px-1 py-0.2 bg-sky-700 text-white text-[9px] font-extrabold rounded-full border border-white leading-none shadow-xs"
          title="This is you"
        >
          Me
        </span>
      )}
    </div>
  )
}
