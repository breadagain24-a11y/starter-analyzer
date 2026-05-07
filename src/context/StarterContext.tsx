import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { StarterProfile, Analysis, FeedEntry, StarterNote, FeedingReminder, StarterJourney, DailyLog } from '../types'
import { useAuth } from './AuthContext'

interface StarterContextType {
  dataLoaded: boolean
  starters: StarterProfile[]
  analyses: Analysis[]
  feeds: FeedEntry[]
  notes: StarterNote[]
  reminders: FeedingReminder[]
  journeys: StarterJourney[]

  addStarter: (s: Omit<StarterProfile, 'id' | 'userId' | 'createdAt'>) => StarterProfile
  updateStarter: (id: string, updates: Partial<Omit<StarterProfile, 'id' | 'userId' | 'createdAt'>>) => void
  deleteStarter: (starterId: string) => void
  saveAnalysis: (a: Omit<Analysis, 'id' | 'createdAt'>) => Analysis
  addFeed: (f: Omit<FeedEntry, 'id' | 'createdAt'>) => FeedEntry
  getAnalysesForStarter: (starterId: string) => Analysis[]
  getFeedsForStarter: (starterId: string) => FeedEntry[]

  addNote: (starterId: string, text: string) => void
  deleteNote: (noteId: string) => void
  getNotesForStarter: (starterId: string) => StarterNote[]

  addReminder: (starterId: string, starterName: string, feedAt: Date) => void
  dismissReminder: (reminderId: string) => void
  getRemindersForStarter: (starterId: string) => FeedingReminder[]

  addJourney: (j: Omit<StarterJourney, 'id' | 'userId' | 'createdAt' | 'currentDay' | 'logs' | 'status'>) => StarterJourney
  updateJourneyLog: (journeyId: string, log: DailyLog) => void
  graduateJourney: (journeyId: string, starterId: string) => void
  abandonJourney: (journeyId: string) => void
  reviveJourney: (journeyId: string) => void
}

const StarterContext = createContext<StarterContextType | null>(null)

// ── localStorage helpers ──────────────────────────────────────
// localStorage is the source of truth for user data.
// Supabase is synced in the background — if it fails, local data is safe.

const LS = {
  key: (userId: string, entity: string) => `ba_${entity}_${userId}`,
  save<T>(userId: string, entity: string, data: T[]) {
    try { localStorage.setItem(LS.key(userId, entity), JSON.stringify(data)) }
    catch (e) { console.error('LS save error:', e) }
  },
  load<T>(userId: string, entity: string, revive: (raw: Record<string, unknown>) => T): T[] {
    try {
      const raw = localStorage.getItem(LS.key(userId, entity))
      if (!raw) return []
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      if (!Array.isArray(parsed)) return []
      return parsed.filter(Boolean).map(revive).filter(Boolean) as T[]
    } catch (e) {
      console.error('LS load error:', e)
      return []
    }
  },
  clear(userId: string, entity: string) {
    try { localStorage.removeItem(LS.key(userId, entity)) }
    catch { /* ignore */ }
  },
}

// ── Date revivers ─────────────────────────────────────────────
function reviveStarter(r: Record<string, unknown>): StarterProfile {
  return {
    ...r as unknown as StarterProfile,
    createdAt: new Date(r.createdAt as string),
    lastAnalyzedAt: r.lastAnalyzedAt ? new Date(r.lastAnalyzedAt as string) : undefined,
  }
}
function reviveAnalysis(r: Record<string, unknown>): Analysis {
  return { ...r as unknown as Analysis, createdAt: new Date(r.createdAt as string) }
}
function reviveFeed(r: Record<string, unknown>): FeedEntry {
  return { ...r as unknown as FeedEntry, createdAt: new Date(r.createdAt as string) }
}
function reviveNote(r: Record<string, unknown>): StarterNote {
  return { ...r as unknown as StarterNote, createdAt: new Date(r.createdAt as string) }
}
function reviveReminder(r: Record<string, unknown>): FeedingReminder {
  return { ...r as unknown as FeedingReminder, feedAt: new Date(r.feedAt as string) }
}
function deserializeJourney(r: Record<string, unknown>): StarterJourney {
  return {
    ...r as unknown as StarterJourney,
    startDate: new Date(r.startDate as string),
    createdAt: new Date(r.createdAt as string),
  }
}

