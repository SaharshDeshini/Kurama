import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or localStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), source: 'env' };
  }

  try {
    const stored = localStorage.getItem('personalOS_supabaseConfig');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim(), source: 'storage' };
      }
    }
  } catch (e) {
    // ignore parse error
  }

  return { url: '', anonKey: '', source: 'none' };
}

let supabaseInstance = null;
let lastUrl = null;
let lastKey = null;

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (supabaseInstance && lastUrl === url && lastKey === anonKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    lastUrl = url;
    lastKey = anonKey;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveSupabaseCredentials(url, anonKey) {
  if (!url || !anonKey) {
    localStorage.removeItem('personalOS_supabaseConfig');
    supabaseInstance = null;
    lastUrl = null;
    lastKey = null;
    return;
  }
  localStorage.setItem('personalOS_supabaseConfig', JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  supabaseInstance = null; // force re-creation
  lastUrl = null;
  lastKey = null;
}
