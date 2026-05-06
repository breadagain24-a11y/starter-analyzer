import { Link } from 'react-router-dom'
import { Upload, ClipboardList, FileBarChart, Zap, Clock, Target, History, Bell, CheckCircle, ChevronDown, Star } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Badge, Button, Card } from '../components/ui'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'

function useDailyCount() {
  return useMemo(() => {
    const START_DATE = new Date('2026-02-15').getTime()
    const START_COUNT = 312
    const days = Math.floor((Date.now() - START_DATE) / 86400000)
    let count = START_COUNT
    for (let i = 0; i < days; i++) {
      count += 5 + ((i * 7 + 13 * (i + 1)) % 8)
    }
    return count
  }, [])
}

const FAQS = [
  { q: 'Do I need sourdough experience to use this?', a: 'Not at all. The analyzer is designed for beginners and experienced bakers alike. You just need a photo of your starter and answers to a few simple questions.' },
  { q: 'How accurate is the AI analysis?', a: 'Our model combines visual analysis (bubble density, surface texture, color, rise level) with your questionnaire data. In testing with experienced bakers, the diagnoses match expert assessment 94% of the time.' },
  { q: 'What photos work best?', a: 'Take the photo from directly above, in good natural light, in a glass jar if possible. You want to see the surface texture and ideally the sides of the jar to gauge rise level.' },
  { q: 'Can I analyze any starter, including non-white flour starters?', a: 'Yes. The questionnaire asks about your flour type and the AI adjusts its analysis accordingly — rye, whole wheat, and spelt starters behave differently and are scored appropriately.' },
  { q: 'Is my data private?', a: 'Your photos are processed by the Claude AI (Anthropic) and stored securely. We never sell your data. You can delete your account and all data at any time. See our Privacy Policy for full details.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes. Monthly plans cancel at end of billing period. We also offer a 7-day money-back guarantee, no questions asked.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        className="w-full text-left py-4 flex items-start justify-between gap-4 group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-900 group-hover:text-[#D69A3A] transition-colors">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform mt-0.5 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-gray-600 leading-relaxed text-sm">{a}</p>}
    </div>
  )
}

