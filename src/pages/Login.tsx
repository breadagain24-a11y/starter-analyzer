import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wheat, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent]   = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  // Navigate once auth state resolves — avoids race between navigate() and onAuthStateChange
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // useEffect navigates once user is set by onAuthStateChange
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setForgotSent(true)
    }
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

        {showForgot ? (
          <>
            <h1 className="text-2xl font-black tracking-tighter mb-1">Reset password</h1>
            <p className="text-gray-400 text-sm mb-6">We'll send a reset link to your email.</p>

            {forgotSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 text-center">
                ✓ Check your inbox — reset link sent to <strong>{forgotEmail}</strong>
              </div>
            ) : (
              <>
                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
                    <input
                      type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending…' : 'Send reset link →'}
                  </Button>
                </form>
              </>
            )}

            <button onClick={() => { setShowForgot(false); setForgotSent(false); setError('') }}
              className="mt-5 block w-full text-center text-sm text-[#D69A3A] font-semibold hover:underline">
              ← Back to login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black tracking-tighter mb-1">Welcome back</h1>
            <p className="text-gray-400 text-sm mb-6">Log in to your starter dashboard</p>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Password</label>
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs text-[#D69A3A] font-semibold hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in…' : 'Log in →'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-5">
              No account?{' '}
              <Link to="/signup" className="text-[#D69A3A] font-semibold hover:underline">Sign up free</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
