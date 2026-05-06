import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Upload, CheckCircle2, Circle, Sprout, Wheat, AlertTriangle, Bell, Download, ArrowRight, RotateCcw } from 'lucide-react'
import jsPDF from 'jspdf'
import { useAuth } from '../context/AuthContext'
import { useStarters } from '../context/StarterContext'
import { compressImage } from '../lib/imageCompressor'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { Button, Card, Badge } from '../components/ui'
import AlarmClockPicker from '../components/AlarmClockPicker'
import type { DailyLog, StarterJourney } from '../types'

// ── Jargon glossary ──────────────────────────────────────────
const JARGON: Record<string, string> = {
  'float test':    "Drop a small spoonful of starter into a glass of water. If it floats, it's gassed up enough to leaven bread. If it sinks, give it another day or two.",
  'hooch':         "That grey or dark liquid that pools on top of your starter. It's just alcohol — a sign your starter is hungry, not dead. Stir it back in or pour it off before feeding.",
  "baker's math":  "A ratio system where everything is expressed as a percentage of the flour weight. Hydration = water ÷ flour × 100. So 50g water + 50g flour = 100% hydration.",
  'discard':       "The portion of starter you remove before feeding. Not waste — it prevents acid build-up and gives the remaining yeast fresh food. Use it in pancakes, crackers, or pizza dough.",
  'hydration':     "The ratio of water to flour, expressed as a percentage. 100% hydration = equal parts water and flour by weight. Higher = more liquid, more sour. Lower = stiffer, milder.",
  'lactic acid':   "One of two acids produced by bacteria in your starter. Lactic gives a mild, yogurt-like tang. Warmer temps and shorter ferments favour lactic. Cooler, longer ferments produce more acetic acid — the sharper, vinegary bite.",
}

// Longest terms first so multi-word phrases match before single words
const JARGON_TERMS = Object.keys(JARGON).sort((a, b) => b.length - a.length)

// ── Jargon tooltip component ─────────────────────────────────
function Jargon({ term, children }: { term: string; children: ReactNode }) {
  return (
    <span className="relative group inline">
      <span className="underline decoration-dotted decoration-[#D69A3A] cursor-help">{children}</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-gray-900 text-white text-xs p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 leading-relaxed whitespace-normal">
        <strong className="text-[#D69A3A] block mb-1">{term.charAt(0).toUpperCase() + term.slice(1)}</strong>
        {JARGON[term]}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  )
}

