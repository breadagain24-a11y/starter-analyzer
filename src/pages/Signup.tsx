import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wheat, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/posthog'
import { Button } from '../components/ui'

export default function Signup() {
  const { signup, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  // Navigate once Supabase session + profile are ready
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    try {
      const { needsConfirmation: confirm } = await signup(name, email, password)
      track('signup_completed')
      if (confirm) {
        // Supabase requires email confirmation — no session yet, show message
        setNeedsConfirmation(true)
      }
      // else: onAuthStateChange fires → user is set → useEffect navigates
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center px-4 py-12">
        <Link to="/" className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-[#D69A3A] rounded-xl flex items-center justify-center">
            <Wheat size={18} className="text-white" />
          </div>
          <div>
            <span className="font-black text-base tracking-tight">Starter Analyzer</span>
            <span className="block text-[9px] uppercase tracking-widest text-gray-400 font-bold leading-none">by Breadagain</span>
          </div>
        </Link>
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-2xl font-black tracking-tighter mb-2">Check your inbox</h1>
          <p className="text-gray-500 text-sm mb-2">
            We sent a confirmation link to <strong>{email}</strong>.
          </p>
          <p className="text-gray-400 text-xs mb-6">Click the link in the email to activate your account, then come back to log in.</p>
          <Link to="/login">
            <Button variant="outline" className="w-full">Go to login →</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-[#D69A3A] rounded-xl flex items-center justify-center">
          <Wheat size={18} className="text-white" />
        </div>
        <div>
          <span className="font-black text-base tracking-tight">Starter Analyzer</span>
          <span className="block text-[9px] uppercase tracking-widest text-gray-400 font-bold leading-none">by Breadagain</span>
        </div>
      </Link>

      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-black tracking-tighter mb-1">Create your account</h1>
        <p className="text-gray-400 text-sm mb-6">Free forever. No credit card required.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Your name</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors pr-10"
                placeholder="Min. 6 characters"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create free account →'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          By signing up you agree to our{' '}
          <Link to="/terms" className="underline hover:text-gray-600">Terms</Link> and{' '}
          <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
        </p>
        <p className="text-center text-sm text-gray-400 mt-3">
          Already have an account?{' '}
          <Link to="/login" className="text-[#D69A3A] font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
