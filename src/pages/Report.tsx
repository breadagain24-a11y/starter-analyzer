import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStarters } from '../context/StarterContext'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, Plus, Share2, Download, ChevronDown, ChevronUp, Trash2, StickyNote, Bell, Check } from 'lucide-react'
import { exportSinglePDF, exportAllPDF, AGE_LABELS } from '../lib/pdfExport'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import FeedLogModal from '../components/FeedLogModal'
import ScoreTrendChart from '../components/ScoreTrendChart'
import type { Analysis, FeedEntry } from '../types'

const METRIC_LABELS: Record<string, string> = {
  fermentationActivity: 'Rise Activity',
  aromaProfileHealth: 'Aroma Integrity',
  visualStructureScore: 'Surface Structure',
  feedingRegularityScore: 'Fermentation Speed',
}


function statusStyle(label: string) {
  if (label === 'THRIVING' || label === 'GOOD')
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' }
  if (label === 'DEVELOPING')
    return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' }
  return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' }
}

function ReminderWidget({ starterId, starterName }: { starterId: string; starterName: string }) {
  const { addReminder } = useStarters()
  const [hours, setHours] = useState(8)
  const [set, setSet] = useState(false)

  const handleSet = () => {
    const feedAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    addReminder(starterId, starterName, feedAt)
    setSet(true)
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Next Feed Reminder</div>
      {set ? (
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
          <Check size={13} /> Reminder set for {hours}h from now
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {[4, 8, 12, 18, 24].map(h => (
              <button key={h} onClick={() => setHours(h)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${hours === h ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/50'}`}>
                {h}h
              </button>
            ))}
          </div>
          <button onClick={handleSet}
            className="flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border border-[#D69A3A]/30 text-xs font-bold text-[#D69A3A] hover:bg-[rgba(214,154,58,0.06)] transition-colors">
            <Bell size={11} /> Remind me in {hours}h
          </button>
        </>
      )}
    </div>
  )
}

function MetricBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold text-gray-900 tabular-nums">{score}</span>
      </div>
      <div className="metric-bar-track">
        <div className="metric-bar-fill" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

type LogItem =
  | { kind: 'analysis'; data: Analysis }
  | { kind: 'feed'; data: FeedEntry }

function AnalysisLogEntry({ a, isCurrent, expanded, onToggle }: { a: Analysis; isCurrent: boolean; expanded: boolean; onToggle: () => void }) {
  const navigate = useNavigate()
  const d = new Date(a.createdAt)
  const time = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const st = statusStyle(a.aiResult.scoreLabel)
  return (
    <div className={`p-3 rounded-lg border text-xs transition-colors ${expanded ? 'border-[#D69A3A]/40 bg-[rgba(214,154,58,0.04)]' : isCurrent ? 'border-[#D69A3A]/30 bg-[rgba(214,154,58,0.02)]' : 'border-gray-100'}`}>
      <button className="w-full text-left" onClick={onToggle}>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${st.bg} ${st.text}`}>
                <span className={`w-1 h-1 rounded-full inline-block ${st.dot}`} />
                {a.aiResult.scoreLabel}
              </span>
              {isCurrent && <span className="text-[10px] text-[#D69A3A] font-semibold">current</span>}
            </div>
            <div className="text-gray-400 mb-1">{time}</div>
            <div className="text-gray-600 line-clamp-2">{a.aiResult.diagnosis}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-gray-400">
              <span>Fed {a.questionnaireData.hoursSinceLastFeed}h ago</span>
              <span>·</span>
              <span>{a.questionnaireData.feedingRatio}</span>
              <span>·</span>
              <span>{a.questionnaireData.roomTemp}°C</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="font-black text-lg text-[#D69A3A] tabular-nums">{a.aiResult.overallScore}</div>
            {expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#D69A3A]/20 flex items-center justify-between">
          {a.imageUrl && (
            <img src={a.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
          )}
          <button
            onClick={() => navigate(`/report/${a.id}`)}
            className="ml-auto text-[10px] font-bold text-[#D69A3A] hover:underline"
          >
            View full report →
          </button>
        </div>
      )}
    </div>
  )
}

function FeedLogEntry({ f, expanded, onToggle }: { f: FeedEntry; expanded: boolean; onToggle: () => void }) {
  const d = new Date(f.createdAt)
  const time = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return (
    <div className={`p-3 rounded-lg border text-xs transition-colors ${expanded ? 'border-[#D69A3A]/40 bg-[rgba(214,154,58,0.03)]' : 'border-gray-100'}`}>
      <button className="w-full text-left" onClick={onToggle}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] bg-gray-100 text-gray-500">
            Feed logged
          </span>
          {expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
        </div>
        <div className="text-gray-400 mb-1">{time}</div>
        <div className="flex flex-wrap items-center gap-1.5 text-gray-400">
          {f.ratio && <span>{f.ratio}</span>}
          {f.riseMultiplier && <><span>·</span><span>Rise {f.riseMultiplier}</span></>}
          {f.peakTime && <><span>·</span><span>Peak {f.peakTime}</span></>}
          {f.roomTemp && <><span>·</span><span>{f.roomTemp}°C</span></>}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          {f.note && <div className="text-gray-600">{f.note}</div>}
          {f.imageUrl && (
            <img src={f.imageUrl} alt="" className="w-full max-h-32 object-cover rounded-lg" />
          )}
          {!f.note && !f.imageUrl && <p className="text-gray-300">No additional details logged.</p>}
        </div>
      )}
    </div>
  )
}

// ── Starter Notes ────────────────────────────────────────────
function StarterNotes({ starterId }: { starterId: string }) {
  const { getNotesForStarter, addNote, deleteNote } = useStarters()
  const [text, setText] = useState('')
  const notes = getNotesForStarter(starterId)

  const handleAdd = () => {
    if (!text.trim()) return
    addNote(starterId, text.trim())
    setText('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote size={13} className="text-[#D69A3A]" />
        <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Journal Notes</div>
      </div>

      {notes.length > 0 && (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex items-start gap-2 p-2.5 bg-[rgba(214,154,58,0.04)] rounded-lg border border-[#D69A3A]/10">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder='e.g. "Switched to Rye flour today"'
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D69A3A]"
        />
        <button onClick={handleAdd}
          className="px-3 py-2 bg-[#D69A3A] text-white text-xs font-bold rounded-lg hover:bg-[#C98A3D] transition-colors whitespace-nowrap">
          + Add
        </button>
      </div>
    </div>
  )
}

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const { analyses, starters, getFeedsForStarter } = useStarters()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showFeedModal, setShowFeedModal] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [expandedFeedId, setExpandedFeedId] = useState<string | null>(null)
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null)

  const toggleFeed = (fid: string) => {
    setExpandedFeedId(id => id === fid ? null : fid)
    setExpandedAnalysisId(null)
  }
  const toggleAnalysis = (aid: string) => {
    setExpandedAnalysisId(id => id === aid ? null : aid)
    setExpandedFeedId(null)
  }

  const analysis = analyses.find(a => a.id === id)

  if (!analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFC]">
        <p className="text-gray-500 mb-4">Report not found.</p>
        <Link to="/dashboard" className="text-[#D69A3A] font-semibold">← Back to dashboard</Link>
      </div>
    )
  }

  const { aiResult, starterName, createdAt, questionnaireData, starterId } = analysis
  const starter = starters.find(s => s.id === starterId)

  const pastAnalyses = analyses
    .filter(a => a.starterId === starterId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const feedEntries = getFeedsForStarter(starterId)

  const logItems: LogItem[] = [
    ...pastAnalyses.map(a => ({ kind: 'analysis' as const, data: a })),
    ...feedEntries.map(f => ({ kind: 'feed' as const, data: f })),
  ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())

  const allPhotoItems = [
    ...pastAnalyses.filter(a => a.imageUrl).map(a => ({ url: a.imageUrl, date: a.createdAt, label: a.aiResult.scoreLabel, score: a.aiResult.overallScore, analysisId: a.id })),
    ...feedEntries.filter(f => f.imageUrl).map(f => ({ url: f.imageUrl!, date: f.createdAt, label: null, score: null, analysisId: null })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Pin the current analysis photo to the top; show the rest below in date order
  const currentPhoto = allPhotoItems.find(p => p.analysisId === id)
  const photoItems = currentPhoto
    ? [currentPhoto, ...allPhotoItems.filter(p => p !== currentPhoto)]
    : allPhotoItems

  const expandedFeed = feedEntries.find(f => f.id === expandedFeedId)
  const hasCriticalFlag = aiResult.flags.moldRisk || aiResult.flags.contamination
  const st = statusStyle(aiResult.scoreLabel)

  const handleExportPDF = () => exportSinglePDF(analysis, starter, user?.name ?? '')

  const handleShare = async () => {
    const text = `My sourdough starter "${starterName}" scored ${aiResult.overallScore}/100 (${aiResult.scoreLabel}) via Breadagain Starter Analyzer`
    if (navigator.share) { navigator.share({ text, url: window.location.href }) }
    else { navigator.clipboard.writeText(window.location.href); alert('Link copied!') }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />

      {starter && showFeedModal && (
        <FeedLogModal starter={starter} onClose={() => setShowFeedModal(false)} />
      )}

      {/* Photo lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-5 text-white/70 hover:text-white text-3xl font-light leading-none"
            onClick={() => setLightboxUrl(null)}
          >×</button>
          <img
            src={lightboxUrl}
            alt="Starter"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-20 pb-12 flex-1">

        {hasCriticalFlag && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-700 mb-1 text-sm">Potential Contamination Detected</div>
              <p className="text-xs text-red-600">Do not use this starter in baking until you inspect it closely. Discard if you see pink, orange, or black fuzzy spots.</p>
            </div>
          </div>
        )}

        {/* Breadcrumb + status */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <button onClick={() => navigate('/dashboard')} className="hover:text-gray-700 transition-colors">starter-analyzer</button>
            <span>/</span>
            <button onClick={() => navigate('/dashboard')} className="hover:text-gray-700 transition-colors">dashboard</button>
            <span>/</span>
            <span className="text-gray-700 font-medium">{starterName}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold hover:text-gray-800 transition-colors">
              <Download size={12} /> Export PDF
            </button>
            {pastAnalyses.length > 1 && (
              <button
                onClick={() => exportAllPDF(pastAnalyses, starters, user?.name ?? '', `${starterName.replace(/\s+/g, '_')}_all_analyses.pdf`)}
                className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold hover:text-gray-800 transition-colors"
              >
                <Download size={12} /> Export All ({pastAnalyses.length})
              </button>
            )}
            <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-[#D69A3A] font-semibold hover:underline">
              <Share2 size={12} /> Share
            </button>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} />
              {aiResult.scoreLabel}
            </div>
          </div>
        </div>

        {/* 3-column dashboard grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-5">

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Culture Dossier</div>
              <dl className="space-y-2.5 text-xs">
                {([
                  ['Name', starterName],
                  ['Owner', user?.name ?? '—'],
                  ['Age', starter ? AGE_LABELS[starter.age] ?? starter.age : '—'],
                  ['Hydration', starter ? `${starter.targetHydration}%` : '—'],
                  ['Flour', starter ? starter.flourType.join(', ') : '—'],
                  ['Water', starter?.waterType ?? '—'],
                  ['Analysed', new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
                  ['Fed', `${questionnaireData.hoursSinceLastFeed}h ago · ${questionnaireData.feedingRatio}`],
                  ['Temp', `${questionnaireData.roomTemp}°C`],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-gray-400 font-medium flex-shrink-0">{label}</dt>
                    <dd className="text-gray-700 text-right">{value}</dd>
                  </div>
                ))}
                {questionnaireData.symptoms.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400 font-medium flex-shrink-0">Symptoms</dt>
                    <dd className="text-gray-700 text-right">{questionnaireData.symptoms.join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Next Actions</div>
              <ul className="space-y-3">
                {aiResult.actionSteps.map(({ step, title, detail }) => (
                  <li key={step} className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-[#D69A3A] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                    <div>
                      <span className="font-semibold text-gray-800">{title}</span>
                      <span className="text-gray-500"> — {detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {aiResult.bakeReadinessHours !== null && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Bake Readiness</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-black text-gray-900">~{aiResult.bakeReadinessHours}h</span>
                    <span className="text-xs text-gray-400">until peak</span>
                  </div>
                  <p className="text-xs text-gray-500">{aiResult.bakeReadinessNote}</p>
                </div>
              )}

              {/* Feeding reminder widget */}
              <ReminderWidget starterId={starterId} starterName={starterName} />
            </div>
          </div>

          {/* ── MIDDLE ── */}
          <div className="flex flex-col gap-5">

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Health Metrics</div>
              <div className="space-y-4">
                {(Object.entries(aiResult.subScores) as [keyof typeof aiResult.subScores, number][]).map(([key, score]) => (
                  <MetricBar key={key} label={METRIC_LABELS[key] ?? key} score={score} />
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Overall Health Score</span>
                <span className="text-2xl font-black text-[#D69A3A]">{aiResult.overallScore}</span>
              </div>
              {pastAnalyses.length >= 2 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <ScoreTrendChart
                    analyses={pastAnalyses}
                    height={90}
                    highlightDate={expandedFeed?.createdAt}
                    highlightAnalysisId={expandedAnalysisId}
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Status</div>
              <div className="bg-gray-900 rounded-lg p-4 text-white">
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${st.bg} ${st.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block animate-pulse ${st.dot}`} />
                  {aiResult.scoreLabel}
                </div>
                <p className="text-sm leading-relaxed text-gray-200">{aiResult.diagnosis}</p>
                {aiResult.encouragementNote && (
                  <p className="mt-3 text-xs text-gray-400 italic">"{aiResult.encouragementNote}"</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link to={`/analyze?starter=${starterId}`}>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:border-[#D69A3A]/40 transition-colors">
                  <Plus size={14} /> New Analysis
                </button>
              </Link>
              <Link to="/dashboard">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#D69A3A] text-white text-sm font-bold hover:bg-[#C98A3D] transition-colors">
                  View Dashboard
                </button>
              </Link>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="flex flex-col gap-5">

            {/* Journal Notes — top of right column so it's immediately visible */}
            <StarterNotes starterId={starterId} />

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Feed Log</div>
                <button
                  onClick={() => setShowFeedModal(true)}
                  className="text-[10px] bg-[#D69A3A] hover:bg-[#C98A3D] text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus size={10} /> Log Feed
                </button>
              </div>
              <div className="feed-scroll space-y-3">
                {logItems.length === 0 ? (
                  <div className="text-xs text-gray-300 text-center py-4">No entries yet</div>
                ) : (
                  logItems.map(item =>
                    item.kind === 'analysis' ? (
                      <AnalysisLogEntry
                        key={item.data.id}
                        a={item.data}
                        isCurrent={item.data.id === id}
                        expanded={expandedAnalysisId === item.data.id}
                        onToggle={() => toggleAnalysis(item.data.id)}
                      />
                    ) : (
                      <FeedLogEntry
                        key={item.data.id}
                        f={item.data}
                        expanded={expandedFeedId === item.data.id}
                        onToggle={() => toggleFeed(item.data.id)}
                      />
                    )
                  )
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Photo Log</div>
                <Link to={`/analyze?starter=${starterId}`}>
                  <button className="text-[10px] bg-gray-800 hover:bg-gray-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    + Analyse
                  </button>
                </Link>
              </div>
              <div className="photo-scroll">
                {photoItems.length === 0 ? (
                  <div className="text-xs text-gray-300 text-center py-4">No photos yet</div>
                ) : (
                  <div className="space-y-3">
                    {photoItems.slice(0, 1).map((p, i) => (
                      <div key={i}>
                        <img
                          src={p.url}
                          alt={starterName}
                          className="photo-thumb w-full rounded-lg cursor-zoom-in hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxUrl(p.url)}
                        />
                        <div className="text-[10px] text-gray-400 mt-1.5 flex items-center justify-between">
                          <span>
                            {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {p.label && ` · ${p.label} · ${p.score}/100`}
                          </span>
                          {p.analysisId && (
                            <button onClick={() => navigate(`/report/${p.analysisId!}`)} className="text-[#D69A3A] hover:underline">
                              view report →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {photoItems.slice(1).map((p, i) => (
                      <div key={i + 1} className="flex items-center gap-2">
                        <img
                          src={p.url} alt=""
                          className="w-12 h-12 rounded object-cover flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxUrl(p.url)}
                        />
                        <div className="text-[10px] text-gray-500 flex-1">
                          <div className="font-medium">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          {p.label && <div className="text-gray-400">{p.label} · {p.score}/100</div>}
                          {p.analysisId && (
                            <button onClick={() => navigate(`/report/${p.analysisId!}`)} className="text-[#D69A3A] hover:underline">
                              view →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      <Footer />
    </div>
  )
}
