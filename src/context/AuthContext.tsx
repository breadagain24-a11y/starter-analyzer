import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfile(userId: string): Promise<{ name: string; tier: string; stripeCustomerId?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name, tier, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle()            // returns null (not error) when no row found
    if (error) return null
    return data ? { name: data.name, tier: data.tier, stripeCustomerId: data.stripe_customer_id } : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange covers initial load via INITIAL_SESSION.
    // We set user immediately (no await) so loading unblocks right away,
    // then enrich with profile data in the background.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const su = session.user
        // Set user with auth defaults immediately — no network wait
        setUser({
          id: su.id,
          email: su.email!,
          name: su.email!.split('@')[0],
          tier: 'free',
          createdAt: new Date(su.created_at),
        })
        // Load Supabase profile in background and update if found
        fetchProfile(su.id).then(profile => {
          if (profile) {
            setUser(prev => prev
              ? { ...prev, name: profile.name, tier: profile.tier as User['tier'], stripeCustomerId: profile.stripeCustomerId }
              : prev)
          }
        })
      } else {
        setUser(null)
      }
      setLoading(false)  // unblock immediately — no longer waits for profile
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signup = async (name: string, email: string, password: string): Promise<{ needsConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) throw new Error(error.message)
    // Supabase silently "succeeds" for existing emails in two ways:
    // - confirmations OFF: identities array is empty
    // - confirmations ON: email_confirmed_at is set but there's no session (fake success)
    if (
      data.user?.identities?.length === 0 ||
      (data.user?.email_confirmed_at && !data.session)
    ) {
      throw new Error('An account with this email already exists. Please log in instead.')
    }
    // session is null when Supabase requires email confirmation before login
    return { needsConfirmation: !data.session }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut error:', e)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
