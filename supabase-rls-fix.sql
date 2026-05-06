-- Fix missing RLS policies for journeys table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hdtdtkkiuxllzvsggpdg/sql/new

-- ── Journeys table ────────────────────────────────────────────────
-- Enable RLS if not already enabled
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own journeys" ON journeys;
DROP POLICY IF EXISTS "Users can insert own journeys" ON journeys;
DROP POLICY IF EXISTS "Users can update own journeys" ON journeys;
DROP POLICY IF EXISTS "Users can delete own journeys" ON journeys;

-- Recreate all four policies
CREATE POLICY "Users can view own journeys"
  ON journeys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journeys"
  ON journeys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journeys"
  ON journeys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journeys"
  ON journeys FOR DELETE
  USING (auth.uid() = user_id);

-- ── Starters table (same pattern, in case any are missing) ────────
ALTER TABLE starters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own starters" ON starters;
DROP POLICY IF EXISTS "Users can insert own starters" ON starters;
DROP POLICY IF EXISTS "Users can update own starters" ON starters;
DROP POLICY IF EXISTS "Users can delete own starters" ON starters;

CREATE POLICY "Users can view own starters"
  ON starters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own starters"
  ON starters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own starters"
  ON starters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own starters"
  ON starters FOR DELETE
  USING (auth.uid() = user_id);

-- ── Analyses table ────────────────────────────────────────────────
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;

CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Feed entries table ────────────────────────────────────────────
ALTER TABLE feed_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feed entries" ON feed_entries;
DROP POLICY IF EXISTS "Users can insert own feed entries" ON feed_entries;
DROP POLICY IF EXISTS "Users can delete own feed entries" ON feed_entries;

CREATE POLICY "Users can view own feed entries"
  ON feed_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feed entries"
  ON feed_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feed entries"
  ON feed_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ── Starter notes ─────────────────────────────────────────────────
ALTER TABLE starter_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notes" ON starter_notes;

CREATE POLICY "Users can manage own notes"
  ON starter_notes FOR ALL
  USING (
    starter_id IN (
      SELECT id FROM starters WHERE user_id = auth.uid()
    )
  );

-- ── Feeding reminders ─────────────────────────────────────────────
ALTER TABLE feeding_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own reminders" ON feeding_reminders;

CREATE POLICY "Users can manage own reminders"
  ON feeding_reminders FOR ALL
  USING (
    starter_id IN (
      SELECT id FROM starters WHERE user_id = auth.uid()
    )
  );
