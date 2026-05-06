import { Link, useNavigate } from 'react-router-dom'
import { Wheat, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui'

export default function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    try { await logout() } catch { /* already handled in AuthContext */ }
    navigate('/')
  }

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50 border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#D69A3A] rounded-lg flex items-center justify-center">
            <Wheat size={16} className="text-white" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-gray-900">Starter Analyzer</span>
            <span className="block text-[9px] uppercase tracking-widest text-gray-400 font-bold leading-none">by Breadagain</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {!user ? (
            <>
              <a href="/#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">How It Works</a>
              <a href="/#features" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Features</a>
              <a href="/#pricing" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Pricing</a>
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Log in</Link>
              <Link to="/signup">
                <Button className="text-sm py-2.5 px-5">Start Free →</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Dashboard</Link>
              <Link to="/grow" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Grow</Link>
              <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Settings</Link>
              <a href="https://instagram.com/breadagain__" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-[#D69A3A] transition-colors" title="@breadagain__ on Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
              </a>
              <Link to="/analyze">
                <Button className="text-sm py-2.5 px-5">+ New Analysis</Button>
              </Link>
              <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Log out</button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-200/60 bg-white/95 backdrop-blur px-4 py-4 flex flex-col gap-3">
          {!user ? (
            <>
              <a href="/#how-it-works" className="text-sm text-gray-700 font-medium py-2">How It Works</a>
              <a href="/#features" className="text-sm text-gray-700 font-medium py-2">Features</a>
              <a href="/#pricing" className="text-sm text-gray-700 font-medium py-2">Pricing</a>
              <Link to="/login" className="text-sm text-gray-700 font-medium py-2">Log in</Link>
              <Link to="/signup"><Button className="w-full text-sm">Start Free →</Button></Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-sm text-gray-700 font-medium py-2">Dashboard</Link>
              <Link to="/grow" className="text-sm text-gray-700 font-medium py-2">Grow New Starter</Link>
              <Link to="/settings" className="text-sm text-gray-700 font-medium py-2">Settings</Link>
              <Link to="/analyze"><Button className="w-full text-sm">+ New Analysis</Button></Link>
              <button onClick={handleLogout} className="text-sm text-gray-400 text-left py-2">Log out</button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
