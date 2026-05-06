import type { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export interface AuthedRequest extends Request {
  userId: string
  userTier: string
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  // Fetch tier for rate limiting / feature gating
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  ;(req as AuthedRequest).userId = user.id
  ;(req as AuthedRequest).userTier = profile?.tier ?? 'free'
  next()
}