// ── DB row mappers ────────────────────────────────────────────
function rowToStarter(r: Record<string, unknown>): StarterProfile {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    age: r.age as StarterProfile['age'],
    flourType: r.flour_type as string[],
    waterType: r.water_type as string,
    targetHydration: r.target_hydration as number,
    createdAt: new Date(r.created_at as string),
    lastAnalyzedAt: r.last_analyzed_at ? new Date(r.last_analyzed_at as string) : undefined,
    fridgeStatus: r.fridge_status as StarterProfile['fridgeStatus'] ?? undefined,
    fridgeRemovedAt: r.fridge_removed_at ? new Date(r.fridge_removed_at as string) : undefined,
  }
}

function rowToAnalysis(r: Record<string, unknown>): Analysis {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    starterId: r.starter_id as string,
    starterName: r.starter_name as string,
    imageUrl: r.image_url as string,
    questionnaireData: r.questionnaire_data as Analysis['questionnaireData'],
    aiResult: r.ai_result as Analysis['aiResult'],
    createdAt: new Date(r.created_at as string),
  }
}

function rowToFeed(r: Record<string, unknown>): FeedEntry {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    starterId: r.starter_id as string,
    starterName: r.starter_name as string,
    ratio: r.ratio as string,
    riseMultiplier: r.rise_multiplier as string,
    peakTime: r.peak_time as string,
    roomTemp: r.room_temp as number,
    note: r.note as string,
    imageUrl: r.image_url as string | undefined,
    createdAt: new Date(r.created_at as string),
  }
}

function rowToNote(r: Record<string, unknown>): StarterNote {
  return {
    id: r.id as string,
    starterId: r.starter_id as string,
    text: r.text as string,
    createdAt: new Date(r.created_at as string),
  }
}

function rowToReminder(r: Record<string, unknown>): FeedingReminder {
  return {
    id: r.id as string,
    starterId: r.starter_id as string,
    starterName: r.starter_name as string,
    feedAt: new Date(r.feed_at as string),
    notified: r.notified as boolean,
  }
}

function rowToJourney(r: Record<string, unknown>): StarterJourney {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    flourType: r.flour_type as string[],
    waterType: r.water_type as string,
    targetHydration: r.target_hydration as number,
    startDate: new Date(r.start_date as string),
    currentDay: r.current_day as number,
    logs: r.logs as DailyLog[],
    status: r.status as StarterJourney['status'],
    graduatedStarterId: r.graduated_starter_id as string | undefined,
    createdAt: new Date(r.created_at as string),
  }
}

// ── merge helpers: Supabase wins on same ID ───────────────────
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  // Filter out any undefined/null entries (defensive against bad localStorage data)
  const safeLocal = local.filter(Boolean)
  const safeRemote = remote.filter(Boolean)
  const map = new Map(safeLocal.map(x => [x.id, x]))
  safeRemote.forEach(x => map.set(x.id, x))
  return Array.from(map.values())
}

// ── Provider ─────────────────────────────────────────────────

