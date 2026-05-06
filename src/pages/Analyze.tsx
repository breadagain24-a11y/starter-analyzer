import { useState, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, Camera, ChevronRight, ChevronLeft, AlertTriangle, HelpCircle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStarters } from '../context/StarterContext'
import { analyzeStarter } from '../lib/api'
import { compressImage } from '../lib/imageCompressor'
import { uploadAnalysisImage } from '../lib/storage'
import { track } from '../lib/posthog'
import { Button, Card, Badge } from '../components/ui'
import Nav from '../components/layout/Nav'
import type { StarterProfile, QuestionnaireData } from '../types'

const LOADING_MESSAGES = [
  'Reading bubble activity...',
  'Analyzing aroma profile...',
  'Calculating health score...',
  'Writing your personalized plan...',
  'Almost there...',
]

const FLOUR_OPTIONS = ['All-Purpose', 'Bread Flour', 'Whole Wheat', 'Rye', 'Spelt', 'Mix']
const WATER_OPTIONS = ['Tap (chlorinated)', 'Filtered', 'Bottled', 'Well water']
const AGE_OPTIONS = [
  { value: 'under-1-month', label: '< 1 month' },
  { value: '1-6-months',    label: '1–6 months' },
  { value: '6-12-months',   label: '6–12 months' },
  { value: '1-5-years',     label: '1–5 years' },
  { value: 'custom',        label: 'Custom' },
]
const RISE_OPTIONS = [
  'Just starting — less than 25%',
  'Barely moved',
  'Doubled',
  'More than doubled',
  'Already collapsed',
]
const SURFACE_OPTIONS = [
  { value: 'collapsed',     label: 'Collapsed / sunken' },
  { value: 'flat',          label: 'Flat — no dome' },
  { value: 'slight_dome',   label: 'Slight dome' },
  { value: 'clear_dome',    label: 'Clear dome' },
  { value: 'peaked_bubbles',label: 'Peaked dome + bubbles ✓' },
]
const AROMA_OPTIONS = [
  { value: 'off',          label: 'Off / chemical / unpleasant !' },
  { value: 'neutral',      label: 'Neutral / no smell' },
  { value: 'mild_yeasty',  label: 'Mild, yeasty' },
  { value: 'mild_lactic',  label: 'Mild, yogurt-sour — lactic ✓' },
  { value: 'sharp_acetic', label: 'Sharp, vinegary — acetic ✓' },
  { value: 'complex',      label: 'Complex, balanced, tangy ✓✓' },
]
const RATIO_OPTIONS = ['1:1:1', '1:2:2', '1:3:3', '1:5:5', 'Custom']
const HOURS_OPTIONS = [4, 8, 12, 18, 24, 36]
const SYMPTOM_OPTIONS = [
  'Liquid layer on top (hooch)',
  'Unusual color — pink/orange/black spots',
  'No bubbles at all — looks completely flat',
  'Very watery texture, thinner than usual',
  'Crust/dried layer on surface',
]

function SegmentedSelect({ options, value, onChange }: { options: string[] | { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value
        const l = typeof opt === 'string' ? opt : opt.label
        return (
          <button
            key={v} type="button"
            onClick={() => onChange(v)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${value === v ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/50'}`}
          >{l}</button>
        )
      })}
    </div>
  )
}

