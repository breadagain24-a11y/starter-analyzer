import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StarterProvider } from './context/StarterContext'
import { trackPageview, identifyUser, resetUser } from './lib/posthog'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Grow from './pages/Grow'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'
import ResetPassword from './pages/ResetPassword'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#D69A3A]/20 border-t-[#D69A3A] animate-spin" />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function Analytics() {
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    trackPageview(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    if (user) {
      identifyUser(user.id, user.email, user.name, user.tier)
    } else {
      resetUser()
    }
  }, [user])

  return null
}

function AppRoutes() {
  return (
    <>
      <Analytics />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
        <Route path="/report/:id" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/grow" element={<ProtectedRoute><Grow /></ProtectedRoute>} />
        <Route path="/grow/:id" element={<ProtectedRoute><Grow /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StarterProvider>
          <AppRoutes />
        </StarterProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
