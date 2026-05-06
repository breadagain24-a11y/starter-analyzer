export type Tier = 'free' | 'pro' | 'pro_annual'

export interface User {
  id: string
  email: string
  name: string
  tier: Tier
  stripeCustomerId?: string
  createdAt: Date
}

export interface StarterProfile {
  id: string
  userId: string
  name: string
  age: 'under-1-month' | '1-6-months' | '6-12-months' | '1-5-years' | 'custom'
  flourType: string[]
  waterType: string
  targetHydration: number
  createdAt: Date
  lastAnalyzedAt?: Date
  fridgeStatus?: 'active' | 'dormant'
  fridgeRemovedAt?: Date
}

export type SurfaceAppearance = 'collapsed' | 'flat' | 'slight_dome' | 'clear_dome' | 'peaked_bubbles'
export type AromaProfile = 'off' | 'neutral' | 'mild_yeasty' | 'mild_lactic' | 'sharp_acetic' | 'sharp_acidic' | 'complex'

export interface QuestionnaireData {
  hoursSinceLastFeed: number
  feedingRatio: string
  roomTemp: number
  riseDescription: string
  surfaceAppearance: SurfaceAppearance
  aroma: AromaProfile
  symptoms: string[]
  floatTest?: 'yes' | 'no' | 'untested'
}

export interface SubScores {
  fermentationActivity: number
  aromaProfileHealth: number
  visualStructureScore: number
  feedingRegularityScore: number
}

export interface ActionStep {
  step: number
  title: string
  detail: string
}

export interface AnalysisFlags {
  moldRisk: boolean
  hoochDetected: boolean
  overFermented: boolean
  underActive: boolean
  contamination: boolean
}

export interface AIResult {
  overallScore: number
  scoreLabel: 'THRIVING' | 'GOOD' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'CRITICAL'
  subScores: SubScores
  diagnosis: string
  actionSteps: ActionStep[]
  bakeReadinessHours: number | null
  bakeReadinessNote: string
  flags: AnalysisFlags
  encouragementNote: string
}

export interface Analysis {
  id: string
  userId: string
  starterId: string
  starterName: string
  imageUrl: string
  questionnaireData: QuestionnaireData
  aiResult: AIResult
  createdAt: Date
}

export interface FeedEntry {
  id: string
  userId: string
  starterId: string
  starterName: string
  ratio: string
  riseMultiplier: string
  peakTime: string
  roomTemp: number
  note: string
  imageUrl?: string
  createdAt: Date
}

export interface StarterNote {
  id: string
  starterId: string
  text: string
  createdAt: Date
}

export interface FeedingReminder {
  id: string
  starterId: string
  starterName: string
  feedAt: Date          // absolute timestamp when to remind
  notified: boolean
}

export interface DailyLog {
  day: number           // 1–14
  date: Date
  fed: boolean
  observations: string
  smell: string         // 'none' | 'musty' | 'sour' | 'yeasty' | 'acidic'
  bubbles: string       // 'none' | 'few' | 'moderate' | 'lots'
  rise: string          // 'none' | 'slight' | 'doubled' | 'more'
  // Feed timing (feed 1)
  feedTime?: string     // "HH:MM" 24h, e.g. "08:00"
  peaked?: boolean
  peakHours?: number    // hours until peak after first feed
  // Second feed (optional)
  fedTwice?: boolean
  feed2Time?: string    // "HH:MM" 24h
  feed2bubbles?: string
  feed2rise?: string
  feed2smell?: string
  feed2peaked?: boolean
  feed2peakHours?: number
  imageUrl?: string
}

export interface StarterJourney {
  id: string
  userId: string
  name: string
  flourType: string[]
  waterType: string
  targetHydration: number
  startDate: Date
  currentDay: number
  logs: DailyLog[]
  status: 'active' | 'graduated' | 'abandoned'
  graduatedStarterId?: string   // links to StarterProfile after graduation
  createdAt: Date
}