export function StarterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [dataLoaded, setDataLoaded] = useState(false)
  const [starters,  setStarters]  = useState<StarterProfile[]>([])
  const [analyses,  setAnalyses]  = useState<Analysis[]>([])
  const [feeds,     setFeeds]     = useState<FeedEntry[]>([])
  const [notes,     setNotes]     = useState<StarterNote[]>([])
  const [reminders, setReminders] = useState<FeedingReminder[]>([])
  const [journeys,  setJourneys]  = useState<StarterJourney[]>([])

  // ── Load: localStorage first (instant), then merge Supabase ──
  const loadAll = useCallback(async (userId: string) => {
    // 1. Load from localStorage immediately so UI isn't blank
    const localStarters  = LS.load(userId, 'starters',  reviveStarter)
    const localAnalyses  = LS.load(userId, 'analyses',  reviveAnalysis)
    const localFeeds     = LS.load(userId, 'feeds',     reviveFeed)
    const localNotes     = LS.load(userId, 'notes',     reviveNote)
    const localReminders = LS.load(userId, 'reminders', reviveReminder)
    const localJourneys  = LS.load(userId, 'journeys',  deserializeJourney)

    setStarters(localStarters)
    setAnalyses(localAnalyses)
    setFeeds(localFeeds)
    setNotes(localNotes)
    setReminders(localReminders)
    setJourneys(localJourneys)
    setDataLoaded(true) // show UI immediately from local data

    // 2. Try to fetch from Supabase and merge (background sync)
    try {
      const [s, a, f, n, r, j] = await Promise.all([
        supabase.from('starters').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('feed_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('starter_notes').select('*').order('created_at', { ascending: false }),
        supabase.from('feeding_reminders').select('*'),
        supabase.from('journeys').select('*').eq('user_id', userId).order('created_at'),
      ])

      if (s.data) {
        const merged = mergeById(localStarters, s.data.map(rowToStarter))
        setStarters(merged)
        LS.save(userId, 'starters', merged)
      }
      if (a.data) {
        const merged = mergeById(localAnalyses, a.data.map(rowToAnalysis))
        setAnalyses(merged)
        LS.save(userId, 'analyses', merged)
      }
      if (f.data) {
        const merged = mergeById(localFeeds, f.data.map(rowToFeed))
        setFeeds(merged)
        LS.save(userId, 'feeds', merged)
      }
      if (n.data) {
        const merged = mergeById(localNotes, n.data.map(rowToNote))
        setNotes(merged)
        LS.save(userId, 'notes', merged)
      }
      if (r.data) {
        const merged = mergeById(localReminders, r.data.map(rowToReminder))
        setReminders(merged)
        LS.save(userId, 'reminders', merged)
      }
      if (j.data) {
        const merged = mergeById(localJourneys, j.data.map(rowToJourney))
        setJourneys(merged)
        LS.save(userId, 'journeys', merged)
      }
    } catch (e) {
      console.warn('Supabase sync failed, running from local cache:', e)
    }
  }, [])

  useEffect(() => {
    if (user) {
      setDataLoaded(false)
      loadAll(user.id)
    } else {
      setStarters([]); setAnalyses([]); setFeeds([])
      setNotes([]); setReminders([]); setJourneys([])
      setDataLoaded(true)
    }
  }, [user, loadAll])

  // ── Auto-sync state → localStorage after every mutation ──────
  // Auto-sync every state slice → localStorage after any mutation.
  // Guard: only write when dataLoaded (so we never overwrite cache with empty pre-load state).
  useEffect(() => { if (user && dataLoaded) LS.save(user.id, 'starters',  starters)  }, [starters,  user, dataLoaded])
  useEffect(() => { if (user && dataLoaded) LS.save(user.id, 'journeys',  journeys)  }, [journeys,  user, dataLoaded])
  useEffect(() => { if (user && dataLoaded) LS.save(user.id, 'analyses',  analyses)  }, [analyses,  user, dataLoaded])
  useEffect(() => { if (user && dataLoaded) LS.save(user.id, 'feeds',     feeds)     }, [feeds,     user, dataLoaded])
  useEffect(() => { if (user && dataLoaded) LS.save(user.id, 'notes',     notes)     }, [notes,     user, dataLoaded])
  useEffect(() => { if (user && dataLoaded) LS.save(user.id, 'reminders', reminders) }, [reminders, user, dataLoaded])

  // ── Starters ──────────────────────────────────────────────

  const addStarter = (data: Omit<StarterProfile, 'id' | 'userId' | 'createdAt'>): StarterProfile => {
    const s: StarterProfile = { ...data, id: crypto.randomUUID(), userId: user!.id, createdAt: new Date() }
    const next = [...starters, s]
    setStarters(next)
    LS.save(user!.id, 'starters', next)
    supabase.from('starters').insert({
      id: s.id, user_id: s.userId, name: s.name, age: s.age,
      flour_type: s.flourType, water_type: s.waterType, target_hydration: s.targetHydration,
    }).then(({ error }) => { if (error) console.error('addStarter sync error:', error) })
    return s
  }

  const updateStarter = (id: string, updates: Partial<Omit<StarterProfile, 'id' | 'userId' | 'createdAt'>>) => {
    const nextStarters = starters.map(s => s.id === id ? { ...s, ...updates } : s)
    setStarters(nextStarters)
    LS.save(user!.id, 'starters', nextStarters)
    // Map camelCase → snake_case for Supabase
    const db: Record<string, unknown> = {}
    if ('name' in updates)             db.name               = updates.name
    if ('age' in updates)              db.age                = updates.age
    if ('flourType' in updates)        db.flour_type         = updates.flourType
    if ('waterType' in updates)        db.water_type         = updates.waterType
    if ('targetHydration' in updates)  db.target_hydration   = updates.targetHydration
    if ('fridgeStatus' in updates)     db.fridge_status      = updates.fridgeStatus
    if ('fridgeRemovedAt' in updates)  db.fridge_removed_at  = updates.fridgeRemovedAt?.toISOString() ?? null
    if (Object.keys(db).length > 0)
      supabase.from('starters').update(db).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateStarter sync error:', error) })
  }

  const deleteStarter = (starterId: string) => {
    const nextStarters  = starters.filter(s => s.id !== starterId)
    const nextAnalyses  = analyses.filter(a => a.starterId !== starterId)
    const nextFeeds     = feeds.filter(f => f.starterId !== starterId)
    const nextNotes     = notes.filter(n => n.starterId !== starterId)
    const nextReminders = reminders.filter(r => r.starterId !== starterId)
    setStarters(nextStarters)
    setAnalyses(nextAnalyses)
    setFeeds(nextFeeds)
    setNotes(nextNotes)
    setReminders(nextReminders)
    LS.save(user!.id, 'starters',  nextStarters)
    LS.save(user!.id, 'analyses',  nextAnalyses)
    LS.save(user!.id, 'feeds',     nextFeeds)
    LS.save(user!.id, 'notes',     nextNotes)
    LS.save(user!.id, 'reminders', nextReminders)
    supabase.from('starters').delete().eq('id', starterId)
      .then(({ error }) => { if (error) console.error('deleteStarter sync error:', error) })
  }

  // ── Analyses ──────────────────────────────────────────────

  const saveAnalysis = (data: Omit<Analysis, 'id' | 'createdAt'>): Analysis => {
    const a: Analysis = { ...data, id: crypto.randomUUID(), createdAt: new Date() }
    const nextAnalyses = [a, ...analyses]
    const nextStarters = starters.map(s => s.id === data.starterId ? { ...s, lastAnalyzedAt: new Date() } : s)
    setAnalyses(nextAnalyses)
    setStarters(nextStarters)
    LS.save(user!.id, 'analyses', nextAnalyses)
    LS.save(user!.id, 'starters', nextStarters)
    supabase.from('analyses').insert({
      id: a.id, user_id: a.userId, starter_id: a.starterId, starter_name: a.starterName,
      image_url: a.imageUrl, questionnaire_data: a.questionnaireData, ai_result: a.aiResult,
    }).then(({ error }) => { if (error) console.error('saveAnalysis sync error:', error) })
    supabase.from('starters').update({ last_analyzed_at: new Date().toISOString() })
      .eq('id', data.starterId)
      .then(({ error }) => { if (error) console.error('updateLastAnalyzed sync error:', error) })
    return a
  }

  // ── Feeds ─────────────────────────────────────────────────

  const addFeed = (data: Omit<FeedEntry, 'id' | 'createdAt'>): FeedEntry => {
    const f: FeedEntry = { ...data, id: crypto.randomUUID(), createdAt: new Date() }
    const nextFeeds = [f, ...feeds]
    setFeeds(nextFeeds)
    LS.save(user!.id, 'feeds', nextFeeds)
    supabase.from('feed_entries').insert({
      id: f.id, user_id: f.userId, starter_id: f.starterId, starter_name: f.starterName,
      ratio: f.ratio, rise_multiplier: f.riseMultiplier, peak_time: f.peakTime,
      room_temp: f.roomTemp, note: f.note, image_url: f.imageUrl ?? null,
    }).then(({ error }) => { if (error) console.error('addFeed sync error:', error) })
    return f
  }

  // ── Notes ─────────────────────────────────────────────────

  const addNote = (starterId: string, text: string) => {
    const n: StarterNote = { id: crypto.randomUUID(), starterId, text, createdAt: new Date() }
    const nextNotes = [n, ...notes]
    setNotes(nextNotes)
    LS.save(user!.id, 'notes', nextNotes)
    supabase.from('starter_notes').insert({ id: n.id, starter_id: starterId, text })
      .then(({ error }) => { if (error) console.error('addNote sync error:', error) })
  }

  const deleteNote = (noteId: string) => {
    const nextNotes = notes.filter(n => n.id !== noteId)
    setNotes(nextNotes)
    LS.save(user!.id, 'notes', nextNotes)
    supabase.from('starter_notes').delete().eq('id', noteId)
      .then(({ error }) => { if (error) console.error('deleteNote sync error:', error) })
  }

  const getNotesForStarter = (starterId: string) =>
    notes.filter(n => n.starterId === starterId)
         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // ── Reminders ─────────────────────────────────────────────

  const addReminder = (starterId: string, starterName: string, feedAt: Date) => {
    const r: FeedingReminder = { id: crypto.randomUUID(), starterId, starterName, feedAt, notified: false }
    const nextReminders = [...reminders, r]
    setReminders(nextReminders)
    LS.save(user!.id, 'reminders', nextReminders)
    supabase.from('feeding_reminders').insert({
      id: r.id, starter_id: starterId, starter_name: starterName, feed_at: feedAt.toISOString(),
    }).then(({ error }) => { if (error) console.error('addReminder sync error:', error) })
  }

  const dismissReminder = (reminderId: string) => {
    const nextReminders = reminders.filter(r => r.id !== reminderId)
    setReminders(nextReminders)
    LS.save(user!.id, 'reminders', nextReminders)
    supabase.from('feeding_reminders').delete().eq('id', reminderId)
      .then(({ error }) => { if (error) console.error('dismissReminder sync error:', error) })
  }

  const getRemindersForStarter = (starterId: string) =>
    reminders.filter(r => r.starterId === starterId && !r.notified)

  // ── Journeys ──────────────────────────────────────────────

  const addJourney = (data: Omit<StarterJourney, 'id' | 'userId' | 'createdAt' | 'currentDay' | 'logs' | 'status'>): StarterJourney => {
    const j: StarterJourney = {
      ...data, id: crypto.randomUUID(), userId: user!.id,
      currentDay: 1, logs: [], status: 'active', createdAt: new Date(),
    }
    const nextJourneys = [...journeys, j]
    setJourneys(nextJourneys)
    LS.save(user!.id, 'journeys', nextJourneys)
    supabase.from('journeys').insert({
      id: j.id, user_id: j.userId, name: j.name, flour_type: j.flourType,
      water_type: j.waterType, target_hydration: j.targetHydration,
      start_date: j.startDate.toISOString(),
    }).then(({ error }) => { if (error) console.error('addJourney sync error:', error) })
    return j
  }

  const updateJourneyLog = (journeyId: string, log: DailyLog) => {
    const nextJourneys = journeys.map(j => {
      if (j.id !== journeyId) return j
      const existing = j.logs.findIndex(l => l.day === log.day)
      const newLogs = existing >= 0
        ? j.logs.map((l, i) => i === existing ? log : l)
        : [...j.logs, log]
      const maxDay = Math.max(...newLogs.map(l => l.day), j.currentDay)
      return { ...j, logs: newLogs, currentDay: Math.min(maxDay + 1, 14) }
    })
    setJourneys(nextJourneys)
    LS.save(user!.id, 'journeys', nextJourneys)
    const updated = nextJourneys.find(j => j.id === journeyId)
    if (updated) {
      supabase.from('journeys').update({ logs: updated.logs, current_day: updated.currentDay })
        .eq('id', journeyId)
        .then(({ error }) => { if (error) console.error('updateJourneyLog sync error:', error) })
    }
  }

  const graduateJourney = (journeyId: string, starterId: string) => {
    const nextJourneys = journeys.map(j =>
      j.id === journeyId ? { ...j, status: 'graduated' as const, graduatedStarterId: starterId } : j
    )
    setJourneys(nextJourneys)
    LS.save(user!.id, 'journeys', nextJourneys)
    supabase.from('journeys').update({ status: 'graduated', graduated_starter_id: starterId })
      .eq('id', journeyId)
      .then(({ error }) => { if (error) console.error('graduateJourney sync error:', error) })
  }

  const abandonJourney = (journeyId: string) => {
    const nextJourneys = journeys.map(j =>
      j.id === journeyId ? { ...j, status: 'abandoned' as const } : j
    )
    setJourneys(nextJourneys)
    LS.save(user!.id, 'journeys', nextJourneys)
    supabase.from('journeys').update({ status: 'abandoned' }).eq('id', journeyId)
      .then(({ error }) => { if (error) console.error('abandonJourney sync error:', error) })
  }

  const reviveJourney = (journeyId: string) => {
    const nextJourneys = journeys.map(j =>
      j.id === journeyId ? { ...j, status: 'active' as const } : j
    )
    setJourneys(nextJourneys)
    LS.save(user!.id, 'journeys', nextJourneys)
    supabase.from('journeys').update({ status: 'active' }).eq('id', journeyId)
      .then(({ error }) => { if (error) console.error('reviveJourney sync error:', error) })
  }

  // ── Selectors ─────────────────────────────────────────────

  const getAnalysesForStarter = (starterId: string) =>
    analyses.filter(a => a.starterId === starterId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getFeedsForStarter = (starterId: string) =>
    feeds.filter(f => f.starterId === starterId)
         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <StarterContext.Provider value={{
      dataLoaded, starters, analyses, feeds, notes, reminders, journeys,
      addStarter, updateStarter, deleteStarter, saveAnalysis, addFeed,
      getAnalysesForStarter, getFeedsForStarter,
      addNote, deleteNote, getNotesForStarter,
      addReminder, dismissReminder, getRemindersForStarter,
      addJourney, updateJourneyLog, graduateJourney, abandonJourney, reviveJourney,
    }}>
      {children}
    </StarterContext.Provider>
  )
}

export function useStarters() {
  const ctx = useContext(StarterContext)
  if (!ctx) throw new Error('useStarters must be used inside StarterProvider')
  return ctx
}
