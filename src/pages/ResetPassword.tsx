import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wheat, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'

export default function ResetPassword() {
  const navigate = useNavigate()
  // AuthContext's onAuthStateChange is mounted before this component and reliably
  // catches the PASSWORD_RECOVERY event. Derive `ready` from it instead of a
  // race-prone local subscription that can miss the event on first load.
  const { user, loading: authLoading } = useAuth()
  const ready = !authLoading && !!user

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm)  { setError("Passwords don't match"); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setDone(true)
        setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
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
        <h1 className="text-2xl font-black tracking-tighter mb-1">Set new password</h1>
        <p className="text-gray-400 text-sm mb-6">Choose a strong password for your account.</p>

        {done ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 text-center">
            ✓ Password updated! Taking you to your dashboard…
          </div>

        ) : !ready ? (
          /* Still waiting for Supabase to process the recovery token */
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-8 h-8 rounded-full border-4 border-[#D69A3A]/20 border-t-[#D69A3A] animate-spin" />
            <p className="text-sm text-gray-400">Verifying reset link…</p>
          </div>

        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors pr-10"
                    placeholder="Min. 6 characters"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'} required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D69A3A] transition-colors"
                  placeholder="Repeat password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password →'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
