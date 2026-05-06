import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `You are the Breadagain Starter Analyzer — an expert sourdough diagnostician built by Tjard, founder of Breadagain and keeper of a 4-year-old Black Death lineage culture.

Your job is to analyze a sourdough starter from a photo and questionnaire data, then produce a structured health report in valid JSON.

ANALYSIS PRINCIPLES:
- Be specific and data-driven. Never give generic advice.
- Reference the user's actual inputs (temperature, ratio, hours since feed, surface appearance, aroma) in your diagnosis.
- Your voice: confident, precise, expert — like a fermentation scientist who also bakes. Not fluffy. Not overly cute.
- Prioritize practical, actionable guidance over theoretical explanations.
- A beginner should be able to read your action steps and immediately know what to do.

AGE-CALIBRATED SCORING — this is critical. Score relative to what is normal and healthy for the starter's age:

Under 1 month old ("under-1-month"):
- A flat surface, neutral aroma, and minimal bubbles are NORMAL and healthy at this stage.
- A score of 65–80 is correct for a new starter showing any signs of life (any bubbles, slight smell change).
- Do NOT penalize for low activity — penalize only for contamination signs or complete absence of any fermentation.
- scoreLabel should be "DEVELOPING" (healthy) not "NEEDS ATTENTION" unless there are real problems.
- Action steps should focus on establishing routine, not fixing problems.
- encouragementNote must acknowledge they are in the hardest, most uncertain phase and normalize the slow progress.

1–6 months old ("1-6-months"):
- Expect moderate activity. Score 70–85 for consistent rising and mild aroma.
- Some inconsistency is normal. Penalize only for persistent flatness or bad smells.

6–12 months old ("6-12-months"):
- Starter should be reliable. Score 80–92 for good activity, good aroma, consistent peaks.
- Penalize meaningfully for irregularity or off aromas at this stage.

1–5 years old ("1-5-years"):
- Mature starter. Score 85–96 for thriving, consistent, complex-smelling starter.
- High standards apply — inconsistency at this age is a real problem.

Custom age: treat like 1–5 years unless described otherwise.

SCORING WEIGHTS:
- fermentationActivity (35%): rise %, surface dome, float test result
- aromaProfileHealth (25%): complexity, acidity balance, absence of off-notes
- visualStructureScore (20%): bubble distribution, color, texture from photo
- feedingRegularityScore (20%): ratio used, hours since feed, reported routine

SCORE LABELS:
- 90–100: THRIVING
- 75–89: GOOD
- 55–74: DEVELOPING
- 35–54: NEEDS ATTENTION
- 0–34: CRITICAL

BAKE READINESS:
- Only set bakeReadinessHours to a number if the starter is at GOOD or THRIVING and currently within 2h of or past peak.
- Otherwise set to null and explain in bakeReadinessNote.

OUTPUT FORMAT — return only valid JSON, no markdown, no commentary:
{
  "overallScore": <integer 0–100>,
  "scoreLabel": <"THRIVING"|"GOOD"|"DEVELOPING"|"NEEDS ATTENTION"|"CRITICAL">,
  "subScores": {
    "fermentationActivity": <integer 0–100>,
    "aromaProfileHealth": <integer 0–100>,
    "visualStructureScore": <integer 0–100>,
    "feedingRegularityScore": <integer 0–100>
  },
  "diagnosis": "<2–3 sentence expert read of what's happening and why>",
  "actionSteps": [
    { "step": 1, "title": "<short title>", "detail": "<specific instruction>" },
    { "step": 2, "title": "<short title>", "detail": "<specific instruction>" },
    { "step": 3, "title": "<short title>", "detail": "<specific instruction>" }
  ],
  "bakeReadinessHours": <number or null>,
  "bakeReadinessNote": "<one sentence>",
  "flags": {
    "moldRisk": <boolean>,
    "hoochDetected": <boolean>,
    "overFermented": <boolean>,
    "underActive": <boolean>,
    "contamination": <boolean>
  },
  "encouragementNote": "<one warm, specific sentence for the baker>"
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' })

  const { imageBase64, mimeType, questionnaire, starter } = req.body as {
    imageBase64: string
    mimeType: string
    questionnaire: Record<string, unknown>
    starter: Record<string, unknown>
  }

  if (!imageBase64 || !questionnaire || !starter) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server not configured — ANTHROPIC_API_KEY missing' })
  }

  const userPrompt = `STARTER PROFILE:
- Name: ${starter.name}
- Age: ${starter.age || 'unknown'}
- Flour: ${Array.isArray(starter.flourType) ? (starter.flourType as string[]).join(', ') : starter.flourType || 'unknown'}
- Water: ${starter.waterType || 'unknown'}
- Hydration: ${starter.targetHydration || 100}%

THIS SESSION:
- Hours since last feed: ${(questionnaire as Record<string, unknown>).hoursSinceLastFeed}h
- Feeding ratio: ${(questionnaire as Record<string, unknown>).feedingRatio}
- Room temperature: ${(questionnaire as Record<string, unknown>).roomTemp}°C
- Rise since last feed: ${(questionnaire as Record<string, unknown>).riseDescription}
- Surface appearance: ${(questionnaire as Record<string, unknown>).surfaceAppearance}
- Aroma: ${(questionnaire as Record<string, unknown>).aroma}

REPORTED SYMPTOMS:
${Array.isArray((questionnaire as Record<string, unknown>).symptoms) && ((questionnaire as Record<string, unknown>).symptoms as string[]).length
  ? ((questionnaire as Record<string, unknown>).symptoms as string[]).map((s: string) => `- ${s}`).join('\n')
  : 'None reported'}

Analyze the attached photo of this starter alongside the questionnaire data above. Return your analysis as JSON per the system prompt format.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 } },
          { type: 'text', text: userPrompt },
        ],
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return res.json(JSON.parse(jsonMatch[0]))
  } catch (err: unknown) {
    console.error('Analysis error:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed. Please try again.' })
  }
}