// Render text with jargon terms highlighted + tooltip
function J({ text }: { text: string }) {
  const pattern = new RegExp(
    `(${JARGON_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  )
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, i) => {
        const lower = part.toLowerCase()
        if (JARGON[lower]) return <Jargon key={i} term={lower}>{part}</Jargon>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── Day-by-day guide ─────────────────────────────────────────
const DAY_GUIDE: Record<number, { title: string; instruction: string; tip: string; expect: string }> = {
  1:  {
    title: 'Mix Day',
    instruction: "Combine 50g flour + 50g water (room temperature). Stir until no dry flour remains. Cover loosely with a cloth or lid left ajar. Leave somewhere between 20–24°C.",
    tip: "Use unbleached flour. Chlorinated tap water can slow fermentation — filtered is better. This 50:50 mix is 100% hydration in baker's math terms.",
    expect: "Nothing visible yet. Your flour just became a habitat. That's the whole idea.",
  },
  2:  {
    title: 'Rest Day',
    instruction: "Don't feed today. The mix needs time to settle. Remove the lid, take a smell, put it back. That's all.",
    tip: "A slightly musty or flour-like smell is completely normal. Wild yeasts and bacteria are just getting acquainted.",
    expect: "Possibly a few tiny bubbles. More likely nothing at all. Both are fine.",
  },
  3:  {
    title: 'First Feed',
    instruction: "Discard all but 25g of your starter. Add 50g fresh flour + 50g water. Stir until smooth, cover loosely.",
    tip: "The discard prevents acid build-up and gives the yeast a fresh food source. Use the discard in pancakes or flatbread — it already has flavour.",
    expect: "Small bubbles should start appearing within 12–24h of this feed.",
  },
  4:  {
    title: 'Signs of Life',
    instruction: "Feed again: discard to 25g, add 50g flour + 50g water. Watch for activity 4–8h after feeding.",
    tip: "If you see a grey liquid pooling on top — that's hooch. Alcohol from hungry yeast. Stir it in before discarding.",
    expect: "Visible bubbles. Maybe a small rise. Good news.",
  },
  5:  {
    title: 'Build Momentum',
    instruction: "Feed again: discard to 25g, add 50g flour + 50g water. Try to feed at the same time each day to establish rhythm.",
    tip: "Consistency in timing helps the wild yeast population stabilise into a predictable pattern.",
    expect: "The starter should smell noticeably sour or yeasty. That tang is lactic acid bacteria doing their job.",
  },
  6:  {
    title: 'Establish Rhythm',
    instruction: "Feed once (discard to 25g, add 50g + 50g). Mark your jar with a rubber band or tape at the current level — this lets you track the rise precisely.",
    tip: "A marker is the single best tool for understanding your starter. No marker = no data.",
    expect: "Rise of 25–75% above the start line within 8–12h of feeding.",
  },
  7:  {
    title: 'One Week!',
    instruction: "Feed again. If your starter is doubling within 8–12h, upgrade to a 1:1:1 ratio — 25g starter, 25g flour, 25g water.",
    tip: "A doubling starter is a great sign. Don't panic if it's not there yet — temperature, flour type, and your local wild yeast population all play a role.",
    expect: "Consistent bubble pattern. Possible doubling. A more complex smell than last week.",
  },
  8:  {
    title: 'Refine',
    instruction: "Feed 1:1:1 again. This time, mark the start level and watch for the peak — maximum height before it begins to deflate.",
    tip: "Peak time at 22°C on a 1:1:1 feed should be 4–8h. Faster means more active. The peak is when baking power is highest.",
    expect: "A clear dome at peak, surrounded by bubbles on the surface.",
  },
  9:  {
    title: 'Strengthen',
    instruction: "If it's been doubling consistently, step up to 1:2:2 — 25g starter, 50g flour, 50g water. Feed once.",
    tip: "A higher ratio (more food) slows the peak but builds a stronger, more flavourful culture. Hydration stays at 100%.",
    expect: "Peak in 8–12h on the 1:2:2 ratio.",
  },
  10: {
    title: 'Taste Test',
    instruction: "Feed 1:2:2. After it peaks, take a tiny taste — just a small touch to your finger. It should be tangy, complex, a little yogurty.",
    tip: "That sour flavour is lactic acid bacteria at work. The balance between lactic and acetic acid is what gives bread its depth.",
    expect: "Tangy smell. Dome visible. Good surface structure. You're close.",
  },
  11: {
    title: 'Float Test Prep',
    instruction: "Feed 1:2:2. When it reaches peak, drop a small spoonful into a glass of water — that's the float test. Does it float?",
    tip: "If it floats, it's gassed up enough to leaven bread. If it sinks, it just needs a bit more time. Not a hard fail.",
    expect: "Float test pass, or close to it. Consistent doubling on 1:2:2.",
  },
  12: {
    title: 'Float Test',
    instruction: "Feed 1:2:2. Do the float test again at peak. If it floats consistently across 2 tests, your starter is ready to bake with.",
    tip: "Consistent float + doubling + complex aroma = the three-part readiness check. All three together = go.",
    expect: "Float test pass. Consistent doubling. Home stretch.",
  },
  13: {
    title: 'Final Push',
    instruction: "Step up to 1:3:3 — 25g starter, 75g flour, 75g water. This mimics pre-bake feeding ratios. Observe peak time — should be 8–14h.",
    tip: "If it handles 1:3:3 well, it can handle bread baking conditions. This is the final stress test before graduation.",
    expect: "Active rise. Complex tangy aroma. A good dome at peak.",
  },
  14: {
    title: 'Graduation Day!',
    instruction: "Feed 1:3:3 one final time. If it doubles, passes the float test, and smells great — it's ready. Name it something good.",
    tip: "You've spent 14 days cultivating a living ecosystem from flour and water. It's almost impossible to kill a starter. You've done the hard part.",
    expect: "A thriving, active starter ready for its first AI analysis.",
  },
}

const SMELL_OPTIONS    = ['none', 'musty', 'sour', 'yeasty', 'acidic', 'complex']
const BUBBLE_OPTIONS   = ['none', 'few', 'moderate', 'lots']
const RISE_OPTIONS_LOG = ['none', 'slight', 'doubled', 'more than doubled']
const FLOUR_OPTIONS    = ['All-Purpose', 'Bread Flour', 'Whole Wheat', 'Rye', 'Spelt', 'Mix']
const WATER_OPTIONS    = ['Tap (chlorinated)', 'Filtered', 'Bottled', 'Well water']

// ── Readiness flowchart ──────────────────────────────────────
function ReadinessCheck() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])

  const questions = [
    {
      q: 'After feeding, does it bubble and at least double in size within 8–12 hours?',
      hint: 'Mark your jar so you can see exactly how much it rises.',
      no: 'Keep feeding at 1:2:2 for another 1–2 days. Rise comes with a stronger culture.',
    },
    {
      q: 'Does it smell complex — tangy, yeasty, maybe slightly vinegary?',
      hint: 'Think yogurt or beer, not just flour.',
      no: 'Smell develops over a few more feeds. The lactic acid bacteria need more time to establish.',
    },
    {
      q: 'Does the float test pass? Drop a spoonful in water — does it float?',
      hint: 'Do this at peak, not before.',
      no: 'Close! One or two more days of consistent feeding usually gets it there.',
    },
  ]

  const answer = (v: boolean) => {
    const next = [...answers, v]
    setAnswers(next)
    if (!v || next.length >= questions.length) {
      setStep(questions.length) // jump to result
    } else {
      setStep(next.length)
    }
  }

  const reset = () => { setStep(0); setAnswers([]) }
  const allYes = answers.length === 3 && answers.every(Boolean)
  const firstNo = answers.findIndex(a => !a)

  if (step < questions.length) {
    const q = questions[step]
    return (
      <Card className="p-5">
        <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-1">Readiness Check · {step + 1} of {questions.length}</div>
        <div className="w-full bg-gray-100 rounded-full h-1 mb-4 overflow-hidden">
          <div className="h-full bg-[#D69A3A] rounded-full transition-all" style={{ width: `${(step / questions.length) * 100}%` }} />
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-1">{q.q}</p>
        <p className="text-xs text-gray-400 mb-4 italic">{q.hint}</p>
        <div className="flex gap-3">
          <button onClick={() => answer(true)}
            className="flex-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors">
            ✓ Yes
          </button>
          <button onClick={() => answer(false)}
            className="flex-1 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors">
            Not yet
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-3">Readiness Check · Result</div>
      {allYes ? (
        <div className="text-center py-2">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm font-black text-emerald-700 mb-1">Your starter is ready to bake with!</p>
          <p className="text-xs text-gray-500">Graduate it when you're done with Day 14 to unlock full AI analysis.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-bold text-amber-700 mb-1">Not quite yet — keep feeding</p>
          <p className="text-xs text-gray-500 mb-1">{firstNo >= 0 ? questions[firstNo].no : ''}</p>
          <p className="text-xs text-gray-400">This is normal. Some starters take a few extra days.</p>
        </div>
      )}
      <button onClick={reset} className="mt-4 text-xs text-[#D69A3A] underline block">Check again</button>
    </Card>
  )
}

// ── Feed reminder picker ─────────────────────────────────────
function ReminderPicker({ journeyId, journeyName, onDone }: { journeyId: string; journeyName: string; onDone: () => void }) {
  const { addReminder } = useStarters()
  const [set, setSet] = useState(false)
  const [hours, setHours] = useState<number | null>(null)

  const handleSet = (h: number) => {
    addReminder(journeyId, journeyName, new Date(Date.now() + h * 60 * 60 * 1000))
    setHours(h)
    setSet(true)
  }

  if (set) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onDone}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
          <p className="font-bold text-gray-800 mb-1">Reminder set for {hours}h from now</p>
          <p className="text-xs text-gray-400 mb-5">We'll ping you when it's time to feed again.</p>
          <Button className="w-full" onClick={onDone}>Continue to next day →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onDone}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-[#D69A3A]" />
          <span className="text-sm font-black text-gray-800">Set a feeding reminder?</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">When should we remind you to feed {journeyName} again?</p>
        <div className="flex gap-2 mb-4">
          {[8, 12, 24].map(h => (
            <button key={h} onClick={() => handleSet(h)}
              className="flex-1 py-3 rounded-xl bg-[rgba(214,154,58,0.08)] border border-[rgba(214,154,58,0.25)] text-sm font-bold text-gray-700 hover:bg-[#D69A3A] hover:text-white hover:border-[#D69A3A] transition-all">
              {h}h
            </button>
          ))}
        </div>
        <button onClick={onDone} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors">
          Not now →
        </button>
      </div>
    </div>
  )
}

// ── Journey PDF export ───────────────────────────────────────
function exportJourneyPDF(journey: StarterJourney) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const gold: [number, number, number] = [214, 154, 58]
  const dark: [number, number, number] = [17, 17, 17]
  const mid:  [number, number, number] = [100, 100, 100]
  const light: [number, number, number] = [200, 200, 200]
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const colW = pageW - margin * 2

  // Header band
  doc.setFillColor(...dark)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('BREADAGAIN', margin, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gold)
  doc.text('14-DAY STARTER INCUBATION LOG', margin, 18)
  doc.setTextColor(160, 160, 160)
  doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), pageW - margin, 18, { align: 'right' })

  let y = 36

  // Starter info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...dark)
  doc.text(journey.name, margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mid)
  const started = new Date(journey.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Started: ${started}  ·  Flour: ${journey.flourType.join(', ')}  ·  Water: ${journey.waterType}  ·  ${journey.targetHydration}% hydration`, margin, y)
  y += 8

  // Gold divider
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // Column config
  const cx = {
    day:  margin,
    date: margin + 12,
    fed:  margin + 38,
    bub:  margin + 52,
    rise: margin + 72,
    smell: margin + 93,
    obs:  margin + 114,
  }

  // Table header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...gold)
  const headers: [string, number][] = [
    ['DAY', cx.day], ['DATE', cx.date], ['FED', cx.fed],
    ['BUBBLES', cx.bub], ['RISE', cx.rise], ['SMELL', cx.smell], ['OBSERVATIONS', cx.obs],
  ]
  headers.forEach(([label, x]) => doc.text(label, x, y))
  y += 3
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 4.5

  // Data rows
  for (let day = 1; day <= 14; day++) {
    if (y > 270) { doc.addPage(); y = 20 }
    const log = journey.logs.find(l => l.day === day)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...dark)
    doc.text(String(day), cx.day, y)

    if (log) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...mid)
      doc.text(new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), cx.date, y)

      if (log.fed) {
        doc.setTextColor(16, 185, 129)
        doc.text('✓', cx.fed + 2, y)
      } else {
        doc.setTextColor(...light)
        doc.text('–', cx.fed + 2, y)
      }
      doc.setTextColor(...mid)
      doc.text(log.bubbles || '–', cx.bub, y)
      doc.text(log.rise || '–', cx.rise, y)
      doc.text(log.smell || '–', cx.smell, y)

      // Build observations text including feed times, peak timing, and second feed
      const fmt12 = (t: string) => {
        const h = parseInt(t.split(':')[0], 10)
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
        return `${h12}${h >= 12 ? 'pm' : 'am'}`
      }
      const obsParts: string[] = []
      if (log.feedTime) obsParts.push(`Fed ${fmt12(log.feedTime)}`)
      if (log.peaked && log.peakHours) obsParts.push(`peaked ${log.peakHours}h`)
      else if (log.peaked) obsParts.push('peaked')
      if (log.fedTwice) {
        const f2: string[] = []
        if (log.feed2Time) f2.push(`2nd feed ${fmt12(log.feed2Time)}`)
        else f2.push('2nd feed')
        if (log.feed2peaked && log.feed2peakHours) f2.push(`peaked ${log.feed2peakHours}h`)
        else if (log.feed2peaked) f2.push('peaked')
        obsParts.push(f2.join(', '))
      }
      if (log.observations) obsParts.push(log.observations)
      const obsText = obsParts.join(' · ')

      if (obsText) {
        const obsW = colW - (cx.obs - margin)
        const lines = doc.splitTextToSize(obsText, obsW) as string[]
        doc.setTextColor(...mid)
        doc.text(lines[0] ?? '', cx.obs, y)
        for (let li = 1; li < Math.min(lines.length, 2); li++) {
          y += 4
          if (y > 270) { doc.addPage(); y = 20 }
          doc.text(lines[li], cx.obs, y)
        }
      } else {
        doc.setTextColor(...light)
        doc.text('–', cx.obs, y)
      }
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...light)
      doc.text('not logged', cx.date, y)
    }

    y += 5.5
    doc.setDrawColor(240, 240, 240)
    doc.setLineWidth(0.1)
    doc.line(margin, y - 1, pageW - margin, y - 1)
  }

  // Footer
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 245, 245)
    doc.rect(0, 286, pageW, 11, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Breadagain · breadagain.com', margin, 292)
    doc.text(`Page ${p} of ${pages}`, pageW - margin, 292, { align: 'right' })
  }

  doc.save(`${journey.name.replace(/\s+/g, '_')}_14day_log.pdf`)
}

