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

    const preferences = prefsRes.data ? {
      userName: prefsRes.data.user_name || '',
      motto: prefsRes.data.motto || '',
      theme: prefsRes.data.theme || 'dark',
      learnedWords: Array.isArray(prefsRes.data.learned_word_ids) ? prefsRes.data.learned_word_ids : [],
      favoriteWords: Array.isArray(prefsRes.data.favorite_word_ids) ? prefsRes.data.favorite_word_ids : [],
      aiSettings: prefsRes.data.ai_settings || {}
    } : null;

    return { notes, customWords, preferences };
  } catch (err) {
    console.error('Error fetching cloud data from Supabase:', err);
    throw err;
  }
}

export async function uploadLocalData(supabase, userId, { notes = [], customWords = [], settings = {}, learnedWords = [], favoriteWords = [], aiSettings = {} }) {
  if (!supabase || !userId) return;

  try {
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

      await supabase.from('notes').upsert(dbNotes, { onConflict: 'id' });
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

      await supabase.from('custom_words').upsert(dbWords, { onConflict: 'id' });
    }

    // 3. Upsert Preferences
    await supabase.from('user_preferences').upsert({
      user_id: userId,
      user_name: settings.userName || '',
      motto: settings.motto || '',
      theme: settings.theme || 'dark',
      learned_word_ids: learnedWords || [],
      favorite_word_ids: favoriteWords || [],
      ai_settings: aiSettings || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

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
