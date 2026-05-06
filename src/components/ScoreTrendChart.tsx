import type { Analysis } from '../types'

interface Props {
  analyses: Analysis[]
  height?: number
  highlightDate?: Date | string | null
  highlightAnalysisId?: string | null
}

export default function ScoreTrendChart({ analyses, height = 80, highlightDate, highlightAnalysisId }: Props) {
  if (analyses.length < 2) return null

  // Newest last so the line goes left = old, right = new
  const sorted = [...analyses]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30) // cap at 30 data points

  const scores = sorted.map(a => a.aiResult.overallScore)
  const ids    = sorted.map(a => a.id)
  const min = Math.max(0,   Math.min(...scores) - 10)
  const max = Math.min(100, Math.max(...scores) + 10)
  const range = max - min || 1

  const W = 400
  const H = height
  const pad = { top: 8, bottom: 20, left: 28, right: 8 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom

  const px = (i: number) => pad.left + (i / (scores.length - 1)) * innerW
  const py = (s: number) => pad.top + (1 - (s - min) / range) * innerH

  const polyline = scores.map((s, i) => `${px(i)},${py(s)}`).join(' ')

  // Filled area under the curve
  const area = [
    `${px(0)},${pad.top + innerH}`,
    ...scores.map((s, i) => `${px(i)},${py(s)}`),
    `${px(scores.length - 1)},${pad.top + innerH}`,
  ].join(' ')

  const latest = scores[scores.length - 1]
  const prev   = scores[scores.length - 2]
  const trend  = latest - prev
  const trendColor = trend > 0 ? '#10b981' : trend < 0 ? '#f87171' : '#D69A3A'

  // Highlight: compute x position from date proportionally within the chart's time range
  const tMin = new Date(sorted[0].createdAt).getTime()
  const tMax = new Date(sorted[sorted.length - 1].createdAt).getTime()
  const tRange = tMax - tMin || 1
  const hx = highlightDate
    ? pad.left + ((new Date(highlightDate).getTime() - tMin) / tRange) * innerW
    : null
  const hxClamped = hx !== null ? Math.max(pad.left, Math.min(W - pad.right, hx)) : null

  // Y-axis ticks
  const ticks = [min, (min + max) / 2, max].map(Math.round)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Score Trend</span>
        <span className="text-[10px] font-bold" style={{ color: trendColor }}>
          {trend > 0 ? '▲' : trend < 0 ? '▼' : '–'} {Math.abs(trend)} pts
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} className="overflow-visible">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#D69A3A" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#D69A3A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis ticks */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={pad.left - 4} y1={py(t)} x2={pad.left} y2={py(t)} stroke="#e5e7eb" strokeWidth="1" />
            <text x={pad.left - 6} y={py(t) + 3} textAnchor="end" fontSize="7" fill="#9ca3af">{t}</text>
          </g>
        ))}

        {/* Grid lines */}
        {ticks.map(t => (
          <line key={`g${t}`} x1={pad.left} y1={py(t)} x2={W - pad.right} y2={py(t)}
            stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3,3" />
        ))}

        {/* Filled area */}
        <polygon points={area} fill="url(#chartGrad)" />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#D69A3A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points — only show first, last, every 5th, and the highlighted one */}
        {scores.map((s, i) => {
          const isHighlighted = highlightAnalysisId && ids[i] === highlightAnalysisId
          const show = isHighlighted || i === 0 || i === scores.length - 1 || i % 5 === 0
          if (!show) return null
          return (
            <g key={i}>
              {/* Pulse ring for highlighted analysis */}
              {isHighlighted && (
                <circle cx={px(i)} cy={py(s)} r="9" fill="#D69A3A" opacity="0.15" />
              )}
              <circle
                cx={px(i)} cy={py(s)}
                r={isHighlighted ? '5.5' : '3.5'}
                fill={isHighlighted ? '#D69A3A' : 'white'}
                stroke="#D69A3A"
                strokeWidth={isHighlighted ? '2' : '1.5'}
              />
              {/* Score label: always on last dot, or on the highlighted dot */}
              {(i === scores.length - 1 || isHighlighted) && (
                <text x={px(i)} y={py(s) - 8} textAnchor="middle" fontSize="8" fontWeight="700" fill="#D69A3A">{s}</text>
              )}
            </g>
          )
        })}

        {/* X-axis dates */}
        {[0, scores.length - 1].map(i => (
          <text key={i} x={px(i)} y={H - 2} textAnchor={i === 0 ? 'start' : 'end'} fontSize="7" fill="#9ca3af">
            {new Date(sorted[i].createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        ))}

        {/* Feed highlight marker */}
        {hxClamped !== null && (
          <g>
            <line
              x1={hxClamped} y1={pad.top - 4}
              x2={hxClamped} y2={pad.top + innerH}
              stroke="#D69A3A" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.85"
            />
            <rect x={hxClamped - 10} y={pad.top - 14} width={20} height={11} rx="3" fill="#D69A3A" opacity="0.9" />
            <text x={hxClamped} y={pad.top - 6} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="white">FED</text>
          </g>
        )}
      </svg>
    </div>
  )
}
