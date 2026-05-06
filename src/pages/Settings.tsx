import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, Button, Badge } from '../components/ui'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useNavigate } from 'react-router-dom'
import { Check, Pencil, X, Lock } from 'lucide-react'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [nameVal, setNameVal] = useState(user?.name ?? '')
  const [emailVal, setEmailVal] = useState(user?.email ?? '')
  const [savedMsg, setSavedMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleSaveProfile = async () => {
    if (!user) return
    setErrorMsg('')
    try {
      const nameChanged = nameVal.trim() && nameVal.trim() !== user.name
      const emailChanged = emailVal.trim() && emailVal.trim() !== user.email

      if (nameChanged) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ name: nameVal.trim() })
          .eq('id', user.id)
        if (error) throw error
      }
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: emailVal.trim() })
        if (error) throw error
      }

      setEditingName(false)
      setEditingEmail(false)
      setSavedMsg(emailChanged
        ? 'Check your new email address for a confirmation link.'
        : 'Changes saved.')
      setTimeout(() => setSavedMsg(''), 5000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes.')
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordMsg('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
      setChangingPassword(false)
      setTimeout(() => setPasswordMsg(''), 4000)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirmed) { setConfirmed(true); return }
    try { await logout() } catch { /* ignore */ }
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <Nav />
      <div className="max-w-xl mx-auto px-4 pt-24 pb-16 w-full flex-1">
        <h1 className="text-3xl font-black tracking-tighter mb-8">Settings</h1>

        <Card className="p-6 mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-[#D69A3A] mb-4">Account</div>
          <div className="space-y-4">

            {/* Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">Name</span>
                <button onClick={() => setEditingName(e => !e)} className="text-[10px] text-[#D69A3A] font-semibold flex items-center gap-1 hover:underline">
                  {editingName ? <><X size={10} /> Cancel</> : <><Pencil size={10} /> Edit</>}
                </button>
              </div>
              {editingName ? (
                <input
                  autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D69A3A]"
                />
              ) : (
                <p className="font-semibold text-gray-900">{user.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">Email</span>
                <button onClick={() => setEditingEmail(e => !e)} className="text-[10px] text-[#D69A3A] font-semibold flex items-center gap-1 hover:underline">
                  {editingEmail ? <><X size={10} /> Cancel</> : <><Pencil size={10} /> Edit</>}
                </button>
              </div>
              {editingEmail ? (
                <input
                  autoFocus type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D69A3A]"
                />
              ) : (
                <p className="font-semibold text-gray-900">{user.email}</p>
              )}
            </div>

            {/* Plan */}
            <div>
              <span className="text-xs text-gray-400 font-medium">Plan</span>
              <p className="mt-0.5">
                <Badge className="capitalize">{user.tier.replace('_', ' ')}</Badge>
              </p>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">Password</span>
                <button onClick={() => { setChangingPassword(p => !p); setPasswordError(''); setNewPassword(''); setConfirmPassword('') }}
                  className="text-[10px] text-[#D69A3A] font-semibold flex items-center gap-1 hover:underline">
                  {changingPassword ? <><X size={10} /> Cancel</> : <><Lock size={10} /> Change</>}
                </button>
              </div>
              {changingPassword ? (
                <div className="space-y-2">
                  <input
                    type="password" placeholder="New password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D69A3A]"
                  />
                  <input
                    type="password" placeholder="Confirm new password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D69A3A]"
                  />
                  {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                  <button onClick={handleChangePassword}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-colors">
                    <Check size={14} /> Update password
                  </button>
                </div>
              ) : (
                <p className="font-semibold text-gray-400 text-sm tracking-widest">••••••••</p>
              )}
              {passwordMsg && <p className="text-xs text-emerald-600 mt-1">{passwordMsg}</p>}
            </div>

            {/* Save button */}
            {(editingName || editingEmail) && (
              <button onClick={handleSaveProfile} className="flex items-center gap-1.5 px-4 py-2 bg-[#D69A3A] text-white text-sm font-bold rounded-lg hover:bg-[#C98A3D] transition-colors">
                <Check size={14} /> Save changes
              </button>
            )}
            {savedMsg && <p className="text-xs text-emerald-600">{savedMsg}</p>}
            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
          </div>
        </Card>

        {user.tier === 'free' && (
          <Card className="p-6 mb-4 bg-[rgba(214,154,58,0.05)] border-[#D69A3A]/30">
            <div className="text-xs font-bold uppercase tracking-widest text-[#D69A3A] mb-2">Upgrade to Pro</div>
            <p className="text-sm text-gray-600 mb-4">Unlimited analyses, full sub-scores, health timeline, email reminders.</p>
            <Button className="w-full text-sm">Upgrade to Pro — €7.99/mo →</Button>
          </Card>
        )}

        <Card className="p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">Danger Zone</div>
          <p className="text-sm text-gray-500 mb-4">Deleting your account removes all your data permanently. This cannot be undone.</p>
          <button
            onClick={handleDeleteAccount}
            className={`px-5 py-3 rounded-xl text-sm font-bold border transition-colors ${confirmed ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'border-red-200 text-red-500 hover:border-red-400'}`}
          >
            {confirmed ? 'Confirm: Delete my account' : 'Delete account'}
          </button>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
