/**
 * Supabase Bidirectional Sync Service
 * Seamlessly merges Local Storage with Supabase Cloud
 */

export async function fetchCloudData(supabase, userId) {
  if (!supabase || !userId) return null;

  try {
    const [notesRes, wordsRes, prefsRes] = await Promise.all([
      supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('custom_words').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
    ]);

    const notes = (notesRes.data || []).map(n => ({
      id: n.id,
      title: n.title || '',
      text: n.text || '',
      color: n.color || 'blue',
      tag: n.tag || 'Note',
      isPinned: Boolean(n.is_pinned),
      isDone: Boolean(n.is_done),
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    const customWords = (wordsRes.data || []).map(w => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic || '',
      partOfSpeech: w.part_of_speech || 'noun',
      definition: w.definition || '',
      example: w.example || '',
      synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
      antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
      memoryTip: w.memory_tip || '',
      etymology: w.etymology || '',
      isLearned: Boolean(w.is_learned),
      isFavorite: Boolean(w.is_favorite),
      isAiGenerated: Boolean(w.is_ai_generated),
      createdAt: w.created_at
    }));

    const p = prefsRes.data;
    const preferences = p ? {
      userName: p.user_name || '',
      motto: p.motto || '',
      theme: p.theme || 'dark',
      learnedWords: Array.isArray(p.learned_word_ids) ? p.learned_word_ids : [],
      favoriteWords: Array.isArray(p.favorite_word_ids) ? p.favorite_word_ids : [],
      aiSettings: p.ai_settings || {}
    } : null;

    // Cross-device sync fields for challenges, counters, journal, etc.
    const challenges = p && Array.isArray(p.challenges) ? p.challenges : null;
    const challengeEntries = p && p.challenge_entries && typeof p.challenge_entries === 'object' ? p.challenge_entries : null;
    const counters = p && Array.isArray(p.counters) ? p.counters : null;
    const counterEntries = p && p.counter_entries && typeof p.counter_entries === 'object' ? p.counter_entries : null;
    const journal = p && p.journal && typeof p.journal === 'object' ? p.journal : null;
    const challengeCompletionTimes = p && p.challenge_completion_times ? p.challenge_completion_times : null;
    const counterCompletionTimes = p && p.counter_completion_times ? p.counter_completion_times : null;
    const challengeDayNotes = p && p.challenge_day_notes ? p.challenge_day_notes : null;
    const srsReviews = p && p.srs_reviews ? p.srs_reviews : null;

    return {
      notes,
      customWords,
      preferences,
      challenges,
      challengeEntries,
      counters,
      counterEntries,
      journal,
      challengeCompletionTimes,
      counterCompletionTimes,
      challengeDayNotes,
      srsReviews,
      updatedAt: p?.updated_at || null
    };
  } catch (err) {
    console.error('Error fetching cloud data from Supabase:', err);
    throw err;
  }
}

export async function uploadLocalData(supabase, userId, {
  notes = [],
  deletedNoteIds = [],
  customWords = [],
  settings = {},
  learnedWords = [],
  favoriteWords = [],
  aiSettings = {},
  challenges = [],
  challengeEntries = {},
  counters = [],
  counterEntries = {},
  journal = {},
  challengeCompletionTimes = {},
  counterCompletionTimes = {},
  challengeDayNotes = {},
  srsReviews = {}
}) {
  if (!supabase || !userId) return;

  try {
    // 0. Purge any deleted notes from cloud
    if (deletedNoteIds && deletedNoteIds.length > 0) {
      const { error: purgeErr } = await supabase.from('notes').delete().in('id', deletedNoteIds).eq('user_id', userId);
      if (purgeErr) console.warn('[Supabase Sync] Purge deleted notes error:', purgeErr);
    }

    // 1. Upsert Notes
    if (notes.length > 0) {
      const dbNotes = notes.map(n => ({
        id: n.id,
        user_id: userId,
        title: n.title || '',
        text: n.text || '',
        color: n.color || 'blue',
        tag: n.tag || 'Note',
        is_pinned: Boolean(n.isPinned),
        is_done: Boolean(n.isDone),
        created_at: n.createdAt || new Date().toISOString(),
        updated_at: n.updatedAt || new Date().toISOString()
      }));

      const { error: notesErr } = await supabase.from('notes').upsert(dbNotes, { onConflict: 'id' });
      if (notesErr) console.warn('[Supabase Sync] Upsert notes error:', notesErr);
    }

    // 2. Upsert Custom Words
    if (customWords.length > 0) {
      const dbWords = customWords.map(w => ({
        id: w.id,
        user_id: userId,
        word: w.word,
        phonetic: w.phonetic || '',
        part_of_speech: w.partOfSpeech || 'noun',
        definition: w.definition || '',
        example: w.example || '',
        synonyms: w.synonyms || [],
        antonyms: w.antonyms || [],
        memory_tip: w.memoryTip || '',
        etymology: w.etymology || '',
        is_learned: Boolean(w.isLearned),
        is_favorite: Boolean(w.isFavorite),
        is_ai_generated: Boolean(w.isAiGenerated),
        created_at: w.createdAt || new Date().toISOString()
      }));

      const { error: wordsErr } = await supabase.from('custom_words').upsert(dbWords, { onConflict: 'id' });
      if (wordsErr) console.warn('[Supabase Sync] Upsert words error:', wordsErr);
    }

    // 3. Upsert Preferences & Full Cross-Device OS State
    const fullPrefPayload = {
      user_id: userId,
      user_name: settings.userName || '',
      motto: settings.motto || '',
      theme: settings.theme || 'dark',
      learned_word_ids: learnedWords || [],
      favorite_word_ids: favoriteWords || [],
      ai_settings: aiSettings || {},
      challenges: challenges || [],
      challenge_entries: challengeEntries || {},
      counters: counters || [],
      counter_entries: counterEntries || {},
      journal: journal || {},
      challenge_completion_times: challengeCompletionTimes || {},
      counter_completion_times: counterCompletionTimes || {},
      challenge_day_notes: challengeDayNotes || {},
      srs_reviews: srsReviews || {},
      updated_at: new Date().toISOString()
    };

    const { error: prefErr } = await supabase.from('user_preferences').upsert(fullPrefPayload, { onConflict: 'user_id' });
    if (prefErr) {
      // If schema migration hasn't been applied yet, fall back gracefully to basic columns
      console.warn(
        '[Supabase Sync] Note: Extended state columns (challenges/counters/journal) not found in user_preferences. Falling back to basic preferences. Run supabase_schema.sql in Supabase to sync challenges & counters across devices.',
        prefErr.message
      );
      const basicPrefPayload = {
        user_id: userId,
        user_name: settings.userName || '',
        motto: settings.motto || '',
        theme: settings.theme || 'dark',
        learned_word_ids: learnedWords || [],
        favorite_word_ids: favoriteWords || [],
        ai_settings: aiSettings || {},
        updated_at: new Date().toISOString()
      };
      await supabase.from('user_preferences').upsert(basicPrefPayload, { onConflict: 'user_id' });
    }

    return true;
  } catch (err) {
    console.error('Error uploading data to Supabase:', err);
    throw err;
  }
}

/**
 * Merges local and cloud collections by unique ID, keeping latest version
 */
export function mergeCollections(localArr = [], cloudArr = []) {
  const map = new Map();

  // Load cloud first
  for (const item of cloudArr) {
    if (item && item.id) map.set(item.id, item);
  }

  // Merge local (local overrides if newer or newly added)
  for (const item of localArr) {
    if (!item || !item.id) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    } else {
      const existing = map.get(item.id);
      const localTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      const cloudTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      if (localTime >= cloudTime) {
        map.set(item.id, { ...existing, ...item });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Recursively merges two nested entry maps (e.g., challengeEntries, counterEntries).
 * Preserves all dates and requirement entries from both, with incoming taking precedence on conflicts.
 */
export function deepMergeEntries(base = {}, incoming = {}) {
  if (!base || typeof base !== 'object') return incoming || {};
  if (!incoming || typeof incoming !== 'object') return base || {};

  const result = { ...base };
  for (const [key, val] of Object.entries(incoming)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = deepMergeEntries(base[key] || {}, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

