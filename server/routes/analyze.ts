import express from 'express'
import type { Request, Response } from 'express'
import { getClient, SYSTEM_PROMPT } from '../lib/anthropic.ts'
import { requireAuth, type AuthedRequest } from '../middleware/auth.ts'

const router = express.Router()

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { userId, userTier } = req as AuthedRequest
  const { imageBase64, mimeType, questionnaire, starter } = req.body

  if (!imageBase64 || !questionnaire || !starter) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server not configured — ANTHROPIC_API_KEY missing' })
  }

  // Rate limit: free tier gets 10 analyses/month (enforce via Supabase in production)
  void userId; void userTier

  const userPrompt = `STARTER PROFILE:
- Name: ${starter.name}
- Age: ${starter.age || 'unknown'}
- Flour: ${Array.isArray(starter.flourType) ? starter.flourType.join(', ') : starter.flourType || 'unknown'}
- Water: ${starter.waterType || 'unknown'}
- Hydration: ${starter.targetHydration || 100}%

THIS SESSION:
- Hours since last feed: ${questionnaire.hoursSinceLastFeed}h
- Feeding ratio: ${questionnaire.feedingRatio}
- Room temperature: ${questionnaire.roomTemp}°C
- Rise since last feed: ${questionnaire.riseDescription}
- Surface appearance: ${questionnaire.surfaceAppearance}
- Aroma: ${questionnaire.aroma}

REPORTED SYMPTOMS:
${questionnaire.symptoms?.length ? questionnaire.symptoms.map((s: string) => `- ${s}`).join('\n') : 'None reported'}

Analyze the attached photo of this starter alongside the questionnaire data above. Return your analysis as JSON per the system prompt format.`

  try {
    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
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
    const result = JSON.parse(jsonMatch[0])
    return res.json(result)
  } catch (err: unknown) {
    console.error('Analysis error:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed. Please try again.' })
  }
})

export default router
