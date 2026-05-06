import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  value: string        // "HH:MM" 24h, e.g. "08:00"
  onChange: (v: string) => void
}

export default function AlarmClockPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const parsed = value
    ? (() => {
        const h = parseInt(value.split(':')[0], 10)
        return { h12: h === 0 ? 12 : h > 12 ? h - 12 : h, isPM: h >= 12 }
      })()
    : null

  const h12  = parsed?.h12  ?? 8
  const isPM = parsed?.isPM ?? false

  const commit = (newH12: number, newPM: boolean) => {
    const h24 = newH12 === 12 ? (newPM ? 12 : 0) : newH12 + (newPM ? 12 : 0)
    onChange(`${String(h24).padStart(2, '0')}:00`)
  }

  const bump = (dir: 1 | -1) => {
    if (!value) { commit(8, false); return }
    const next = h12 + dir
    commit(next < 1 ? 12 : next > 12 ? 1 : next, isPM)
  }

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => { if (!value) commit(8, false); setOpen(o => !o) }}
        title={value ? `Bake at ${h12} ${isPM ? 'PM' : 'AM'}` : 'Set bake time'}
        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all select-none
          ${value
            ? 'bg-gray-950 border-[#D69A3A] shadow-[inset_0_0_8px_rgba(214,154,58,0.15)]'
            : 'bg-gray-100 border-gray-200 hover:border-[#D69A3A]/50'
          }`}
      >
        {parsed ? (
          <>
            <span className="font-mono font-black leading-none text-[#D69A3A] text-xl tracking-tight"
              style={{ textShadow: '0 0 8px rgba(214,154,58,0.6)' }}>
              {h12}
            </span>
            <span className="font-mono text-[9px] font-bold leading-none mt-0.5"
              style={{ color: 'rgba(214,154,58,0.65)' }}>
              {isPM ? 'PM' : 'AM'}
            </span>
          </>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-gray-300">
            <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-16 z-20 flex flex-col items-center gap-2 bg-gray-950 border border-[#D69A3A]/30 rounded-xl p-3 shadow-xl min-w-[64px]">
          <button type="button" onClick={() => bump(1)} className="text-[#D69A3A] hover:text-[#D69A3A]/70 transition-colors">
            <ChevronUp size={18} />
          </button>
          <span className="font-mono font-black text-[#D69A3A] text-2xl w-10 text-center leading-none"
            style={{ textShadow: '0 0 10px rgba(214,154,58,0.7)' }}>
            {h12}
          </span>
          <button type="button" onClick={() => bump(-1)} className="text-[#D69A3A] hover:text-[#D69A3A]/70 transition-colors">
            <ChevronDown size={18} />
          </button>
          <button
            type="button"
            onClick={() => commit(h12, !isPM)}
            className="mt-1 text-[10px] font-black tracking-widest border border-[#D69A3A]/40 rounded-lg px-2.5 py-1 text-[#D69A3A] hover:bg-[#D69A3A]/10 transition-colors"
          >
            {isPM ? 'PM' : 'AM'}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="text-[9px] font-bold text-[#D69A3A]/80 hover:text-[#D69A3A] transition-colors mt-0.5">
            Done
          </button>
        </div>
      )}
    </div>
  )
}
