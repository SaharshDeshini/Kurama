-- =========================================================
-- KURAMA PERSONAL OS - COMPLETE SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- Supports full cross-device sync between Mobile and Laptop:
--   - Notes (instant real-time concurrency)
--   - Challenges, streaks, and requirement checks
--   - Counters, increments, and daily counts
--   - Daily journal entries
--   - Productivity heatmaps & completion timestamps
--   - English Daily vocabulary & SRS reviews
-- =========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Notes Table ("Write there and put it there" with real-time concurrency)
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT '',
  text TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  tag TEXT DEFAULT 'Note',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Custom & AI Words Table (English Daily)
CREATE TABLE IF NOT EXISTS public.custom_words (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT DEFAULT '',
  part_of_speech TEXT DEFAULT 'noun',
  definition TEXT NOT NULL,
  example TEXT DEFAULT '',
  synonyms JSONB DEFAULT '[]'::jsonb,
  antonyms JSONB DEFAULT '[]'::jsonb,
  memory_tip TEXT DEFAULT '',
  etymology TEXT DEFAULT '',
  is_learned BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. User Preferences & Complete Cross-Device Operating System State
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_name TEXT DEFAULT '',
  motto TEXT DEFAULT '',
  theme TEXT DEFAULT 'dark',
  learned_word_ids JSONB DEFAULT '[]'::jsonb,
  favorite_word_ids JSONB DEFAULT '[]'::jsonb,
  ai_settings JSONB DEFAULT '{"provider": "gemini", "level": "advanced"}'::jsonb,
  challenges JSONB DEFAULT '[]'::jsonb,
  challenge_entries JSONB DEFAULT '{}'::jsonb,
  counters JSONB DEFAULT '[]'::jsonb,
  counter_entries JSONB DEFAULT '{}'::jsonb,
  journal JSONB DEFAULT '{}'::jsonb,
  challenge_completion_times JSONB DEFAULT '{}'::jsonb,
  counter_completion_times JSONB DEFAULT '{}'::jsonb,
  challenge_day_notes JSONB DEFAULT '{}'::jsonb,
  srs_reviews JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safe migrations: Add columns to user_preferences if table was created previously
ALTER TABLE public.user_preferences 
  ADD COLUMN IF NOT EXISTS challenges JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS challenge_entries JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS counters JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS counter_entries JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journal JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS challenge_completion_times JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS counter_completion_times JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS challenge_day_notes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS srs_reviews JSONB DEFAULT '{}'::jsonb;

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user only reads & writes their own data
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for public.notes
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for public.custom_words
DROP POLICY IF EXISTS "Users can view their own words" ON public.custom_words;
CREATE POLICY "Users can view their own words"
  ON public.custom_words FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own words" ON public.custom_words;
CREATE POLICY "Users can insert their own words"
  ON public.custom_words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own words" ON public.custom_words;
CREATE POLICY "Users can update their own words"
  ON public.custom_words FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own words" ON public.custom_words;
CREATE POLICY "Users can delete their own words"
  ON public.custom_words FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for public.user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- =========================================================
-- 5. REALTIME LIVE SYNC & REPLICA IDENTITY
-- Broadcasts changes across devices instantly (including DELETES)
-- =========================================================

-- Replica Identity FULL ensures Postgres broadcasts full previous records on UPDATE and DELETE
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.custom_words REPLICA IDENTITY FULL;
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_words'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_words;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;
  END IF;
END $$;