// ── Pill selector ────────────────────────────────────────────
function PillSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${value === o ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-500 hover:border-[#D69A3A]/40'}`}
        >{o}</button>
      ))}
    </div>
  )
}

// ── New Journey Setup Form ───────────────────────────────────
function SetupForm() {
  const { user } = useAuth()
  const { addJourney } = useStarters()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [flour, setFlour] = useState<string[]>(['Bread Flour'])
  const [water, setWater] = useState('Filtered')
  const [hydration, setHydration] = useState(100)
  const [error, setError] = useState('')

  const handleStart = () => {
    if (!name.trim()) { setError('Give your starter a name — it deserves one.'); return }
    const j = addJourney({ name: name.trim(), flourType: flour, waterType: water, targetHydration: hydration, startDate: new Date() })
    navigate(`/grow/${j.id}`)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-16 flex-1 w-full">

        <div className="flex items-center gap-2 mb-3">
          <Badge className="mb-0">New Starter Journey</Badge>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
            ✦ Free
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-2">Day 1 of 14</h1>
        <p className="text-gray-400 text-sm mb-2">A step-by-step guide to growing your first sourdough starter from scratch. We check in every day, explain the science, and track your progress.</p>
        <p className="text-xs text-emerald-600 font-semibold mb-8">100% free — no credit card needed.</p>

        {/* Science teaser */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '🧬', label: 'Daily science', desc: 'Explained simply' },
            { icon: '📊', label: '14-day log', desc: 'Track every feed' },
            { icon: '🤖', label: 'AI analysis', desc: 'On graduation' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-xs font-bold text-gray-700">{label}</div>
              <div className="text-[10px] text-gray-400">{desc}</div>
            </div>
          ))}
        </div>

        <Card className="p-6 space-y-5">
          <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase">Starter Details</div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name your starter</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#D69A3A]"
              placeholder="e.g. Brutus, Doughlores, Mr Bubbles..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Flour type(s)</label>
            <div className="flex flex-wrap gap-2">
              {FLOUR_OPTIONS.map(f => (
                <button key={f} type="button"
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${flour.includes(f) ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/50'}`}
                  onClick={() => setFlour(cur => cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f])}
                >{f}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Target hydration: <span className="text-[#D69A3A]">{hydration}%</span>
              <span className="text-gray-400 font-normal ml-1">({hydration === 100 ? 'equal parts flour & water' : hydration < 100 ? 'stiffer dough' : 'more liquid'})</span>
            </label>
            <input type="range" min={50} max={125} value={hydration} onChange={e => setHydration(Number(e.target.value))} className="w-full accent-[#D69A3A]" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>50% stiff</span><span>125% very wet</span></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Water type</label>
            <div className="flex flex-wrap gap-2">
              {WATER_OPTIONS.map(w => (
                <button key={w} type="button"
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${water === w ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/50'}`}
                  onClick={() => setWater(w)}
                >{w}</button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 flex gap-2 items-center"><AlertTriangle size={14} />{error}</p>}

          <Button className="w-full" onClick={handleStart}>
            <Sprout size={15} /> Start Day 1 — it's free →
          </Button>
        </Card>
      </div>
      <Footer />
    </div>
  )
}

// ── Journey tracker ──────────────────────────────────────────
function JourneyTracker() {
  const { id } = useParams<{ id: string }>()
  const { dataLoaded, journeys, updateJourneyLog, graduateJourney, abandonJourney, addStarter } = useStarters()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const journey = journeys.find(j => j.id === id)

  const [activeDay, setActiveDay] = useState<number>(1)
  const [saving, setSaving] = useState(false)
  const [graduating, setGraduating] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [showReminder, setShowReminder] = useState(false)

  const [fed, setFed] = useState(false)
  const [observations, setObservations] = useState('')
  const [smell, setSmell] = useState('none')
  const [bubbles, setBubbles] = useState('none')
  const [rise, setRise] = useState('none')
  const [imageUrl, setImageUrl] = useState('')
  // Feed timing
  const [feedTime, setFeedTime] = useState('')
  const [peaked, setPeaked] = useState<boolean>(false)
  const [peakHours, setPeakHours] = useState<string>('')
  // Second feed
  const [fedTwice, setFedTwice] = useState(false)
  const [feed2Time, setFeed2Time] = useState('')
  const [feed2bubbles, setFeed2bubbles] = useState('none')
  const [feed2rise, setFeed2rise] = useState('none')
  const [feed2smell, setFeed2smell] = useState('none')
  const [feed2peaked, setFeed2peaked] = useState<boolean>(false)
  const [feed2peakHours, setFeed2peakHours] = useState<string>('')

  // Initialize activeDay and form fields once journey loads from localStorage
  const initialized = useRef(false)
  useEffect(() => {
    if (journey && !initialized.current) {
      initialized.current = true
      const d = journey.currentDay
      setActiveDay(d)
      const log = journey.logs.find(l => l.day === d)
      setFed(log?.fed ?? false)
      setObservations(log?.observations ?? '')
      setSmell(log?.smell ?? 'none')
      setBubbles(log?.bubbles ?? 'none')
      setRise(log?.rise ?? 'none')
      setImageUrl(log?.imageUrl ?? '')
      setFeedTime(log?.feedTime ?? '')
      setPeaked(log?.peaked ?? false)
      setPeakHours(log?.peakHours?.toString() ?? '')
      setFedTwice(log?.fedTwice ?? false)
      setFeed2Time(log?.feed2Time ?? '')
      setFeed2bubbles(log?.feed2bubbles ?? 'none')
      setFeed2rise(log?.feed2rise ?? 'none')
      setFeed2smell(log?.feed2smell ?? 'none')
      setFeed2peaked(log?.feed2peaked ?? false)
      setFeed2peakHours(log?.feed2peakHours?.toString() ?? '')
    }
  }, [journey])

  const switchDay = (d: number) => {
    setActiveDay(d)
    setJustSaved(false)
    setShowReminder(false)
    const log = journey?.logs.find(l => l.day === d)
    setFed(log?.fed ?? false)
    setObservations(log?.observations ?? '')
    setSmell(log?.smell ?? 'none')
    setBubbles(log?.bubbles ?? 'none')
    setRise(log?.rise ?? 'none')
    setImageUrl(log?.imageUrl ?? '')
    setFeedTime(log?.feedTime ?? '')
    setPeaked(log?.peaked ?? false)
    setPeakHours(log?.peakHours?.toString() ?? '')
    setFedTwice(log?.fedTwice ?? false)
    setFeed2Time(log?.feed2Time ?? '')
    setFeed2bubbles(log?.feed2bubbles ?? 'none')
    setFeed2rise(log?.feed2rise ?? 'none')
    setFeed2smell(log?.feed2smell ?? 'none')
    setFeed2peaked(log?.feed2peaked ?? false)
    setFeed2peakHours(log?.feed2peakHours?.toString() ?? '')
  }

  const handleFile = useCallback(async (file: File) => {
    const compressed = await compressImage(file)
    const dataUrl = `data:${compressed.mimeType};base64,${compressed.base64}`
    setImageUrl(dataUrl)
  }, [])

  const handleSaveLog = () => {
    if (!journey) return
    setSaving(true)
    const ph = parseFloat(peakHours)
    const f2ph = parseFloat(feed2peakHours)
    const log: DailyLog = {
      day: activeDay, date: new Date(), fed, observations, smell, bubbles, rise,
      ...(fed ? {
        ...(feedTime ? { feedTime } : {}),
        peaked,
        ...(peaked && !isNaN(ph) ? { peakHours: ph } : {}),
        fedTwice,
        ...(fedTwice ? {
          ...(feed2Time ? { feed2Time } : {}),
          feed2bubbles, feed2rise, feed2smell, feed2peaked,
          ...(feed2peaked && !isNaN(f2ph) ? { feed2peakHours: f2ph } : {}),
        } : {}),
      } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    }
    updateJourneyLog(journey.id, log)
    setSaving(false)
    setJustSaved(true)
    if (activeDay < 14) setShowReminder(true)
  }

  const handleGraduate = () => {
    if (!journey || !user) return
    const starter = addStarter({
      name: journey.name,
      age: 'under-1-month',
      flourType: journey.flourType,
      waterType: journey.waterType,
      targetHydration: journey.targetHydration,
    })
    graduateJourney(journey.id, starter.id)
    navigate(`/analyze?starter=${starter.id}`)
  }

  // Still fetching from Supabase — don't show "not found" yet
  if (!dataLoaded) return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#D69A3A]/20 border-t-[#D69A3A] animate-spin" />
    </div>
  )

  if (!journey) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Journey not found. <button onClick={() => navigate('/grow')} className="text-[#D69A3A] underline">Go to my journeys</button></p>
    </div>
  )

  const guide = DAY_GUIDE[activeDay]
  const loggedDays = new Set(journey.logs.map(l => l.day))
  const daysUnlocked = Math.min(journey.currentDay, 14)
  const isGraduated = journey.status === 'graduated'
  const isDay14Complete = loggedDays.has(14)

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16 flex-1 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sprout size={14} className="text-[#D69A3A]" />
              <span className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase">Incubation Journal</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter">{journey.name}</h1>
            <p className="text-xs text-gray-400">Started {new Date(journey.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportJourneyPDF(journey)}
              title="Download log so far"
              className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:border-[#D69A3A] hover:text-[#D69A3A] transition-all"
            >
              <Download size={15} />
            </button>
            {isGraduated ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={12} /> Graduated
              </span>
            ) : (
              <span className="text-xs font-bold text-[#D69A3A] bg-[rgba(214,154,58,0.1)] px-3 py-1.5 rounded-full">
                Day {journey.currentDay} of 14
              </span>
            )}
          </div>
        </div>

        {/* Day timeline */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {Array.from({ length: 14 }, (_, i) => i + 1).map(d => {
            const logged = loggedDays.has(d)
            const isActive = d === activeDay
            const locked = d > daysUnlocked
            return (
              <button key={d} disabled={locked}
                onClick={() => switchDay(d)}
                className={`flex-shrink-0 w-9 h-9 rounded-full text-xs font-bold transition-all border
                  ${isActive ? 'bg-[#D69A3A] text-white border-[#D69A3A] scale-110' :
                    logged ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    locked ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' :
                    'bg-white text-gray-500 border-gray-200 hover:border-[#D69A3A]/50'}`}
              >
                {logged && !isActive ? '✓' : d}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-[#D69A3A] rounded-full transition-all" style={{ width: `${(loggedDays.size / 14) * 100}%` }} />
        </div>

        {/* ── Graduated screen ── */}
        {isGraduated ? (
          <div className="space-y-5">
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Graduated!</h2>
              <p className="text-gray-500 text-sm mb-6">{journey.name} completed the full 14-day journey. It's now registered as a starter and ready for full AI analysis.</p>
              <div className="space-y-3">
                <Button className="w-full" onClick={() => navigate(`/analyze?starter=${journey.graduatedStarterId}`)}>
                  <Wheat size={15} /> Analyse {journey.name} →
                </Button>
                <button onClick={() => exportJourneyPDF(journey)}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-[#D69A3A] hover:text-[#D69A3A] transition-all flex items-center justify-center gap-2">
                  <Download size={15} /> Download 14-day feeding log (PDF)
                </button>
              </div>
            </Card>

            {/* Maintenance guide */}
            <Card className="p-5">
              <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-4">What's your plan?</div>
              <div className="space-y-3">
                {[
                  { label: 'Baking tomorrow', action: 'Refresh now, leave at room temp overnight. Use at peak.', icon: '🍞' },
                  { label: 'Baking next week', action: 'Refrigerate after peak. Feed weekly to keep it alive.', icon: '❄️' },
                  { label: 'Not baking for a while', action: 'Freeze a portion or dry it on parchment — it lasts for years.', icon: '💤' },
                ].map(({ label, action, icon }) => (
                  <div key={label} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-0.5">{label}</div>
                      <div className="text-xs text-gray-500">{action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upgrade CTA */}
            <Card className="p-5 bg-gradient-to-br from-[#111] to-[#222] border-0 text-white">
              <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-2">Ready to go deeper?</div>
              <h3 className="text-lg font-black tracking-tight mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-gray-300 mb-4">Unlimited AI analyses, historical health tracking, PDF reports, and priority access to new features.</p>
              <button onClick={() => navigate('/#pricing')}
                className="w-full py-3 rounded-xl bg-[#D69A3A] text-white text-sm font-bold hover:bg-[#C98A3D] transition-colors flex items-center justify-center gap-2">
                View Pro plans <ArrowRight size={14} />
              </button>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Day 14 graduation callout ── */}
            {isDay14Complete && !isGraduated && (
              <Card className="p-5 border-2 border-[#D69A3A] bg-gradient-to-br from-[rgba(214,154,58,0.04)] to-white">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">🎓</div>
                  <h2 className="text-lg font-black tracking-tight mb-1">Day 14 complete!</h2>
                  <p className="text-sm text-gray-500">Your 14-day journal is done. If your starter is active and passing the float test, graduate it to run its first AI analysis.</p>
                </div>
                <div className="space-y-3">
                  <Button className="w-full" onClick={handleGraduate}>
                    <Wheat size={14} /> Graduate & Run First Analysis
                  </Button>
                  <button onClick={() => exportJourneyPDF(journey)}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-[#D69A3A] hover:text-[#D69A3A] transition-all flex items-center justify-center gap-2">
                    <Download size={14} /> Download 14-day feeding log (PDF)
                  </button>
                </div>
                <div className="mt-4 p-3 bg-[rgba(214,154,58,0.06)] rounded-xl">
                  <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-2">Upgrade for more</div>
                  <p className="text-xs text-gray-500 mb-2">Free users get 1 analysis per starter. Upgrade to Pro for unlimited analyses, health tracking over time, and PDF reports.</p>
                  <button onClick={() => navigate('/#pricing')}
                    className="text-xs text-[#D69A3A] font-bold flex items-center gap-1 hover:underline">
                    View pricing <ArrowRight size={11} />
                  </button>
                </div>
              </Card>
            )}

            {/* Daily guide card */}
            <Card className="p-5 border-l-4 border-l-[#D69A3A]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-0.5">Day {activeDay}</div>
                  <h2 className="text-lg font-black tracking-tight">{guide.title}</h2>
                </div>
                {loggedDays.has(activeDay) && (
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                <J text={guide.instruction} />
              </p>
              <div className="bg-[rgba(214,154,58,0.06)] rounded-lg p-3 mb-3">
                <span className="text-[10px] font-bold text-[#D69A3A] uppercase tracking-widest">Tip · </span>
                <span className="text-xs text-gray-600"><J text={guide.tip} /></span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">What to expect · </span>
                <span className="text-xs text-gray-500">{guide.expect}</span>
              </div>
            </Card>

            {/* Readiness check — Day 11+ */}
            {activeDay >= 11 && <ReadinessCheck />}

            {/* Daily log form */}
            <Card className="p-5 space-y-4">
              <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Log Day {activeDay}</div>

              {/* Did you feed today? */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Did you feed today?</label>
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <button key={String(v)} type="button" onClick={() => { setFed(v); if (!v) { setFedTwice(false); setPeaked(false) } }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${fed === v ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/40'}`}
                    >
                      {v ? <><CheckCircle2 size={14} /> Yes</> : <><Circle size={14} /> Not yet</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed 1 details — only shown after feeding */}
              {fed && (
                <div className="border border-[#D69A3A]/20 bg-[#D69A3A]/[0.03] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase">Feed 1</div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-gray-400 font-semibold">Time of feed</span>
                      <AlarmClockPicker value={feedTime} onChange={setFeedTime} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Bubbles visible?</label>
                    <PillSelect options={BUBBLE_OPTIONS} value={bubbles} onChange={setBubbles} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Rise observed</label>
                    <PillSelect options={RISE_OPTIONS_LOG} value={rise} onChange={setRise} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Smell</label>
                    <PillSelect options={SMELL_OPTIONS} value={smell} onChange={setSmell} />
                  </div>

                  {/* Peak timing */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Did it reach peak?</label>
                    <div className="flex gap-3">
                      {[true, false].map(v => (
                        <button key={String(v)} type="button" onClick={() => setPeaked(v)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${peaked === v ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/40'}`}
                        >
                          {v ? <><CheckCircle2 size={14} /> Yes</> : <><Circle size={14} /> Not yet</>}
                        </button>
                      ))}
                    </div>
                    {peaked && (
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Time to peak:</label>
                        <input
                          type="number" min="0.5" max="48" step="0.5"
                          value={peakHours} onChange={e => setPeakHours(e.target.value)}
                          placeholder="e.g. 6"
                          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D69A3A]"
                        />
                        <span className="text-xs text-gray-400">hours</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fed twice? */}
              {fed && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Fed twice today?</label>
                  <div className="flex gap-3">
                    {[true, false].map(v => (
                      <button key={String(v)} type="button" onClick={() => setFedTwice(v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${fedTwice === v ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/40'}`}
                      >
                        {v ? <><CheckCircle2 size={14} /> Yes</> : <><Circle size={14} /> No</>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Feed 2 details */}
              {fed && fedTwice && (
                <div className="border border-[#D69A3A]/20 bg-[#D69A3A]/[0.03] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase">Feed 2</div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-gray-400 font-semibold">Time of feed</span>
                      <AlarmClockPicker value={feed2Time} onChange={setFeed2Time} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Bubbles visible?</label>
                    <PillSelect options={BUBBLE_OPTIONS} value={feed2bubbles} onChange={setFeed2bubbles} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Rise observed</label>
                    <PillSelect options={RISE_OPTIONS_LOG} value={feed2rise} onChange={setFeed2rise} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Smell</label>
                    <PillSelect options={SMELL_OPTIONS} value={feed2smell} onChange={setFeed2smell} />
                  </div>

                  {/* Feed 2 peak */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Did it reach peak?</label>
                    <div className="flex gap-3">
                      {[true, false].map(v => (
                        <button key={String(v)} type="button" onClick={() => setFeed2peaked(v)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${feed2peaked === v ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/40'}`}
                        >
                          {v ? <><CheckCircle2 size={14} /> Yes</> : <><Circle size={14} /> Not yet</>}
                        </button>
                      ))}
                    </div>
                    {feed2peaked && (
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Time to peak:</label>
                        <input
                          type="number" min="0.5" max="48" step="0.5"
                          value={feed2peakHours} onChange={e => setFeed2peakHours(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D69A3A]"
                        />
                        <span className="text-xs text-gray-400">hours</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General observations (days without feeding still show these) */}
              {!fed && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Bubbles visible?</label>
                    <PillSelect options={BUBBLE_OPTIONS} value={bubbles} onChange={setBubbles} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Rise observed</label>
                    <PillSelect options={RISE_OPTIONS_LOG} value={rise} onChange={setRise} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Smell</label>
                    <PillSelect options={SMELL_OPTIONS} value={smell} onChange={setSmell} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Observations (optional)</label>
                <textarea value={observations} onChange={e => setObservations(e.target.value)}
                  rows={2} placeholder="Anything unusual? Colour, texture, timing..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#D69A3A] resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Photo (optional)</label>
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="Day" className="w-full max-h-40 object-cover rounded-xl" />
                    <button onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg hover:bg-black/70">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#D69A3A]/40 transition-colors">
                    <Upload size={20} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-xs text-gray-400">Add a photo for today</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {/* Save button or post-save state */}
              {justSaved ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold py-1">
                  <CheckCircle2 size={16} />
                  Day {activeDay} logged!
                  {activeDay === 14 && <span className="text-gray-400 font-normal text-xs ml-1">See graduation options below.</span>}
                </div>
              ) : (
                <Button className="w-full" onClick={handleSaveLog} disabled={saving}>
                  {saving ? 'Saving…' : activeDay < 14 ? `Save Day ${activeDay}` : 'Save Day 14'}
                </Button>
              )}

              {/* Reminder modal — blocks navigation to next day */}
              {showReminder && (
                <ReminderPicker
                  journeyId={journey.id}
                  journeyName={journey.name}
                  onDone={() => { setShowReminder(false); switchDay(activeDay + 1) }}
                />
              )}
            </Card>

            {/* Graduate / Abandon — Day 7+ */}
            {journey.currentDay >= 7 && !isDay14Complete && (
              <Card className="p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Ready to advance?</div>
                {graduating ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">This will register <strong>{journey.name}</strong> as a full starter and take you to its first analysis. The incubation journal is kept.</p>
                    {/* Download partial log before graduating */}
                    <button onClick={() => exportJourneyPDF(journey)}
                      className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold hover:border-[#D69A3A] hover:text-[#D69A3A] transition-all flex items-center justify-center gap-2">
                      <Download size={13} /> Download log so far (Day 1–{journey.currentDay - 1})
                    </button>
                    <div className="flex gap-3">
                      <Button className="flex-1" onClick={handleGraduate}><Wheat size={14} /> Graduate & Analyse</Button>
                      <Button variant="outline" onClick={() => setGraduating(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setGraduating(true)}
                      className="flex-1 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors">
                      🎓 Graduate starter early
                    </button>
                    <button onClick={() => { if (window.confirm('Abandon this journey? The journal will be kept but marked abandoned.')) abandonJourney(journey.id) }}
                      className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-400 text-sm hover:border-red-200 hover:text-red-400 transition-colors">
                      Abandon
                    </button>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

// ── Journey lobby (shown when returning to /grow) ────────────
function JourneyLobby() {
  const { user } = useAuth()
  const { dataLoaded, journeys, abandonJourney, reviveJourney } = useStarters()
  const navigate = useNavigate()
  const [showSetup, setShowSetup] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState<string | null>(null)
  const [confirmRevive, setConfirmRevive] = useState<string | null>(null)

  const activeJourneys  = journeys.filter(j => j.status === 'active')
  const pastJourneys    = journeys.filter(j => j.status !== 'active')
  const isPro           = user?.tier !== 'free'
  const hasActive       = activeJourneys.length > 0

  if (showSetup) return <SetupForm />

  if (!dataLoaded) return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#D69A3A]/20 border-t-[#D69A3A] animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-16 flex-1 w-full">

        <Badge className="mb-4">Grow Journey</Badge>
        <h1 className="text-3xl font-black tracking-tighter mb-2">Your starters</h1>
        <p className="text-gray-400 text-sm mb-8">Pick up where you left off, download your log, or start something new.</p>

        {/* ── Active journeys ── */}
        {activeJourneys.length > 0 && (
          <div className="space-y-3 mb-6">
            {activeJourneys.map(j => (
              <Card key={j.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Sprout size={12} className="text-[#D69A3A]" />
                      <span className="text-[10px] font-bold text-[#D69A3A] uppercase tracking-widest">Active</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight">{j.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Day {j.currentDay} of 14 · {(j.logs?.length ?? 0)} day{(j.logs?.length ?? 0) !== 1 ? 's' : ''} logged
                    </p>
                  </div>
                  <span className="text-3xl font-black text-[#D69A3A] leading-none">
                    {j.currentDay}<span className="text-sm font-normal text-gray-300">/14</span>
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-[#D69A3A] rounded-full transition-all"
                    style={{ width: `${((j.logs?.length ?? 0) / 14) * 100}%` }} />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => navigate(`/grow/${j.id}`)}>
                    Continue Day {j.currentDay} →
                  </Button>
                  <button onClick={() => exportJourneyPDF(j)} title="Download log so far"
                    className="px-3 rounded-xl border border-gray-200 text-gray-400 hover:border-[#D69A3A] hover:text-[#D69A3A] transition-all flex items-center">
                    <Download size={15} />
                  </button>
                </div>

                {/* Abandon / restart */}
                {confirmAbandon === j.id ? (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl">
                    <p className="text-xs text-red-700 font-semibold mb-2">
                      Abandon <strong>{j.name}</strong>? Your log is saved and you can download it any time.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { abandonJourney(j.id); setConfirmAbandon(null); setShowSetup(true) }}
                        className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
                        Abandon & start fresh
                      </button>
                      <button onClick={() => setConfirmAbandon(null)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-50 transition-colors">
                        Keep going
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmAbandon(j.id)}
                    className="mt-2 text-[10px] text-gray-300 hover:text-red-400 transition-colors w-full text-center py-1">
                    Restart from zero
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── Past journeys ── */}
        {pastJourneys.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Past journeys</div>
            <div className="space-y-2">
              {pastJourneys.map(j => (
                <div key={j.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700">{j.name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        j.status === 'graduated' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}>{j.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{j.logs?.length ?? 0} days logged</p>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <button onClick={() => exportJourneyPDF(j)} title="Download log"
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-[#D69A3A] hover:text-[#D69A3A] transition-all">
                      <Download size={14} />
                    </button>
                    {j.status === 'abandoned' && (
                      <button
                        onClick={() => {
                          if (!isPro && hasActive) {
                            setConfirmRevive(j.id)
                          } else {
                            reviveJourney(j.id)
                            navigate(`/grow/${j.id}`)
                          }
                        }}
                        title="Revive this journey"
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-all">
                        <RotateCcw size={14} />
                      </button>
                    )}
                    {j.status === 'graduated' && j.graduatedStarterId && (
                      <button onClick={() => navigate(`/analyze?starter=${j.graduatedStarterId}`)}
                        title="Analyse this starter"
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-all">
                        <Wheat size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Revive conflict modal (free user, already has active) ── */}
        {confirmRevive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw size={18} className="text-emerald-500" />
                <span className="font-black text-base">Revive this journey?</span>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                You already have an active journey. Free accounts support one active journey at a time.
                Abandon your current one to revive this, or upgrade to Pro for unlimited.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (activeJourneys[0]) abandonJourney(activeJourneys[0].id)
                    reviveJourney(confirmRevive)
                    const revived = journeys.find(j => j.id === confirmRevive)
                    setConfirmRevive(null)
                    if (revived) navigate(`/grow/${revived.id}`)
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors">
                  Abandon current & revive this one
                </button>
                <button
                  onClick={() => navigate('/#pricing')}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  Upgrade to Pro <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setConfirmRevive(null)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Start another journey ── */}
        {hasActive && !isPro ? (
          /* Locked for free users who already have an active journey */
          <Card className="p-5 bg-gradient-to-br from-[#111] to-[#1c1c1c] border-0 text-white">
            <div className="text-[10px] font-bold tracking-widest text-[#D69A3A] uppercase mb-2">Pro feature</div>
            <h3 className="text-base font-black tracking-tight mb-1">Start a second starter</h3>
            <p className="text-sm text-gray-400 mb-4">
              Free accounts include one active grow journey. Upgrade to Pro for unlimited concurrent starters.
            </p>
            <button onClick={() => navigate('/#pricing')}
              className="w-full py-2.5 rounded-xl bg-[#D69A3A] text-white text-sm font-bold hover:bg-[#C98A3D] transition-colors flex items-center justify-center gap-2">
              View Pro plans <ArrowRight size={14} />
            </button>
            <p className="text-[10px] text-gray-600 text-center mt-3">
              Or{' '}
              <button onClick={() => setConfirmAbandon(activeJourneys[0].id)}
                className="underline text-gray-500 hover:text-gray-400 transition-colors">
                abandon your current journey
              </button>{' '}
              to start a new one for free.
            </p>
          </Card>
        ) : (
          <button onClick={() => setShowSetup(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-[rgba(214,154,58,0.3)] text-[#D69A3A] font-bold text-sm hover:border-[#D69A3A] hover:bg-[rgba(214,154,58,0.04)] transition-all flex items-center justify-center gap-2">
            <Sprout size={15} /> Start a new journey →
          </button>
        )}

      </div>
      <Footer />
    </div>
  )
}

// ── Route entry point ────────────────────────────────────────
export default function Grow() {
  const { id } = useParams<{ id?: string }>()
  const { dataLoaded, journeys } = useStarters()

  if (id) return <JourneyTracker />

  // Wait for Supabase before deciding lobby vs setup — avoids flash of wrong screen
  if (!dataLoaded) return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#D69A3A]/20 border-t-[#D69A3A] animate-spin" />
    </div>
  )

  if (journeys.length > 0) return <JourneyLobby />
  return <SetupForm />
}
