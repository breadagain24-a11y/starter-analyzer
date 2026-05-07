import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react'

// Badge / pill
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block px-3 py-1 bg-[rgba(214,154,58,0.15)] text-[#D69A3A] text-[10px] font-bold uppercase tracking-[0.15em] rounded-full ${className}`}>
      {children}
    </span>
  )
}

// Primary button
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[#D69A3A] hover:bg-[#C98A3D] text-white px-6 py-3.5',
    ghost: 'border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white px-6 py-3.5 bg-transparent',
    outline: 'border border-gray-200 text-gray-700 hover:border-[#D69A3A] hover:text-[#D69A3A] px-6 py-3.5 bg-white',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Card
export function Card({ children, className = '', lift = false, ...props }: HTMLAttributes<HTMLDivElement> & { lift?: boolean }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm ${lift ? 'card-lift' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

// Health bar
export function HealthBar({ score, className = '' }: { score: number; className?: string }) {
  return (
    <div className={`w-full bg-gray-100 rounded-full h-1.5 overflow-hidden ${className}`}>
      <div
        className="health-bar-fill"
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

// Score ring SVG
export function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = size / 2 - 12
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const color = score >= 85 ? '#10b981' : score >= 65 ? '#D69A3A' : score >= 45 ? '#f59e0b' : '#f87171'

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="animate-score-ring"
        style={{ '--ring-circumference': circumference, '--ring-target': offset } as React.CSSProperties}
      />
    </svg>
  )
}

// Score label
export function ScoreLabel({ label }: { label: string }) {
  const colors: Record<string, string> = {
    THRIVING: 'text-emerald-600 bg-emerald-50',
    GOOD: 'text-[#D69A3A] bg-[rgba(214,154,58,0.1)]',
    DEVELOPING: 'text-amber-600 bg-amber-50',
    'NEEDS ATTENTION': 'text-orange-600 bg-orange-50',
    CRITICAL: 'text-red-500 bg-red-50',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${colors[label] || 'text-gray-500 bg-gray-100'}`}>
      {label}
    </span>
  )
}

// Skeleton loader
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}
