import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Activity, Clock, TrendingUp, BarChart3, Trash2, Download, Sprout, Bell, Snowflake, Timer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStarters } from '../context/StarterContext'
import { Card, HealthBar, ScoreLabel } from '../components/ui'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import FeedLogModal from '../components/FeedLogModal'
import ScoreTrendChart from '../components/ScoreTrendChart'
import AlarmClockPicker from '../components/AlarmClockPicker'
import { exportAllPDF } from '../lib/pdfExport'
import type { StarterProfile } from '../types'

// ── Bake timer helpers ───────────────────────────────────────
function parsePeakHours(str: string): number | null {
  if (!str) return null
  const m = str.match(/\+?(\d+(\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}
function tempAdjusted(baseHours: number, baseTemp: number, targetTemp: number): number {
  return baseHours * Math.pow(2, (baseTemp - targetTemp) / 10)
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Feeding Reminder Banner ──────────────────────────────────
function ReminderBanners() {
  const { reminders, dismissReminder } = useStarters()
  const now = new Date()
  const due = reminders.filter(r => !r.notified && new Date(r.feedAt) <= now)
  if (due.length === 0) return null
  return (
    <div className="space-y-2 mb-6">
      {due.map(r => (
        <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-[rgba(214,154,58,0.08)] border border-[#D69A3A]/30 rounded-xl">
          <div className="flex items-center gap-2 text-sm">
            <Bell size={14} className="text-[#D69A3A] flex-shrink-0" />
            <span><strong>{r.starterName}</strong> is due for a feed</span>
          </div>
          <button onClick={() => dismissReminder(r.id)} className="text-xs text-gray-400 hover:text-gray-700 font-semibold whitespace-nowrap">Dismiss</button>
        </div>
      ))}
    </div>
  )
}

// ── Onboarding checklist (shown until all steps are done) ────
function Onboarding() {
  const { starters, analyses, feeds, reminders } = useStarters()

  const steps = [
    {
      done: starters.length > 0,
      label: 'Add your first starter',
      detail: 'Give it a name and tell us how old it is.',
      action: '/analyze',
      cta: 'Check in a starter →',
    },
    {
      done: analyses.length > 0,
      label: 'Run your first analysis',
      detail: 'Upload a photo + answer 6 quick questions for an AI health score.',
      action: '/analyze',
      cta: 'Analyse now →',
    },
    {
      done: feeds.length > 0,
      label: 'Log a feeding',
      detail: 'Track your ratio, flour, and water every time you feed.',
      action: '/dashboard',
      cta: 'Log feed on a starter card →',
    },
    {
      done: reminders.length > 0,
      label: 'Set a feeding reminder',
      detail: 'Never forget to feed — tap the bell icon on any starter card.',
      action: '/dashboard',
      cta: 'Set reminder →',
    },
  ]

  const completedCount = steps.filter(s => s.done).length
  if (completedCount === steps.length) return null

  return (
    <div className="mb-8">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(214,154,58,0.1)] rounded-xl flex items-center justify-center">
              <Sprout size={18} className="text-[#D69A3A]" />
            </div>
            <div>
              <h2 className="font-black tracking-tight">Getting started</h2>
              <p className="text-xs text-gray-400">{completedCount} of {steps.length} steps done</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">{Math.round((completedCount / steps.length) * 100)}%</div>
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#D69A3A] rounded-full transition-all" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            s.done ? (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 opacity-50">
                <div className="w-6 h-6 rounded-full bg-[#D69A3A] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="text-sm font-medium text-gray-500 line-through">{s.label}</span>
              </div>
            ) : (
              <Link key={i} to={s.action}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#D69A3A]/30 hover:bg-[rgba(214,154,58,0.02)] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-[#D69A3A] transition-colors flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{s.label}</div>
                    <div className="text-xs text-gray-400">{s.detail}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#D69A3A] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-4">{s.cta}</span>
              </Link>
            )
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Starter Card ─────────────────────────────────────────────
function StarterCard({ starter }: { starter: StarterProfile }) {
  const { getAnalysesForStarter, getFeedsForStarter, deleteStarter, addReminder, updateStarter } = useStarters()
  const [showFeedModal, setShowFeedModal]   = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [showReminder, setShowReminder]     = useState(false)
  const [reminderHours, setReminderHours]   = useState(12)
  const [showBakeTimer, setShowBakeTimer]   = useState(false)
  const [bakeHour, setBakeHour]             = useState('08:00')
  const [bakeDay, setBakeDay]               = useState<'today' | 'tomorrow'>('tomorrow')
  const [timerTemp, setTimerTemp]           = useState(22)

  const analyses = getAnalysesForStarter(starter.id)
  const feeds    = getFeedsForStarter(starter.id)
  const latest   = analyses[0]

  // Average peak hours from last 5 feeds that have a peak time recorded
  const avgPeak = useMemo(() => {
    const nums = feeds.slice(0, 5).map(f => parsePeakHours(f.peakTime)).filter((n): n is number => n !== null)
    if (!nums.length) return null
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    // Use the average room temp from those same feeds as the base temperature
    const baseTemps = feeds.slice(0, 5).filter(f => parsePeakHours(f.peakTime) !== null).map(f => f.roomTemp).filter(Boolean)
    const baseTemp = baseTemps.length ? baseTemps.reduce((a, b) => a + b, 0) / baseTemps.length : 22
    return { avgHours: avg, baseTemp }
  }, [feeds])

  const bakeTimerResult = useMemo(() => {
    if (!avgPeak) return null
    const adjusted = tempAdjusted(avgPeak.avgHours, avgPeak.baseTemp, timerTemp)
    const now = new Date()
    const bake = new Date(now)
    const [h, m] = bakeHour.split(':').map(Number)
    bake.setHours(h, m, 0, 0)
    if (bakeDay === 'tomorrow' || bake <= now) bake.setDate(bake.getDate() + 1)
    const feed = new Date(bake.getTime() - adjusted * 3600 * 1000)
    return { feedTime: feed, bakeTime: bake, adjustedHours: Math.round(adjusted * 10) / 10 }
  }, [avgPeak, bakeHour, bakeDay, timerTemp])

  const handleSetReminder = () => {
    const feedAt = new Date(Date.now() + reminderHours * 60 * 60 * 1000)
    addReminder(starter.id, starter.name, feedAt)
    setShowReminder(false)
  }

  const toggleFridge = () => {
    if (starter.fridgeStatus === 'dormant') {
      updateStarter(starter.id, { fridgeStatus: 'active', fridgeRemovedAt: new Date() })
    } else {
      updateStarter(starter.id, { fridgeStatus: 'dormant', fridgeRemovedAt: undefined })
    }
  }

  const inFridge = starter.fridgeStatus === 'dormant'
  const daysSinceActivated = starter.fridgeRemovedAt
    ? Math.floor((Date.now() - new Date(starter.fridgeRemovedAt).getTime()) / 86400000)
    : null

  // Feeds logged after the last fridge removal
  const feedsSinceActivation = starter.fridgeRemovedAt
    ? feeds.filter(f => new Date(f.createdAt) >= new Date(starter.fridgeRemovedAt!)).length
    : null

  const readiness =
    !starter.fridgeRemovedAt ? null :
    feedsSinceActivation === 0 ? { label: 'Needs first feed', color: 'text-gray-400' } :
    feedsSinceActivation === 1 ? { label: 'Getting there', color: 'text-amber-500' } :
    { label: 'Ready to bake', color: 'text-emerald-600' }

  return (
    <>
      {showFeedModal && <FeedLogModal starter={starter} onClose={() => setShowFeedModal(false)} />}
      <div className={`bg-white border rounded-2xl shadow-sm p-5 card-lift flex flex-col gap-3 ${inFridge ? 'border-blue-200' : 'border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base tracking-tight">{starter.name}</h3>
              {inFridge && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Snowflake size={9} /> In fridge
                </span>
              )}
              {!inFridge && readiness && (
                <span className={`text-[10px] font-bold ${readiness.color}`}>{readiness.label}</span>
              )}
            </div>
            <p className="text-xs text-gray-400">{starter.flourType.join(', ')} · {starter.targetHydration}% hyd.</p>
            {!inFridge && daysSinceActivated !== null && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Active {daysSinceActivated === 0 ? 'today' : `${daysSinceActivated}d`} · {feedsSinceActivation} feed{feedsSinceActivation !== 1 ? 's' : ''} since activation
              </p>
            )}
          </div>
          {latest && <ScoreLabel label={latest.aiResult.scoreLabel} />}
        </div>

        {latest ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black">{latest.aiResult.overallScore}</span>
              <div className="flex-1">
                <HealthBar score={latest.aiResult.overallScore} />
                <div className="text-xs text-gray-400 mt-1">
                  Last analyzed {new Date(latest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
            {analyses.length >= 2 && <ScoreTrendChart analyses={analyses} height={72} />}
          </>
        ) : (
          <p className="text-sm text-gray-400">No analyses yet</p>
        )}

        {/* ── Reminder panel ── */}
        {showReminder && (
          <div className="bg-[rgba(214,154,58,0.05)] border border-[#D69A3A]/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Remind me to feed in:</p>
            <div className="flex gap-2 flex-wrap mb-2">
              {[4, 8, 12, 18, 24].map(h => (
                <button key={h} onClick={() => setReminderHours(h)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${reminderHours === h ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600'}`}>
                  {h}h
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSetReminder} className="flex-1 py-1.5 rounded-lg bg-[#D69A3A] text-white text-xs font-bold">Set reminder</button>
              <button onClick={() => setShowReminder(false)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500">Cancel</button>
            </div>
          </div>
        )}

        {/* ── Bake timer panel ── */}
        {showBakeTimer && (
          <div className="bg-[rgba(214,154,58,0.04)] border border-[#D69A3A]/20 rounded-xl p-3 space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Bake Timer</p>

            {!avgPeak ? (
              <p className="text-xs text-gray-400">Log peak time in your feed entries to enable timing predictions.</p>
            ) : (
              <>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wide">Bake day</p>
                    <div className="flex gap-1">
                      {(['today', 'tomorrow'] as const).map(d => (
                        <button key={d} onClick={() => setBakeDay(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all capitalize ${bakeDay === d ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wide">Bake time</p>
                    <AlarmClockPicker value={bakeHour} onChange={setBakeHour} />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wide">Room temp tonight: {timerTemp}°C</p>
                  <input type="range" min={14} max={32} value={timerTemp} onChange={e => setTimerTemp(Number(e.target.value))}
                    className="w-full accent-[#D69A3A] h-1" />
                </div>

                {bakeTimerResult && (
                  <div className="bg-white border border-[#D69A3A]/30 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Feed your starter at</p>
                    <p className="text-2xl font-black text-[#D69A3A]">{fmtTime(bakeTimerResult.feedTime)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      peaks in ~{bakeTimerResult.adjustedHours}h at {timerTemp}°C → ready by {fmtTime(bakeTimerResult.bakeTime)}
                    </p>
                    <p className="text-[10px] text-gray-400">avg based on {Math.min(feeds.length, 5)} recent feeds</p>
                  </div>
                )}
              </>
            )}
            <button onClick={() => setShowBakeTimer(false)} className="w-full py-1 text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-2 mt-auto flex-wrap">
          <Link to={`/analyze?starter=${starter.id}`} className="flex-1 min-w-[80px]">
            <button className="w-full py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#D69A3A]/50 hover:text-[#D69A3A] transition-colors">
              {latest ? 'Analyse' : 'First Analysis →'}
            </button>
          </Link>
          <button onClick={() => setShowFeedModal(true)}
            className="py-2 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#D69A3A]/50 hover:text-[#D69A3A] transition-colors whitespace-nowrap">
            Log Feed
          </button>

          {/* Icon buttons */}
          <div className="flex gap-1.5">
            <button onClick={() => { setShowReminder(r => !r); setShowBakeTimer(false) }}
              className={`py-2 px-2.5 rounded-xl border text-gray-400 transition-colors ${showReminder ? 'border-[#D69A3A] text-[#D69A3A]' : 'border-gray-200 hover:border-[#D69A3A]/40 hover:text-[#D69A3A]'}`}
              title="Set feeding reminder"><Bell size={14} /></button>
            <button onClick={() => { setShowBakeTimer(t => !t); setShowReminder(false) }}
              className={`py-2 px-2.5 rounded-xl border text-gray-400 transition-colors ${showBakeTimer ? 'border-[#D69A3A] text-[#D69A3A]' : 'border-gray-200 hover:border-[#D69A3A]/40 hover:text-[#D69A3A]'}`}
              title="Bake timer"><Timer size={14} /></button>
            <button onClick={toggleFridge}
              className={`py-2 px-2.5 rounded-xl border transition-colors ${inFridge ? 'border-blue-300 text-blue-400 bg-blue-50' : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400'}`}
              title={inFridge ? 'Take out of fridge' : 'Put in fridge'}><Snowflake size={14} /></button>
            {confirmDelete ? (
              <>
                <button onClick={() => deleteStarter(starter.id)}
                  className="py-2 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">Delete</button>
                <button onClick={() => setConfirmDelete(false)}
                  className="py-2 px-2 rounded-xl border border-gray-200 text-xs text-gray-500">✕</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="py-2 px-2.5 rounded-xl border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400 transition-colors"
                title="Delete starter"><Trash2 size={14} /></button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Active journeys bar ──────────────────────────────────────
function JourneysBar() {
  const { journeys } = useStarters()
  const active = journeys.filter(j => j.status === 'active')
  if (active.length === 0) return null
  return (
    <div className="mb-6">
      <h2 className="font-black text-base tracking-tight mb-3 flex items-center gap-2">
        <Sprout size={15} className="text-[#D69A3A]" /> Incubating
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {active.map(j => (
          <Link key={j.id} to={`/grow/${j.id}`}
            className="bg-white border border-[#D69A3A]/20 rounded-xl p-4 hover:border-[#D69A3A]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{j.name}</span>
              <span className="text-xs text-[#D69A3A] font-bold bg-[rgba(214,154,58,0.1)] px-2 py-0.5 rounded-full">Day {j.currentDay}/14</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#D69A3A] rounded-full" style={{ width: `${(j.logs.length / 14) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{j.logs.length} of 14 days logged → tap to continue</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const { starters, analyses } = useStarters()
  const navigate = useNavigate()
  const recentAnalyses = [...analyses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 w-full flex-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-400 font-medium">Welcome back</p>
            <h1 className="text-3xl font-black tracking-tighter">{user.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {analyses.length > 0 && (
              <button
                onClick={() => exportAllPDF(analyses, starters, user.name, `${user.name.replace(/\s+/g, '_')}_all_analyses.pdf`)}
                className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:border-[#D69A3A]/50 hover:text-[#D69A3A] font-semibold px-4 py-3 rounded-xl text-sm transition-colors">
                <Download size={14} /> Export All PDF
              </button>
            )}
            <Link to="/grow">
              <button className="flex items-center gap-2 border border-[#D69A3A]/30 text-[#D69A3A] hover:bg-[rgba(214,154,58,0.06)] font-semibold px-4 py-3 rounded-xl text-sm transition-colors">
                <Sprout size={14} /> Grow New
              </button>
            </Link>
            <Link to="/analyze">
              <button className="flex items-center gap-2 bg-[#D69A3A] hover:bg-[#C98A3D] text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors">
                <Plus size={15} /> New Analysis
              </button>
            </Link>
          </div>
        </div>

        {/* Reminder banners */}
        <ReminderBanners />

        {/* Onboarding */}
        {starters.length === 0 && <Onboarding />}

        {/* Stats */}
        {(starters.length > 0 || analyses.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Activity,   label: 'Total Analyses', value: analyses.length },
              { icon: BarChart3,  label: 'Avg. Score',     value: analyses.length ? Math.round(analyses.reduce((s, a) => s + a.aiResult.overallScore, 0) / analyses.length) : '—' },
              { icon: TrendingUp, label: 'Starters',       value: starters.length },
              { icon: Clock,      label: 'Last Analysis',  value: recentAnalyses[0] ? new Date(recentAnalyses[0].createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-[#D69A3A]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
                </div>
                <div className="text-2xl font-black">{value}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Active journeys */}
        <JourneysBar />

        {/* Starters */}
        {starters.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-lg tracking-tight">Your Starters</h2>
              <Link to="/analyze" className="text-sm text-[#D69A3A] font-semibold hover:underline">+ Check in starter</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {starters.map(s => <StarterCard key={s.id} starter={s} />)}
            </div>
          </div>
        )}

        {/* Recent analyses */}
        {recentAnalyses.length > 0 && (
          <div>
            <h2 className="font-black text-lg tracking-tight mb-4">Recent Analyses</h2>
            <Card>
              <div className="divide-y divide-gray-100">
                {recentAnalyses.map(a => (
                  <button key={a.id} onClick={() => navigate(`/report/${a.id}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group text-left">
                    <div className="flex items-center gap-3">
                      <img src={a.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-semibold text-sm group-hover:text-[#D69A3A] transition-colors">{a.starterName}</div>
                        <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreLabel label={a.aiResult.scoreLabel} />
                      <span className="font-black text-xl">{a.aiResult.overallScore}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