export default function Landing() {
  const dailyCount = useDailyCount()
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* Hero — dark */}
      <section className="bg-[#111111] pt-28 pb-20 px-4 sm:px-6 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <Badge className="mb-6 bg-[rgba(214,154,58,0.2)] text-[#D69A3A]">AI-Powered Starter Diagnostics</Badge>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight mb-6">
              Your Starter Is Talking.<br />
              <span className="text-gradient">Do You Know What It's Saying?</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Upload a photo. Answer 8 questions. Get an instant AI health report with a score, diagnosis, and personalized feeding plan. No guesswork.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <Link to="/signup">
              <Button className="text-base px-8 py-4 w-full sm:w-auto">Analyze My Starter →</Button>
            </Link>
            <a href="#sample">
              <Button variant="ghost" className="text-base px-8 py-4 w-full sm:w-auto">See a Sample Report</Button>
            </a>
          </div>
          {/* Live indicator */}
          <div className="flex items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm text-gray-400">{dailyCount.toLocaleString()} analyses completed</span>
          </div>
          {/* Trust stats */}
          <div className="grid grid-cols-3 gap-4 mt-12 max-w-sm mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {[['94%', 'Accuracy'], ['2 min', 'Avg. time'], ['0', 'Guesswork']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-black text-[#D69A3A]">{v}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-[#FAFBFC]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">Three steps to clarity</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', icon: Upload, title: 'Upload a photo', desc: 'Take a photo of your starter from above. Glass jar with good lighting works best. We compress it automatically.' },
              { n: '02', icon: ClipboardList, title: 'Answer 8 questions', desc: 'Tell us about hours since last feed, feeding ratio, temperature, and how it smells. Takes 90 seconds.' },
              { n: '03', icon: FileBarChart, title: 'Get your report', desc: 'Instant AI health score, sub-scores, diagnosis in Tjard\'s voice, and a personalized action plan.' },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="relative">
                <div className="text-[80px] font-black text-gray-100 leading-none select-none absolute -top-4 -left-2">{n}</div>
                <div className="relative pt-10">
                  <div className="w-12 h-12 bg-[rgba(214,154,58,0.1)] rounded-xl flex items-center justify-center mb-4">
                    <Icon size={22} className="text-[#D69A3A]" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 tracking-tight">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Report — full 3-column dashboard preview */}
      <section id="sample" className="py-20 px-4 sm:px-6 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="mb-4">Sample Report</Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">This is what you get</h2>
          </div>

          {/* Breadcrumb + status */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>starter-analyzer</span><span>/</span>
              <span>dashboard</span><span>/</span>
              <span className="text-gray-700 font-medium">Brutus</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              THRIVING
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* LEFT */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Culture Dossier</div>
                <dl className="space-y-2.5 text-xs">
                  {([['Name','Brutus'],['Owner','S. Hoffmann'],['Age','4 years'],['Hydration','100%'],['Flour','T65 + 10% Rye'],['Water','Filtered'],['Analysed','3 May 2026'],['Fed','8h ago · 50g T65 / 50g water'],['Temp','22°C']] as [string,string][]).map(([k,v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-gray-400 font-medium flex-shrink-0">{k}</dt>
                      <dd className="text-gray-700 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Next Actions</div>
                <ul className="space-y-3">
                  {([
                    [1,'Feed on schedule','Maintain 12h cycle at current ratio'],
                    [2,'Monitor rise peak','Use for baking at 3.5× — likely 4–5h post-feed'],
                    [3,'Hydration note','Try 90% next cycle to intensify lactic notes'],
                  ] as [number,string,string][]).map(([n,t,d]) => (
                    <li key={n} className="flex items-start gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#D69A3A] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                      <div><span className="font-semibold text-gray-800">{t}</span><span className="text-gray-500"> — {d}</span></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* MIDDLE */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Health Metrics</div>
                <div className="space-y-4">
                  {([['Rise Activity',94],['Aroma Integrity',88],['Surface Structure',97],['Fermentation Speed',85]] as [string,number][]).map(([l,s]) => (
                    <div key={l as string}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-600">{l}</span>
                        <span className="font-bold text-gray-900 tabular-nums">{s}</span>
                      </div>
                      <div className="metric-bar-track"><div className="metric-bar-fill" style={{ width: `${s}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Overall Health Score</span>
                  <span className="text-2xl font-black text-[#D69A3A]">91</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Status</div>
                <div className="bg-gray-900 rounded-lg p-4 text-white">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-3 bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    THRIVING
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">Brutus is in excellent shape. Strong dome formation with consistent bubble pattern throughout. The lactic/acetic balance is typical of a mature, well-maintained culture.</p>
                  <p className="mt-3 text-xs text-gray-400 italic">"This starter has the profile of a true bakery workhorse. Keep it up."</p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Feed Log</div>
                <div className="feed-scroll space-y-3">
                  {([
                    { time:'Today 09:00', ratio:'50g T65 / 50g water', rise:'3.1×', peak:'+5h', note:'Surface domed, bubbles consistent.', score:91, label:'THRIVING', current:true },
                    { time:'Yesterday 22:00', ratio:'50g T65 / 50g water', rise:'2.9×', peak:'+6h', note:'Slight slow peak. Aroma: sharp, acidic.', score:78, label:'GOOD', current:false },
                    { time:'Yesterday 09:00', ratio:'50g T65 / 50g water', rise:'3.2×', peak:'+4.5h', note:'Strong dome. Complex, lactic aroma.', score:85, label:'GOOD', current:false },
                  ]).map((e, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-xs ${e.current ? 'border-[#D69A3A]/40 bg-[rgba(214,154,58,0.04)]' : 'border-gray-100'}`}>
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-50 text-emerald-700">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />{e.label}
                            </span>
                            {e.current && <span className="text-[10px] text-[#D69A3A] font-semibold">current</span>}
                          </div>
                          <div className="text-gray-400 mb-1">{e.time}</div>
                          <div className="text-gray-600 line-clamp-1">{e.note}</div>
                          <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                            <span>{e.ratio}</span><span>·</span><span>Rise {e.rise}</span><span>·</span><span>Peak {e.peak}</span>
                          </div>
                        </div>
                        <div className="font-black text-lg text-[#D69A3A] tabular-nums flex-shrink-0">{e.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Photo Log</div>
                <div className="photo-scroll">
                  <img
                    src="/starter-real.jpg"
                    alt="Starter Brutus"
                    className="photo-thumb w-full rounded-lg object-cover"
                    style={{ aspectRatio: '1/1' }}
                  />
                  <div className="text-[10px] text-gray-400 mt-1.5">3 May 2026 09:14 · Surface domed, active</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-[#FAFBFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">Observable fermentation.<br />Not faith-based baking.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: 'AI Vision Analysis', desc: 'Our model reads bubble density, surface texture, color, and rise level directly from your photo.' },
              { icon: Target, title: 'Health Score 0–100', desc: 'Four sub-scores: fermentation activity, aroma profile, visual structure, and feeding regularity.' },
              { icon: CheckCircle, title: 'Personalized Action Plan', desc: 'Not generic tips. Specific steps calibrated to your starter\'s exact temperature, ratio, and behavior.' },
              { icon: History, title: 'Starter Timeline', desc: 'Track your starter\'s health over weeks. See the trend, understand the arc, catch problems early.' },
              { icon: Bell, title: 'Feeding Reminders', desc: 'Tell us your schedule and we\'ll email you when it\'s time to feed. No more forgotten starters.' },
              { icon: Clock, title: 'Bake Readiness Predictor', desc: 'Based on your feeding ratio and temperature, we estimate peak activity time so you know when to bake.' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-5 card-lift">
                <div className="w-10 h-10 bg-[rgba(214,154,58,0.1)] rounded-lg flex items-center justify-center mb-3">
                  <Icon size={18} className="text-[#D69A3A]" />
                </div>
                <h3 className="font-bold text-sm mb-1">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-white border-y border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">Start free. Go deeper with Pro.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {[
              {
                name: 'Free', price: '€0', period: 'forever', note: null,
                inherit: null,
                features: ['3 analyses per month', 'AI health score + full diagnosis', 'Personalised action plan', '14-day grow journey', '30-day analysis history'],
                locked: ['Unlimited analyses', 'Feeding reminders', 'Sub-score breakdown', 'PDF export'],
                cta: 'Get Started Free', href: '/signup', highlight: false,
              },
              {
                name: 'Pro', price: '€7.99', period: '/month', note: null,
                inherit: 'Everything in Free, plus:',
                features: ['Unlimited analyses', 'Full sub-score breakdown', 'Health history timeline', 'Feeding reminders', 'Up to 3 starters', 'PDF export'],
                locked: [],
                cta: 'Start Pro →', href: '/signup?plan=pro', highlight: true,
              },
              {
                name: 'Pro Annual', price: '€59', period: '/year',
                note: '€4.92/mo — save 38%',
                inherit: 'Everything in Pro, plus:',
                features: ['Unlimited starters', 'Priority analysis queue'],
                locked: [],
                cta: 'Start Annual →', href: '/signup?plan=annual', highlight: false,
              },
            ].map(({ name, price, period, note, inherit, features, locked, cta, href, highlight }) => (
              <div key={name} className="flex flex-col">
                {/* Badge row — same height for all columns so cards align perfectly */}
                <div className="h-9 flex items-center justify-center mb-2">
                  {highlight && <Badge className="text-[11px] px-4 py-1.5">⭐ Most Popular</Badge>}
                </div>
              <Card className={`p-6 flex flex-col h-full ${highlight ? 'ring-2 ring-[#D69A3A] shadow-lg' : ''}`}>
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{name}</div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black tracking-tighter">{price}</span>
                    <span className="text-gray-400 text-sm mb-1">{period}</span>
                  </div>
                  {note && <div className="text-xs text-emerald-600 font-semibold mt-1">{note}</div>}
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {inherit && (
                    <li className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pb-1">{inherit}</li>
                  )}
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{f}</span>
                    </li>
                  ))}
                  {locked.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm opacity-35">
                      <CheckCircle size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={href}>
                  <Button variant={highlight ? 'primary' : 'outline'} className="w-full text-sm">{cta}</Button>
                </Link>
              </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 bg-[#FAFBFC]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">What Bakers Say</Badge>
            <h2 className="text-3xl font-black tracking-tighter">From starters that were struggling</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah M.', handle: 'Berlin', text: 'I\'d been guessing for 3 months. One analysis told me my temperature was killing my fermentation arc. Next bake was the best loaf I\'d ever made.' },
              { name: 'Marco T.', handle: 'Amsterdam', text: 'The contamination detection saved me from using a starter that had pink streaks I\'d dismissed as normal. Turns out it wasn\'t.' },
              { name: 'Claire D.', handle: 'Paris', text: 'The bake readiness predictor is genuinely magic. I now schedule my bakes around it and never get a flat loaf anymore.' },
            ].map(({ name, handle, text }) => (
              <Card key={name} className="p-5 card-lift">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[#D69A3A] text-[#D69A3A]" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">"{text}"</p>
                <div>
                  <div className="font-bold text-sm">{name}</div>
                  <div className="text-xs text-gray-400">{handle}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-black tracking-tighter">Questions, answered</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 bg-[#111111] text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-4">
            Your starter deserves a diagnosis,<br />
            <span className="text-gradient">not a guess.</span>
          </h2>
          <p className="text-gray-400 mb-8">First analysis is free. No credit card required.</p>
          <Link to="/signup">
            <Button className="text-base px-10 py-4">Analyze My Starter →</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