export default function Analyze() {
  const { user } = useAuth()
  const { starters, addStarter, saveAnalysis } = useStarters()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Pre-select a starter if ?starter=ID is in the URL (coming from dashboard / report)
  const preSelectedId = searchParams.get('starter')
  const preSelectedExists = preSelectedId ? starters.some(s => s.id === preSelectedId) : false

  const [step, setStep] = useState(0)
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(preSelectedExists ? preSelectedId : null)

  // 'choose'       — pick new vs existing (only when starters exist)
  // 'new-form'     — fill in new starter details
  // 'existing-list'— pick from existing starters
  type StarterPhase = 'choose' | 'new-form' | 'existing-list'
  const initialPhase: StarterPhase =
    preSelectedExists         ? 'existing-list' :
    starters.length === 0     ? 'new-form'       : 'choose'
  const [starterPhase, setStarterPhase] = useState<StarterPhase>(initialPhase)

  // New starter form fields
  const [newStarterName, setNewStarterName] = useState('')
  const [newStarterAge, setNewStarterAge] = useState<StarterProfile['age']>('1-6-months')
  const [newStarterAgeCustom, setNewStarterAgeCustom] = useState('')
  const [newStarterFlour, setNewStarterFlour] = useState<string[]>(['Bread Flour'])
  const [newStarterFlourMix, setNewStarterFlourMix] = useState('')
  const [newStarterWater, setNewStarterWater] = useState('Filtered')
  const [newStarterHydration, setNewStarterHydration] = useState(100)

  const [customRatio, setCustomRatio] = useState('')

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string; sizeKb: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({
    hoursSinceLastFeed: 12,
    feedingRatio: '1:2:2',
    roomTemp: 22,
    riseDescription: 'Doubled',
    surfaceAppearance: 'clear_dome',
    aroma: 'mild_lactic',
    symptoms: [],
    floatTest: 'untested',
  })

  const [loadingMsg, setLoadingMsg] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [showPhotoGuide, setShowPhotoGuide] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)
    const compressed = await compressImage(file)
    setImageData(compressed)
    setError('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // Called when the user confirms their starter choice on step 0.
  // Creates the starter immediately (so it shows up in the dashboard) and
  // stores the ID — analysis just looks it up by ID.
  const commitNewStarter = (): StarterProfile => {
    const flourType = newStarterFlour.map(f =>
      f === 'Mix' && newStarterFlourMix.trim() ? `Mix (${newStarterFlourMix.trim()})` : f
    )
    return addStarter({
      name: newStarterName.trim() || 'My Starter',
      age: newStarterAge,
      flourType,
      waterType: newStarterWater,
      targetHydration: newStarterHydration,
      userId: user!.id,
    })
  }

  const getStarter = (): StarterProfile => starters.find(s => s.id === selectedStarterId)!

  // The effective ratio sent to the API — either the preset or the typed custom value
  const effectiveRatio = questionnaire.feedingRatio === 'Custom' ? (customRatio.trim() || 'Custom') : questionnaire.feedingRatio

  const runAnalysis = async () => {
    if (!imageData) return
    setAnalyzing(true)
    setError('')
    const starter = getStarter()
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length
      setLoadingMsg(msgIdx)
    }, 2500)
    try {
      const [result, imageUrl] = await Promise.all([
        analyzeStarter({ imageBase64: imageData.base64, mimeType: imageData.mimeType, questionnaire: { ...questionnaire, feedingRatio: effectiveRatio }, starter }),
        uploadAnalysisImage(imageData.base64, imageData.mimeType, user!.id).catch(() => imagePreview!),
      ])
      let analysisId!: string
      flushSync(() => {
        const analysis = saveAnalysis({
          userId: user!.id,
          starterId: starter.id,
          starterName: starter.name,
          imageUrl,
          questionnaireData: questionnaire,
          aiResult: result,
        })
        analysisId = analysis.id
      })
      track('analysis_completed', {
        score: result.overallScore,
        scoreLabel: result.scoreLabel,
        starterName: starter.name,
        isNewStarter: !selectedStarterId,
      })
      navigate(`/report/${analysisId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
      setAnalyzing(false)
    } finally {
      clearInterval(interval)
    }
  }

  const toggleSymptom = (s: string) => {
    setQuestionnaire(q => ({
      ...q,
      symptoms: q.symptoms.includes(s) ? q.symptoms.filter(x => x !== s) : [...q.symptoms, s],
    }))
  }

  if (analyzing) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-[#D69A3A]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#D69A3A] animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[rgba(214,154,58,0.1)] animate-bubble" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D69A3A] inline-block" />
            <span className="text-[11px] font-bold text-[#D69A3A] tracking-widest uppercase">
              {starters.find(s => s.id === selectedStarterId)?.name ?? 'Starter'}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tighter mb-3">Analyzing your culture...</h2>
          <p className="text-gray-400 transition-all duration-500">{LOADING_MESSAGES[loadingMsg]}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Nav />
      <div className="max-w-xl mx-auto px-4 pt-24 pb-16">
        {/* Progress bar + active starter chip */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex gap-1.5 flex-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#D69A3A]' : 'bg-gray-200'}`} />
            ))}
          </div>
          {step > 0 && selectedStarterId && (
            <div className="flex items-center gap-1.5 bg-[#111111] text-white text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D69A3A] inline-block" />
              {starters.find(s => s.id === selectedStarterId)?.name ?? 'Starter'}
            </div>
          )}
        </div>

        {/* ── Step 0: Starter selection ── */}
        {step === 0 && (
          <div className="animate-fade-in-up">

            {/* ── Phase A: Choose new vs existing ── */}
            {starterPhase === 'choose' && (
              <>
                <Badge className="mb-4">Step 1 of 3</Badge>
                <h1 className="text-2xl font-black tracking-tighter mb-1">Which starter are we analyzing?</h1>
                <p className="text-gray-400 text-sm mb-8">Analyze an existing starter or set up a brand-new one.</p>

                <div className="space-y-3 mb-6">
                  <button
                    className="w-full text-left p-5 bg-white border-2 border-[#D69A3A] rounded-2xl hover:bg-[#fdf8f0] transition-all group"
                    onClick={() => { setSelectedStarterId(null); setStarterPhase('new-form') }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl">🌱</span>
                      <span className="font-black text-base tracking-tight">New starter</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-9">Set up a new starter profile — name, flour, age and hydration.</p>
                  </button>

                  <button
                    className="w-full text-left p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-all"
                    onClick={() => { setStarterPhase('existing-list') }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl">📋</span>
                      <span className="font-black text-base tracking-tight">Existing starter</span>
                      <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{starters.length}</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-9">Pick one of your saved starters.</p>
                  </button>
                </div>
              </>
            )}

            {/* ── Phase B: New starter form ── */}
            {starterPhase === 'new-form' && (
              <>
                <Badge className="mb-4">Step 1 of 3</Badge>
                <h1 className="text-2xl font-black tracking-tighter mb-1">Set up your starter</h1>
                <p className="text-gray-400 text-sm mb-6">This creates a profile that tracks all future analyses.</p>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Starter name</label>
                    <input
                      autoFocus type="text" value={newStarterName} onChange={e => setNewStarterName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors"
                      placeholder="e.g. Brutus, Hermann, Doughlores…"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Age</label>
                    <SegmentedSelect options={AGE_OPTIONS} value={newStarterAge} onChange={v => setNewStarterAge(v as StarterProfile['age'])} />
                    {newStarterAge === 'custom' && (
                      <input type="text" value={newStarterAgeCustom} onChange={e => setNewStarterAgeCustom(e.target.value)}
                        placeholder="e.g. 8 months, 3 years…"
                        className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Flour type(s)</label>
                    <div className="flex flex-wrap gap-2">
                      {FLOUR_OPTIONS.map(f => {
                        const sel = newStarterFlour.includes(f)
                        return (
                          <button key={f} type="button"
                            className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${sel ? 'bg-[#D69A3A] text-white border-[#D69A3A]' : 'border-gray-200 text-gray-600 hover:border-[#D69A3A]/50'}`}
                            onClick={() => setNewStarterFlour(cur => cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f])}
                          >{f}</button>
                        )
                      })}
                    </div>
                    {newStarterFlour.includes('Mix') && (
                      <input type="text" value={newStarterFlourMix} onChange={e => setNewStarterFlourMix(e.target.value)}
                        placeholder="e.g. 50% AP, 30% Rye, 20% Spelt…"
                        className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                      Target hydration: <span className="text-[#D69A3A]">{newStarterHydration}%</span>
                    </label>
                    <input type="range" min={50} max={125} value={newStarterHydration}
                      onChange={e => setNewStarterHydration(Number(e.target.value))}
                      className="w-full accent-[#D69A3A]"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>50% stiff</span><span>125% very wet</span></div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Water type</label>
                    <SegmentedSelect options={WATER_OPTIONS} value={newStarterWater} onChange={setNewStarterWater} />
                  </div>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl flex gap-2"><AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />{error}</div>}

                <div className="flex gap-3">
                  {starters.length > 0 && (
                    <Button variant="outline" onClick={() => { setError(''); setStarterPhase('choose') }} className="flex-1">
                      <ChevronLeft size={16} /> Back
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => {
                    if (!newStarterName.trim()) { setError('Please give your starter a name.'); return }
                    if (newStarterFlour.length === 0) { setError('Please select at least one flour type.'); return }
                    setError('')
                    // Create starter immediately so it appears in the dashboard
                    const created = commitNewStarter()
                    setSelectedStarterId(created.id)
                    setStep(1)
                  }}>
                    Create &amp; Continue <ChevronRight size={16} />
                  </Button>
                </div>
              </>
            )}

            {/* ── Phase C: Pick an existing starter ── */}
            {starterPhase === 'existing-list' && (
              <>
                <Badge className="mb-4">Step 1 of 3</Badge>
                <h1 className="text-2xl font-black tracking-tighter mb-1">Pick a starter</h1>
                <p className="text-gray-400 text-sm mb-6">Select the one you're checking in today.</p>

                <div className="space-y-3 mb-6">
                  {starters.map(s => (
                    <Card key={s.id}
                      className={`p-4 cursor-pointer transition-all ${selectedStarterId === s.id ? 'ring-2 ring-[#D69A3A]' : 'hover:border-gray-300'}`}
                      onClick={() => setSelectedStarterId(s.id)}
                    >
                      <div className="font-bold">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {AGE_OPTIONS.find(a => a.value === s.age)?.label ?? s.age} · {s.flourType.join(', ')} · {s.targetHydration}% hydration
                      </div>
                    </Card>
                  ))}
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl flex gap-2"><AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />{error}</div>}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setError(''); setStarterPhase('choose') }} className="flex-1">
                    <ChevronLeft size={16} /> Back
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    if (!selectedStarterId) { setError('Please select a starter.'); return }
                    setError(''); setStep(1)
                  }}>
                    Continue <ChevronRight size={16} />
                  </Button>
                </div>
              </>
            )}

          </div>
        )}

        {/* ── Photo Guidelines Modal ── */}
        {showPhotoGuide && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPhotoGuide(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg tracking-tight">📸 Photo Tips</h3>
                <button onClick={() => setShowPhotoGuide(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>

              {/* Illustration */}
              <div className="mb-5 rounded-xl overflow-hidden bg-[#f5f0e8] flex items-center justify-center py-4">
                <svg viewBox="0 0 200 220" width="160" height="176" xmlns="http://www.w3.org/2000/svg">
                  {/* Window / light source */}
                  <rect x="130" y="10" width="55" height="60" rx="3" fill="#d4eaf7" stroke="#aac8e0" strokeWidth="1.5"/>
                  <line x1="157" y1="10" x2="157" y2="70" stroke="#aac8e0" strokeWidth="1"/>
                  <line x1="130" y1="40" x2="185" y2="40" stroke="#aac8e0" strokeWidth="1"/>
                  <text x="157" y="90" textAnchor="middle" fontSize="8" fill="#7aaccc" fontWeight="bold">LIGHT</text>
                  {/* Light rays */}
                  <line x1="130" y1="55" x2="100" y2="90" stroke="#f0d080" strokeWidth="1" strokeDasharray="3,3" opacity="0.8"/>
                  <line x1="140" y1="68" x2="108" y2="100" stroke="#f0d080" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>

                  {/* Jar body */}
                  <rect x="55" y="80" width="80" height="110" rx="6" fill="rgba(220,235,245,0.45)" stroke="#9ab" strokeWidth="2"/>
                  {/* Jar lid rim */}
                  <rect x="50" y="72" width="90" height="14" rx="4" fill="rgba(200,220,235,0.6)" stroke="#9ab" strokeWidth="1.5"/>

                  {/* Rubber band markers (like Weck) */}
                  <line x1="55" y1="128" x2="135" y2="128" stroke="#5aaa88" strokeWidth="2" opacity="0.7"/>
                  <line x1="55" y1="152" x2="135" y2="152" stroke="#5aaa88" strokeWidth="2" opacity="0.7"/>

                  {/* Starter contents – bottom beige base */}
                  <rect x="57" y="154" width="76" height="34" rx="0" fill="#c8b89a" opacity="0.85"/>
                  {/* Active bubbly middle */}
                  <rect x="57" y="110" width="76" height="44" fill="#d4c4a8" opacity="0.9"/>
                  {/* Bubbles */}
                  {[
                    [72,125,5],[88,118,3.5],[102,130,4],[115,122,3],[80,138,3],[98,143,4.5],[118,136,3],
                    [68,115,2.5],[110,140,2.5],[92,108,3],[120,115,4],[75,148,3.5]
                  ].map(([cx,cy,r],i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="#a89070" strokeWidth="1" opacity="0.7"/>
                  ))}
                  {/* Surface dome */}
                  <ellipse cx="95" cy="110" rx="38" ry="6" fill="#c8b89a" opacity="0.9"/>
                  <path d="M57,110 Q75,100 95,97 Q115,100 133,110" fill="#d0bfa0" opacity="0.95" stroke="#b0a080" strokeWidth="0.5"/>

                  {/* Camera icon + arrow showing side angle */}
                  <g transform="translate(8,125)">
                    <rect x="0" y="0" width="28" height="20" rx="3" fill="#333" />
                    <circle cx="14" cy="10" r="6" fill="#555" stroke="#888" strokeWidth="1"/>
                    <circle cx="14" cy="10" r="3.5" fill="#222"/>
                    <rect x="8" y="-4" width="8" height="5" rx="1" fill="#333"/>
                  </g>
                  {/* Arrow from camera to jar */}
                  <line x1="37" y1="135" x2="52" y2="135" stroke="#D69A3A" strokeWidth="2" markerEnd="url(#arrow)"/>
                  <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#D69A3A"/>
                    </marker>
                  </defs>
                  {/* Label */}
                  <text x="95" y="208" textAnchor="middle" fontSize="9" fill="#888" fontStyle="italic">shoot from the side</text>
                </svg>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2.5">
                  <span className="text-[#D69A3A] font-black text-base mt-0.5">✓</span>
                  <div><strong className="text-gray-800">Side view</strong> — shoot straight at the side of the jar so you can see the full rise, bubble structure, and texture through the glass.</div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#D69A3A] font-black text-base mt-0.5">✓</span>
                  <div><strong className="text-gray-800">Natural light</strong> — a window beside or behind you works best. Avoid harsh flash or backlight.</div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#D69A3A] font-black text-base mt-0.5">✓</span>
                  <div><strong className="text-gray-800">Glass jar</strong> — clear glass lets the AI see bubble size, density, and how high the starter has risen.</div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#D69A3A] font-black text-base mt-0.5">✓</span>
                  <div><strong className="text-gray-800">Mark your start level</strong> — a rubber band or tape at the feeding line makes rise height obvious in every photo.</div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-red-400 font-black text-base mt-0.5">✗</span>
                  <div><strong className="text-gray-800">Not top-down</strong> — looking straight down only shows the surface, not how active the culture is.</div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-red-400 font-black text-base mt-0.5">✗</span>
                  <div><strong className="text-gray-800">No blurry shots</strong> — keep the jar sides in focus; blur hides the bubble detail the AI reads.</div>
                </div>
              </div>
              <button onClick={() => setShowPhotoGuide(false)} className="mt-5 w-full py-2.5 bg-[#D69A3A] text-white font-bold rounded-xl text-sm hover:bg-[#C98A3D] transition-colors">
                Got it
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Photo upload ── */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <Badge className="mb-4">Step 2 of 3</Badge>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl font-black tracking-tighter">Upload a photo of your starter</h1>
              <button type="button" onClick={() => setShowPhotoGuide(true)} className="flex items-center gap-1 text-xs text-[#D69A3A] font-semibold hover:underline whitespace-nowrap ml-3 flex-shrink-0">
                <HelpCircle size={13} /> Photo tips
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">Side view, natural light, clear glass jar preferred.</p>
            <p className="text-xs text-gray-400 mb-4">Photos are processed by AI and stored securely. <a href="/privacy" className="underline">Privacy Policy</a>.</p>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-4 cursor-pointer ${dragOver ? 'border-[#D69A3A] bg-[rgba(214,154,58,0.05)]' : 'border-gray-300 hover:border-gray-400'}`}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Starter preview" className="max-h-64 mx-auto rounded-xl object-contain mb-3" />
                  {imageData && <div className="text-xs text-gray-400">{imageData.sizeKb}KB compressed</div>}
                </div>
              ) : (
                <div>
                  <Upload size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-1">Drag & drop or click to upload</p>
                  <p className="text-xs text-gray-400">JPG, PNG, HEIC up to 10MB</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { fileRef.current!.setAttribute('capture', 'environment'); fileRef.current?.click() }}
              className="flex items-center gap-2 text-sm text-[#D69A3A] font-semibold mx-auto mb-6 hover:underline"
            >
              <Camera size={15} /> Take a photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1"><ChevronLeft size={16} /> Back</Button>
              <Button
                className="flex-1"
                onClick={() => { if (!imageData) { setError('Please upload a photo first.'); return } setError(''); setStep(2) }}
              >Continue <ChevronRight size={16} /></Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Questionnaire ── */}
        {step === 2 && (
          <div className="animate-fade-in-up space-y-6">
            <Badge className="mb-4">Step 3 of 3</Badge>
            <h1 className="text-2xl font-black tracking-tighter mb-1">Tell us about this session</h1>
            <p className="text-gray-400 text-sm mb-2">Takes about 60 seconds.</p>

            <Card className="p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#D69A3A] mb-4">This Feed</div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Hours since last feeding</label>
                  <SegmentedSelect options={HOURS_OPTIONS.map(h => ({ value: String(h), label: `${h}h` }))} value={String(questionnaire.hoursSinceLastFeed)} onChange={v => setQuestionnaire(q => ({ ...q, hoursSinceLastFeed: Number(v) }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Feeding ratio used</label>
                  <SegmentedSelect options={RATIO_OPTIONS} value={questionnaire.feedingRatio} onChange={v => setQuestionnaire(q => ({ ...q, feedingRatio: v }))} />
                  {questionnaire.feedingRatio === 'Custom' && (
                    <input
                      type="text"
                      value={customRatio}
                      onChange={e => setCustomRatio(e.target.value)}
                      placeholder="e.g. 1:4:4, 1:10:10..."
                      className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D69A3A]"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Room temperature: {questionnaire.roomTemp}°C</label>
                  <input type="range" min={14} max={32} value={questionnaire.roomTemp}
                    onChange={e => setQuestionnaire(q => ({ ...q, roomTemp: Number(e.target.value) }))}
                    className="w-full accent-[#D69A3A]"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>14°C</span><span>32°C</span></div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Rise since last feed</label>
                  <SegmentedSelect options={RISE_OPTIONS} value={questionnaire.riseDescription} onChange={v => setQuestionnaire(q => ({ ...q, riseDescription: v }))} />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Float test</label>
                  <p className="text-xs text-gray-400 mb-2">Drop a small spoonful in water — does it float?</p>
                  <div className="flex gap-2">
                    {[
                      { v: 'yes',      label: 'Floated ✓',     active: 'bg-emerald-500 text-white border-emerald-500' },
                      { v: 'no',       label: 'Sank',          active: 'bg-gray-700 text-white border-gray-700' },
                      { v: 'untested', label: "Didn't test",   active: 'bg-gray-200 text-gray-600 border-gray-200' },
                    ].map(({ v, label, active }) => (
                      <button key={v} type="button"
                        onClick={() => setQuestionnaire(q => ({ ...q, floatTest: v as QuestionnaireData['floatTest'] }))}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${questionnaire.floatTest === v ? active : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#D69A3A] mb-4">Visual &amp; Aroma</div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Surface Appearance</label>
                  <select
                    value={questionnaire.surfaceAppearance}
                    onChange={e => setQuestionnaire(q => ({ ...q, surfaceAppearance: e.target.value as QuestionnaireData['surfaceAppearance'] }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] bg-white"
                  >
                    {SURFACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Aroma</label>
                  <select
                    value={questionnaire.aroma}
                    onChange={e => setQuestionnaire(q => ({ ...q, aroma: e.target.value as QuestionnaireData['aroma'] }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] bg-white"
                  >
                    {AROMA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#D69A3A] mb-4">Symptoms (optional)</div>
              <div className="space-y-2.5">
                {SYMPTOM_OPTIONS.map(s => (
                  <label key={s} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={questionnaire.symptoms.includes(s)} onChange={() => toggleSymptom(s)} className="mt-0.5 accent-[#D69A3A] w-4 h-4 rounded flex-shrink-0" />
                    <span className="text-sm text-gray-700">{s}</span>
                  </label>
                ))}
              </div>
            </Card>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ChevronLeft size={16} /> Back</Button>
              <Button className="flex-1" onClick={runAnalysis}>
                Analyze Now →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
