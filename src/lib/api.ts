import { supabase } from './supabase'
import type { QuestionnaireData, StarterProfile, AIResult } from '../types'

export async function analyzeStarter(params: {
  imageBase64: string
  mimeType: string
  questionnaire: QuestionnaireData
  starter: StarterProfile
}): Promise<AIResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }))
    throw new Error(err.error || 'Analysis failed')
  }
  return res.json()
}
