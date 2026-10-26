import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTheme } from '../hooks/useTheme';
import { getTodayDateString } from '../utils/dates';
import { getExampleData } from '../data/exampleData';
import { getSupabaseClient } from '../lib/supabase';
import { fetchCloudData, uploadLocalData, mergeCollections } from '../utils/supabaseSync';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Core localStorage states
  const [challenges, setChallenges] = useLocalStorage('personalOS_challenges', []);
  const [challengeEntries, setChallengeEntries] = useLocalStorage('personalOS_challengeEntries', {});
  const [counters, setCounters] = useLocalStorage('personalOS_counters', []);
  const [counterEntries, setCounterEntries] = useLocalStorage('personalOS_counterEntries', {});
  const [journal, setJournal] = useLocalStorage('personalOS_journal', {});
  const [settings, setSettings] = useLocalStorage('personalOS_settings', {
    theme: 'dark',
    userName: '',
    motto: '',
    primaryChallengeId: null,
    lastBackupAt: null
  });
  const [hasOnboarded, setHasOnboarded] = useLocalStorage('personalOS_hasOnboarded', false);

  // Timestamp maps for the time-of-day productivity heatmap (dateStr -> reqId -> ISO string)
  const [challengeCompletionTimes, setChallengeCompletionTimes] = useLocalStorage('personalOS_challengeCompletionTimes', {});
  // dateStr -> ISO string[] (one entry per increment)
  const [counterCompletionTimes, setCounterCompletionTimes] = useLocalStorage('personalOS_counterCompletionTimes', {});
  // Optional "what got in the way" notes for failed challenge days (dateStr -> string)
  const [challengeDayNotes, setChallengeDayNotes] = useLocalStorage('personalOS_challengeDayNotes', {});

  // Deleted note IDs tombstone set to prevent resurrecting deleted notes across sync
  const [deletedNoteIds, setDeletedNoteIds] = useLocalStorage('personalOS_deletedNoteIds', []);

  // Note Taker state ("write there and put it there")
  const [notes, setNotes] = useLocalStorage('personalOS_notes', () => {
    try {
      if (localStorage.getItem('personalOS_welcome_note_dismissed') === 'true') {
        return [];
      }
      const rawDeleted = localStorage.getItem('personalOS_deletedNoteIds');
      if (rawDeleted && JSON.parse(rawDeleted).includes('note_init_1')) {
        return [];
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'note_init_1',
        title: 'Welcome to Quick Notes 📌',
        text: 'Type a thought, task, or reminder above and put it right here. Pin it, color-code it, or mark it done!',
        color: 'blue',
        tag: 'Note',
        isPinned: true,
        isDone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  });

  // English Daily learned, favorite, and AI custom vocabulary tracking
  const [learnedWords, setLearnedWords] = useLocalStorage('personalOS_learnedWords', []);
  const [favoriteWords, setFavoriteWords] = useLocalStorage('personalOS_favoriteWords', []);
  const [customWords, setCustomWords] = useLocalStorage('personalOS_customWords', []);
  const [srsReviews, setSrsReviews] = useLocalStorage('personalOS_srsReviews', {});
  const [aiSettings, setAiSettings] = useLocalStorage('personalOS_aiSettings', {
    provider: 'gemini',
    apiKey: '',
    level: 'advanced'
  });

  // Supabase Auth and Cloud Sync states
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Apply active theme
  useTheme(settings?.theme || 'dark');

  // Supabase Cloud Sync function - syncs all user data across devices
  const syncWithCloud = useCallback(async (userOverride = null) => {
    const client = getSupabaseClient();
    const activeUser = userOverride || currentUser;
    if (!client || !activeUser) return;

    setIsSyncing(true);
    try {
      const cloudData = await fetchCloudData(client, activeUser.id);
      if (cloudData) {
        // 1. Merge Notes: filter out any deleted notes (especially note_init_1 if deleted)
        const isWelcomeDismissed = localStorage.getItem('personalOS_welcome_note_dismissed') === 'true';
        const deletedSet = new Set(deletedNoteIds);

        const cleanCloudNotes = (cloudData.notes || []).filter(n => {
          if (n.id === 'note_init_1' && isWelcomeDismissed) return false;
          return !deletedSet.has(n.id);
        });

        // If cloud still holds deleted notes or dismissed welcome note, purge them from Supabase
        const staleInCloud = (cloudData.notes || []).filter(n => 
          deletedSet.has(n.id) || (n.id === 'note_init_1' && isWelcomeDismissed)
        );
        if (staleInCloud.length > 0) {
          client.from('notes').delete().in('id', staleInCloud.map(n => n.id)).then(() => {});
        }

        const isOnlyDefaultLocal = notes.length === 1 && notes[0].id === 'note_init_1';
        let unifiedNotes = [];
        if (isWelcomeDismissed && isOnlyDefaultLocal) {
          unifiedNotes = cleanCloudNotes;
        } else if (cleanCloudNotes.length > 0) {
          unifiedNotes = isOnlyDefaultLocal
            ? cleanCloudNotes
            : mergeCollections(notes.filter(n => !deletedSet.has(n.id) && !(n.id === 'note_init_1' && isWelcomeDismissed)), cleanCloudNotes);
        } else {
          unifiedNotes = notes.filter(n => !deletedSet.has(n.id) && !(n.id === 'note_init_1' && isWelcomeDismissed));
        }
        setNotes(unifiedNotes);

        // 2. Merge Custom Vocabulary
        let unifiedWords = customWords;
        if (cloudData.customWords) {
          unifiedWords = mergeCollections(customWords, cloudData.customWords);
          setCustomWords(unifiedWords);
        }

        // 3. Sync Challenges
        if (cloudData.challenges && Array.isArray(cloudData.challenges) && cloudData.challenges.length > 0) {
          setChallenges(cloudData.challenges);
        }
        if (cloudData.challengeEntries && Object.keys(cloudData.challengeEntries).length > 0) {
          setChallengeEntries(prev => ({ ...cloudData.challengeEntries, ...prev }));
        }
        if (cloudData.challengeCompletionTimes) {
          setChallengeCompletionTimes(prev => ({ ...cloudData.challengeCompletionTimes, ...prev }));
        }
        if (cloudData.challengeDayNotes) {
          setChallengeDayNotes(prev => ({ ...cloudData.challengeDayNotes, ...prev }));
        }

        // 4. Sync Counters
        if (cloudData.counters && Array.isArray(cloudData.counters) && cloudData.counters.length > 0) {
          setCounters(cloudData.counters);
        }
        if (cloudData.counterEntries && Object.keys(cloudData.counterEntries).length > 0) {
          setCounterEntries(prev => ({ ...cloudData.counterEntries, ...prev }));
        }
        if (cloudData.counterCompletionTimes) {
          setCounterCompletionTimes(prev => ({ ...cloudData.counterCompletionTimes, ...prev }));
        }

        // 5. Sync Journal
        if (cloudData.journal && Object.keys(cloudData.journal).length > 0) {
          setJournal(prev => ({ ...cloudData.journal, ...prev }));
        }

        // 6. Sync SRS Reviews
        if (cloudData.srsReviews && Object.keys(cloudData.srsReviews).length > 0) {
          setSrsReviews(prev => ({ ...cloudData.srsReviews, ...prev }));
        }

        // 7. Sync Preferences
        if (cloudData.preferences) {
          if (cloudData.preferences.userName || cloudData.preferences.theme) {
            setSettings(prev => ({
              ...prev,
              userName: cloudData.preferences.userName || prev.userName,
              motto: cloudData.preferences.motto || prev.motto,
              theme: cloudData.preferences.theme || prev.theme
            }));
          }
          if (cloudData.preferences.learnedWords) {
            setLearnedWords(prev => [...new Set([...prev, ...cloudData.preferences.learnedWords])]);
          }
          if (cloudData.preferences.favoriteWords) {
            setFavoriteWords(prev => [...new Set([...prev, ...cloudData.preferences.favoriteWords])]);
          }
          if (cloudData.preferences.aiSettings) {
            setAiSettings(prev => ({ ...prev, ...cloudData.preferences.aiSettings }));
          }
        }

        // 8. Upload unified state to cloud
        await uploadLocalData(client, activeUser.id, {
          notes: unifiedNotes,
          deletedNoteIds,
          customWords: unifiedWords,
          settings,
          learnedWords,
          favoriteWords,
          aiSettings,
          challenges: cloudData.challenges || challenges,
          challengeEntries: { ...(cloudData.challengeEntries || {}), ...challengeEntries },
          counters: cloudData.counters || counters,
          counterEntries: { ...(cloudData.counterEntries || {}), ...counterEntries },
          journal: { ...(cloudData.journal || {}), ...journal },
          challengeCompletionTimes: { ...(cloudData.challengeCompletionTimes || {}), ...challengeCompletionTimes },
          counterCompletionTimes: { ...(cloudData.counterCompletionTimes || {}), ...counterCompletionTimes },
          challengeDayNotes: { ...(cloudData.challengeDayNotes || {}), ...challengeDayNotes },
          srsReviews: { ...(cloudData.srsReviews || {}), ...srsReviews }
        });
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      console.error('Supabase auto-sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [
    currentUser, notes, deletedNoteIds, customWords, settings, learnedWords, favoriteWords, aiSettings,
    challenges, challengeEntries, counters, counterEntries, journal,
    challengeCompletionTimes, counterCompletionTimes, challengeDayNotes, srsReviews,
    setNotes, setCustomWords, setChallenges, setChallengeEntries, setCounters,
    setCounterEntries, setJournal, setChallengeCompletionTimes, setCounterCompletionTimes,
    setChallengeDayNotes, setSrsReviews, setSettings, setLearnedWords, setFavoriteWords, setAiSettings
  ]);

  // Listen to Supabase Auth state changes & restore session instantly
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    // 1. Instantly read existing persisted session from localStorage
    client.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        syncWithCloud(user);
      }
    }).catch(() => {});

    // 2. React to any signin, token refresh, or signout
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setCurrentUser(u);
      if (u) {
        syncWithCloud(u);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Handle mobile tab resume & screen unlock: automatically re-sync when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        syncWithCloud(currentUser);
      }
    };
    const handleFocus = () => {
      if (currentUser) {
        syncWithCloud(currentUser);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser, syncWithCloud]);

  // Auto-sync debounced state updates to cloud whenever challenges, counters, journal change
  const syncTimeoutRef = useRef(null);
  useEffect(() => {
    if (!currentUser) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(() => {
      const client = getSupabaseClient();
      if (client && currentUser) {
        uploadLocalData(client, currentUser.id, {
          notes,
          deletedNoteIds,
          customWords,
          settings,
          learnedWords,
          favoriteWords,
          aiSettings,
          challenges,
          challengeEntries,
          counters,
          counterEntries,
          journal,
          challengeCompletionTimes,
          counterCompletionTimes,
          challengeDayNotes,
          srsReviews
        }).catch(err => console.warn('[Auto-sync debounced]', err));
      }
    }, 2500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [
    challenges, challengeEntries, counters, counterEntries, journal,
    challengeCompletionTimes, counterCompletionTimes, challengeDayNotes, srsReviews,
    currentUser
  ]);

  // Ensure default challenge structure exists only on completely fresh initial installs
  useEffect(() => {
    try {
      const resetKey = 'kurama_restore_clean_challenge_v6';
      if (!localStorage.getItem(resetKey)) {
        // Only initialize default template if user has NO challenges at all
        let existing = [];
        try {
          const raw = localStorage.getItem('personalOS_challenges');
          if (raw) existing = JSON.parse(raw);
        } catch {
          existing = [];
        }

        if (!Array.isArray(existing) || existing.length === 0) {
          const today = getTodayDateString();
          const defaultChallenge = {
            id: 'chlg_discipline_1',
            name: '120 Day Discipline',
            durationType: 'fixed',
            duration: 120,
            startDate: today,
            dailyRequirements: [
              { id: 'creq_water', title: 'Drink 8 glasses of water', type: 'counter', target: 8, unit: 'glasses' },
              { id: 'creq_questions', title: 'Solve 5 DSA questions', type: 'counter', target: 5, unit: 'questions' },
              { id: 'creq_code', title: 'Code for 2 hours', type: 'checkbox', target: 2, unit: 'hours' },
              { id: 'creq_read', title: 'Read 20 pages', type: 'checkbox', target: 20, unit: 'pages' }
            ],
            status: 'active',
            createdAt: new Date().toISOString()
          };
          setChallenges([defaultChallenge]);
          localStorage.setItem('personalOS_challenges', JSON.stringify([defaultChallenge]));
          setSettings(prev => ({ ...prev, primaryChallengeId: defaultChallenge.id }));
        }

        localStorage.setItem(resetKey, 'true');
      }
    } catch (e) {
      console.warn('Could not initialize challenge data:', e);
    }
  }, [setChallenges, setSettings]);

  // Supabase Realtime Live Sync: listen for remote inserts/updates/deletes on notes & custom_words
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentUser) return;

    const channelName = `realtime_kurama_${currentUser.id}_${Date.now()}`;
    const channel = client.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            if (row.user_id && row.user_id !== currentUser.id) return;
            if (row.id === 'note_init_1' && localStorage.getItem('personalOS_welcome_note_dismissed') === 'true') return;
            if (deletedNoteIds.includes(row.id)) return;
            const newNote = {
              id: row.id,
              title: row.title || '',
              text: row.text,
              color: row.color || 'blue',
              tag: row.tag || 'Note',
              isPinned: Boolean(row.is_pinned),
              isDone: Boolean(row.is_done),
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            setNotes(prev => {
              const existingIdx = prev.findIndex(n => n.id === newNote.id);
              if (existingIdx !== -1) {
                const existingTime = new Date(prev[existingIdx].updatedAt || prev[existingIdx].createdAt || 0).getTime();
                const incomingTime = new Date(newNote.updatedAt || newNote.createdAt || 0).getTime();
                if (existingTime >= incomingTime) return prev;
                return prev.map(n => n.id === newNote.id ? newNote : n);
              }
              return [newNote, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row.user_id && row.user_id !== currentUser.id) return;
            const updatedNote = {
              id: row.id,
              title: row.title || '',
              text: row.text,
              color: row.color || 'blue',
              tag: row.tag || 'Note',
              isPinned: Boolean(row.is_pinned),
              isDone: Boolean(row.is_done),
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
          } else if (payload.eventType === 'DELETE') {
            const targetId = payload.old?.id;
            if (targetId) {
              setNotes(prev => prev.filter(n => n.id !== targetId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_words'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const w = payload.new;
            if (w.user_id && w.user_id !== currentUser.id) return;
            const formatted = {
              id: w.id,
              word: w.word,
              phonetic: w.phonetic,
              partOfSpeech: w.part_of_speech,
              definition: w.definition,
              example: w.example,
              synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
              antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
              memoryTip: w.memory_tip,
              etymology: w.etymology,
              isLearned: Boolean(w.is_learned),
              isFavorite: Boolean(w.is_favorite),
              isAiGenerated: Boolean(w.is_ai_generated),
              createdAt: w.created_at
            };
            setCustomWords(prev => {
              const filtered = prev.filter(item => item.id !== formatted.id);
              return [formatted, ...filtered];
            });
          } else if (payload.eventType === 'DELETE') {
            const targetId = payload.old?.id;
            if (targetId) {
              setCustomWords(prev => prev.filter(item => item.id !== targetId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Kurama Realtime] Subscribed to notes & custom_words channel successfully.');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Kurama Realtime] Channel subscription error encountered.');
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [currentUser, setNotes, setCustomWords]);


  // ================= CHALLENGE ACTIONS =================
  const addChallenge = useCallback((challengeData) => {
    const durationType = challengeData.durationType === 'open' ? 'open' : 'fixed';
    const newChallenge = {
      id: `chlg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: challengeData.name.trim(),
      durationType,
      duration: durationType === 'open' ? null : (parseInt(challengeData.duration, 10) || 120),
      startDate: challengeData.startDate || getTodayDateString(),
      dailyRequirements: (challengeData.dailyRequirements || []).map((req, idx) => ({
        id: req.id || `creq_${Date.now()}_${idx}`,
        title: req.title.trim(),
        type: req.type === 'counter' ? 'counter' : 'checkbox',
        target: req.target ? Number(req.target) : null,
        unit: req.unit || null
      })),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setChallenges(prev => [newChallenge, ...prev]);
    return newChallenge;
  }, [setChallenges]);

  const updateChallenge = useCallback((challengeId, updates) => {
    setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, ...updates } : c));
  }, [setChallenges]);

  const deleteChallenge = useCallback((challengeId) => {
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
    setChallengeEntries(prev => {
      const copy = { ...prev };
      delete copy[challengeId];
      return copy;
    });
    setChallengeCompletionTimes(prev => {
      const copy = { ...prev };
      delete copy[challengeId];
      return copy;
    });
    setChallengeDayNotes(prev => {
      const copy = { ...prev };
      delete copy[challengeId];
      return copy;
    });
    // Remove as primary if deleted
    if (settings.primaryChallengeId === challengeId) {
      setSettings(prev => ({ ...prev, primaryChallengeId: null }));
    }
  }, [setChallenges, setChallengeEntries, setChallengeCompletionTimes, setChallengeDayNotes, settings.primaryChallengeId, setSettings]);

  const toggleChallengeRequirement = useCallback((challengeId, reqId, dateStr = getTodayDateString()) => {
    setChallengeEntries(prev => {
      const challengeMap = prev[challengeId] || {};
      const dayMap = challengeMap[dateStr] || {};
      const currentVal = Boolean(dayMap[reqId]);
      const nextVal = !currentVal;

      return {
        ...prev,
        [challengeId]: {
          ...challengeMap,
          [dateStr]: {
            ...dayMap,
            [reqId]: nextVal
          }
        }
      };
    });

    // Track completion timestamps for the time-of-day heatmap; clear on un-check.
    setChallengeCompletionTimes(prev => {
      const challengeMap = prev[challengeId] || {};
      const dayMap = challengeMap[dateStr] || {};
      const wasSet = Boolean(dayMap[reqId]);
      const nextDayMap = { ...dayMap };
      if (wasSet) {
        delete nextDayMap[reqId];
      } else {
        nextDayMap[reqId] = new Date().toISOString();
      }
      return {
        ...prev,
        [challengeId]: {
          ...challengeMap,
          [dateStr]: nextDayMap
        }
      };
    });
  }, [setChallengeEntries, setChallengeCompletionTimes]);

  const adjustRequirementProgress = useCallback((challengeId, reqId, delta, dateStr = getTodayDateString()) => {
    const challenge = challenges.find(c => c.id === challengeId);
    const req = challenge?.dailyRequirements.find(r => r.id === reqId);
    const target = Number(req?.target) || 1;

    setChallengeEntries(prev => {
      const challengeMap = prev[challengeId] || {};
      const dayMap = challengeMap[dateStr] || {};
      const currentVal = Number(dayMap[reqId]) || 0;
      const nextVal = Math.max(0, +(currentVal + delta).toFixed(2));
      const wasComplete = currentVal >= target;
      const isComplete = nextVal >= target;

      if (isComplete !== wasComplete) {
        setChallengeCompletionTimes(timePrev => {
          const timeMap = timePrev[challengeId] || {};
          const timeDayMap = { ...(timeMap[dateStr] || {}) };
          if (isComplete) {
            timeDayMap[reqId] = new Date().toISOString();
          } else {
            delete timeDayMap[reqId];
          }
          return { ...timePrev, [challengeId]: { ...timeMap, [dateStr]: timeDayMap } };
        });
      }

      return {
        ...prev,
        [challengeId]: {
          ...challengeMap,
          [dateStr]: { ...dayMap, [reqId]: nextVal }
        }
      };
    });
  }, [challenges, setChallengeEntries, setChallengeCompletionTimes]);

  const setRequirementProgress = useCallback((challengeId, reqId, absoluteVal, dateStr = getTodayDateString()) => {
    const challenge = challenges.find(c => c.id === challengeId);
    const req = challenge?.dailyRequirements.find(r => r.id === reqId);
    const target = Number(req?.target) || 1;

    setChallengeEntries(prev => {
      const challengeMap = prev[challengeId] || {};
      const dayMap = challengeMap[dateStr] || {};
      const currentVal = Number(dayMap[reqId]) || 0;
      const nextVal = Math.max(0, +Number(absoluteVal).toFixed(2));
      const wasComplete = currentVal >= target;
      const isComplete = nextVal >= target;

      if (isComplete !== wasComplete) {
        setChallengeCompletionTimes(timePrev => {
          const timeMap = timePrev[challengeId] || {};
          const timeDayMap = { ...(timeMap[dateStr] || {}) };
          if (isComplete) {
            timeDayMap[reqId] = new Date().toISOString();
          } else {
            delete timeDayMap[reqId];
          }
          return { ...timePrev, [challengeId]: { ...timeMap, [dateStr]: timeDayMap } };
        });
      }

      return {
        ...prev,
        [challengeId]: {
          ...challengeMap,
          [dateStr]: { ...dayMap, [reqId]: nextVal }
        }
      };
    });
  }, [challenges, setChallengeEntries, setChallengeCompletionTimes]);

  const applyStreakFreeze = useCallback((challengeId, dateStr) => {
    setChallenges(prev => prev.map(c => {
      if (c.id !== challengeId) return c;
      const frozenDates = c.frozenDates || [];
      if (frozenDates.includes(dateStr)) return c;
      return { ...c, frozenDates: [...frozenDates, dateStr] };
    }));
  }, [setChallenges]);

  const saveChallengeDayNote = useCallback((challengeId, dateStr, note) => {
    setChallengeDayNotes(prev => ({
      ...prev,
      [challengeId]: {
        ...(prev[challengeId] || {}),
        [dateStr]: note
      }
    }));
  }, [setChallengeDayNotes]);

  const deleteChallengeDayNote = useCallback((challengeId, dateStr) => {
    setChallengeDayNotes(prev => {
      const challengeMap = { ...(prev[challengeId] || {}) };
      delete challengeMap[dateStr];
      return { ...prev, [challengeId]: challengeMap };
    });
  }, [setChallengeDayNotes]);

  // ================= COUNTER ACTIONS =================
  const addCounter = useCallback((counterData) => {
    const newCounter = {
      id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: counterData.name.trim(),
      unit: counterData.unit || '',
      step: Number(counterData.step) || 1,
      target: counterData.target ? Number(counterData.target) : null,
      createdAt: getTodayDateString()
    };
    setCounters(prev => [...prev, newCounter]);
    return newCounter;
  }, [setCounters]);

  const updateCounter = useCallback((counterId, updates) => {
    setCounters(prev => prev.map(c => c.id === counterId ? { ...c, ...updates } : c));
  }, [setCounters]);

  const deleteCounter = useCallback((counterId) => {
    setCounters(prev => prev.filter(c => c.id !== counterId));
    setCounterEntries(prev => {
      const copy = { ...prev };
      delete copy[counterId];
      return copy;
    });
    setCounterCompletionTimes(prev => {
      const copy = { ...prev };
      delete copy[counterId];
      return copy;
    });
  }, [setCounters, setCounterEntries, setCounterCompletionTimes]);

  const adjustCounterValue = useCallback((counterId, delta, dateStr = getTodayDateString()) => {
    setCounterEntries(prev => {
      const counterMap = prev[counterId] || {};
      const currentVal = Number(counterMap[dateStr]) || 0;
      const nextVal = Math.max(0, +(currentVal + delta).toFixed(2));
      return {
        ...prev,
        [counterId]: {
          ...counterMap,
          [dateStr]: nextVal
        }
      };
    });

    // Log a timestamp per positive increment for the time-of-day heatmap.
    if (delta > 0) {
      setCounterCompletionTimes(prev => {
        const counterMap = prev[counterId] || {};
        const dayTimes = counterMap[dateStr] || [];
        return {
          ...prev,
          [counterId]: {
            ...counterMap,
            [dateStr]: [...dayTimes, new Date().toISOString()]
          }
        };
      });
    }
  }, [setCounterEntries, setCounterCompletionTimes]);

  const setCounterValue = useCallback((counterId, value, dateStr = getTodayDateString()) => {
    setCounterEntries(prev => {
      const counterMap = prev[counterId] || {};
      const nextVal = Math.max(0, Number(value) || 0);
      return {
        ...prev,
        [counterId]: {
          ...counterMap,
          [dateStr]: nextVal
        }
      };
    });
  }, [setCounterEntries]);

  // ================= JOURNAL ACTIONS =================
  const saveJournalEntry = useCallback((dateStr, content) => {
    setJournal(prev => ({
      ...prev,
      [dateStr]: {
        content,
        updatedAt: new Date().toISOString()
      }
    }));
  }, [setJournal]);

  const deleteJournalEntry = useCallback((dateStr) => {
    setJournal(prev => {
      const copy = { ...prev };
      delete copy[dateStr];
      return copy;
    });
  }, [setJournal]);

  // ================= NOTE TAKER ACTIONS ("write there and put it there") =================
  const addNote = useCallback((noteData) => {
    const now = new Date().toISOString();
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: noteData.title ? noteData.title.trim() : '',
      text: (noteData.text || '').trim(),
      color: noteData.color || 'blue',
      tag: noteData.tag || 'Note',
      isPinned: Boolean(noteData.isPinned),
      isDone: false,
      createdAt: now,
      updatedAt: now
    };
    setNotes(prev => [newNote, ...prev]);

    // Instant direct push to Supabase for immediate cross-device real-time sync
    const client = getSupabaseClient();
    if (client && currentUser) {
      client.from('notes').upsert({
        id: newNote.id,
        user_id: currentUser.id,
        title: newNote.title,
        text: newNote.text,
        color: newNote.color,
        tag: newNote.tag,
        is_pinned: newNote.isPinned,
        is_done: newNote.isDone,
        created_at: newNote.createdAt,
        updated_at: newNote.updatedAt
      }).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] addNote push error:', error);
      });
    }

    return newNote;
  }, [setNotes, currentUser]);

  const updateNote = useCallback((noteId, updates) => {
    const now = new Date().toISOString();
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: now } : n));

    const client = getSupabaseClient();
    if (client && currentUser) {
      const dbUpdates = { updated_at: now };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.tag !== undefined) dbUpdates.tag = updates.tag;
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = Boolean(updates.isPinned);
      if (updates.isDone !== undefined) dbUpdates.is_done = Boolean(updates.isDone);

      client.from('notes').update(dbUpdates).eq('id', noteId).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] updateNote push error:', error);
      });
    }
  }, [setNotes, currentUser]);

  const deleteNote = useCallback((noteId) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));

    // Permanently record deletion so cloud sync or reloads never re-add it
    setDeletedNoteIds(prev => (prev.includes(noteId) ? prev : [...prev, noteId]));
    if (noteId === 'note_init_1') {
      try {
        localStorage.setItem('personalOS_welcome_note_dismissed', 'true');
      } catch {}
    }

    const client = getSupabaseClient();
    if (client && currentUser) {
      client.from('notes').delete().eq('id', noteId).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] deleteNote push error:', error);
      });
    }
  }, [setNotes, setDeletedNoteIds, currentUser]);

  const togglePinNote = useCallback((noteId) => {
    const now = new Date().toISOString();
    let nextPinned = false;
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        nextPinned = !n.isPinned;
        return { ...n, isPinned: nextPinned, updatedAt: now };
      }
      return n;
    }));

    const client = getSupabaseClient();
    if (client && currentUser) {
      client.from('notes').update({ is_pinned: nextPinned, updated_at: now }).eq('id', noteId).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] togglePinNote push error:', error);
      });
    }
  }, [setNotes, currentUser]);

  const toggleCheckNote = useCallback((noteId) => {
    const now = new Date().toISOString();
    let nextDone = false;
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        nextDone = !n.isDone;
        return { ...n, isDone: nextDone, updatedAt: now };
      }
      return n;
    }));

    const client = getSupabaseClient();
    if (client && currentUser) {
      client.from('notes').update({ is_done: nextDone, updated_at: now }).eq('id', noteId).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] toggleCheckNote push error:', error);
      });
    }
  }, [setNotes, currentUser]);

  // ================= ENGLISH DAILY ACTIONS =================
  const toggleWordLearned = useCallback((wordId) => {
    setLearnedWords(prev => {
      if (prev.includes(wordId)) {
        return prev.filter(id => id !== wordId);
      }
      return [...prev, wordId];
    });
  }, [setLearnedWords]);

  const toggleWordFavorite = useCallback((wordId) => {
    setFavoriteWords(prev => {
      if (prev.includes(wordId)) {
        return prev.filter(id => id !== wordId);
      }
      return [...prev, wordId];
    });
  }, [setFavoriteWords]);

  // ================= ENGLISH DAILY & SRS ACTIONS =================
  const reviewWordSrs = useCallback((wordId, quality) => {
    // Quality intervals: again (1d), hard (3d), good (7d), mastered (30d)
    const intervalMap = {
      again: 1,
      hard: 3,
      good: 7,
      mastered: 30
    };
    const days = intervalMap[quality] || 1;
    const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setSrsReviews(prev => {
      const prevEntry = prev[wordId] || { repetitions: 0 };
      return {
        ...prev,
        [wordId]: {
          quality,
          intervalDays: days,
          nextReviewDate: targetDate,
          lastReviewedAt: new Date().toISOString(),
          repetitions: (prevEntry.repetitions || 0) + 1
        }
      };
    });

    // Mark as learned automatically if rated good or mastered
    if (quality === 'good' || quality === 'mastered') {
      setLearnedWords(prev => (prev.includes(wordId) ? prev : [...prev, wordId]));
    }
  }, [setSrsReviews, setLearnedWords]);

  // ================= AI VOCABULARY ACTIONS =================
  const updateAiSettings = useCallback((updates) => {
    setAiSettings(prev => ({ ...prev, ...updates }));
  }, [setAiSettings]);

  const addCustomWord = useCallback((word) => {
    setCustomWords(prev => {
      // Prevent duplicates by word name
      const filtered = prev.filter(w => w.word.toLowerCase() !== word.word.toLowerCase());
      return [word, ...filtered];
    });

    const client = getSupabaseClient();
    if (client && currentUser) {
      client.from('custom_words').upsert({
        id: word.id,
        user_id: currentUser.id,
        word: word.word,
        phonetic: word.phonetic || '',
        part_of_speech: word.partOfSpeech || 'noun',
        definition: word.definition || '',
        example: word.example || '',
        synonyms: word.synonyms || [],
        antonyms: word.antonyms || [],
        memory_tip: word.memoryTip || '',
        etymology: word.etymology || '',
        is_learned: Boolean(word.isLearned),
        is_favorite: Boolean(word.isFavorite),
        is_ai_generated: Boolean(word.isAiGenerated),
        created_at: word.createdAt || new Date().toISOString()
      }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] addCustomWord push error:', error);
      });
    }
  }, [setCustomWords, currentUser]);

  const deleteCustomWord = useCallback((wordId) => {
    setCustomWords(prev => prev.filter(w => w.id !== wordId));

    const client = getSupabaseClient();
    if (client && currentUser) {
      client.from('custom_words').delete().eq('id', wordId).then(({ error }) => {
        if (error) console.error('[Kurama Direct Sync] deleteCustomWord push error:', error);
      });
    }
  }, [setCustomWords, currentUser]);

  // ================= SETTINGS & DATA MANAGEMENT =================
  const updateSettings = useCallback((updates) => {

    setSettings(prev => ({ ...prev, ...updates }));
  }, [setSettings]);

  const setPrimaryChallenge = useCallback((challengeId) => {
    setSettings(prev => ({ ...prev, primaryChallengeId: challengeId }));
  }, [setSettings]);

  const recordBackup = useCallback(() => {
    setSettings(prev => ({ ...prev, lastBackupAt: new Date().toISOString() }));
  }, [setSettings]);

  const startFresh = useCallback(() => {
    setHasOnboarded(true);
  }, [setHasOnboarded]);

  const loadDemoData = useCallback(() => {
    const demo = getExampleData();
    // We only load demo data for features that still exist
    setChallenges(demo.challenges || []);
    setChallengeEntries(demo.challengeEntries || {});
    setCounters(demo.counters || []);
    setCounterEntries(demo.counterEntries || {});
    setJournal(demo.journal || {});
    setNotes([
      {
        id: 'note_demo_1',
        title: 'Project Roadmap 🚀',
        text: 'Finish binary search tree practice, review graph algorithms, and submit system design notes.',
        color: 'blue',
        tag: 'Study',
        isPinned: true,
        isDone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note_demo_2',
        title: 'Daily Reminder 💧',
        text: 'Drink at least 3 liters of water and take a 20-minute walk outside away from screens.',
        color: 'emerald',
        tag: 'Health',
        isPinned: false,
        isDone: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    setLearnedWords(['word_1', 'word_2']);
    setFavoriteWords(['word_1']);
    setSettings(prev => ({ ...prev, ...demo.settings }));
    setChallengeCompletionTimes({});
    setCounterCompletionTimes({});
    setChallengeDayNotes({});
    setHasOnboarded(true);
  }, [setChallenges, setChallengeEntries, setCounters, setCounterEntries, setJournal, setNotes, setLearnedWords, setFavoriteWords, setSettings, setChallengeCompletionTimes, setCounterCompletionTimes, setChallengeDayNotes, setHasOnboarded]);

  const clearAllData = useCallback(() => {
    setChallenges([]);
    setChallengeEntries({});
    setCounters([]);
    setCounterEntries({});
    setJournal({});
    setNotes([]);
    setLearnedWords([]);
    setFavoriteWords([]);
    setCustomWords([]);
    setSrsReviews({});
    setChallengeCompletionTimes({});
    setCounterCompletionTimes({});
    setChallengeDayNotes({});
    setSettings({ theme: 'dark', userName: '', motto: '', primaryChallengeId: null, lastBackupAt: null });
    setHasOnboarded(false);
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('[Personal OS] Could not clear localStorage:', e);
    }
  }, [setChallenges, setChallengeEntries, setCounters, setCounterEntries, setJournal, setNotes, setLearnedWords, setFavoriteWords, setCustomWords, setSrsReviews, setChallengeCompletionTimes, setCounterCompletionTimes, setChallengeDayNotes, setSettings, setHasOnboarded]);

  const exportData = useCallback(() => {
    return {
      version: '2.4.0', // Updated to 2.4.0: adds SRS reviews
      exportedAt: new Date().toISOString(),
      challenges,
      challengeEntries,
      counters,
      counterEntries,
      journal,
      notes,
      learnedWords,
      favoriteWords,
      customWords,
      srsReviews,
      aiSettings,
      settings,
      challengeCompletionTimes,
      counterCompletionTimes,
      challengeDayNotes
    };
  }, [challenges, challengeEntries, counters, counterEntries, journal, notes, learnedWords, favoriteWords, customWords, srsReviews, aiSettings, settings, challengeCompletionTimes, counterCompletionTimes, challengeDayNotes]);

  const importData = useCallback((imported) => {
    if (!imported || typeof imported !== 'object') {
      throw new Error('Invalid JSON backup file');
    }
    if (Array.isArray(imported.challenges)) setChallenges(imported.challenges);
    if (imported.challengeEntries && typeof imported.challengeEntries === 'object') setChallengeEntries(imported.challengeEntries);
    if (Array.isArray(imported.counters)) setCounters(imported.counters);
    if (imported.counterEntries && typeof imported.counterEntries === 'object') setCounterEntries(imported.counterEntries);
    if (imported.journal && typeof imported.journal === 'object') setJournal(imported.journal);
    if (Array.isArray(imported.notes)) setNotes(imported.notes);
    if (Array.isArray(imported.learnedWords)) setLearnedWords(imported.learnedWords);
    if (Array.isArray(imported.favoriteWords)) setFavoriteWords(imported.favoriteWords);
    if (Array.isArray(imported.customWords)) setCustomWords(imported.customWords);
    if (imported.srsReviews && typeof imported.srsReviews === 'object') setSrsReviews(imported.srsReviews);
    if (imported.aiSettings && typeof imported.aiSettings === 'object') setAiSettings(prev => ({ ...prev, ...imported.aiSettings }));
    if (imported.settings && typeof imported.settings === 'object') setSettings(prev => ({ ...prev, ...imported.settings }));
    if (imported.challengeCompletionTimes && typeof imported.challengeCompletionTimes === 'object') setChallengeCompletionTimes(imported.challengeCompletionTimes);
    if (imported.counterCompletionTimes && typeof imported.counterCompletionTimes === 'object') setCounterCompletionTimes(imported.counterCompletionTimes);
    if (imported.challengeDayNotes && typeof imported.challengeDayNotes === 'object') setChallengeDayNotes(imported.challengeDayNotes);
    setHasOnboarded(true);
    return true;
  }, [setChallenges, setChallengeEntries, setCounters, setCounterEntries, setJournal, setNotes, setLearnedWords, setFavoriteWords, setCustomWords, setSrsReviews, setAiSettings, setSettings, setChallengeCompletionTimes, setCounterCompletionTimes, setChallengeDayNotes, setHasOnboarded]);

  const value = useMemo(() => ({
    challenges,
    challengeEntries,
    addChallenge,
    updateChallenge,
    deleteChallenge,
    toggleChallengeRequirement,
    adjustRequirementProgress,
    setRequirementProgress,
    applyStreakFreeze,

    challengeCompletionTimes,
    counterCompletionTimes,

    challengeDayNotes,
    saveChallengeDayNote,
    deleteChallengeDayNote,

    counters,
    counterEntries,
    addCounter,
    updateCounter,
    deleteCounter,
    adjustCounterValue,
    setCounterValue,

    journal,
    saveJournalEntry,
    deleteJournalEntry,

    notes,
    addNote,
    updateNote,
    deleteNote,
    togglePinNote,
    toggleCheckNote,

    learnedWords,
    favoriteWords,
    toggleWordLearned,
    toggleWordFavorite,

    customWords,
    srsReviews,
    reviewWordSrs,
    aiSettings,
    updateAiSettings,
    addCustomWord,
    deleteCustomWord,

    settings,
    updateSettings,
    setPrimaryChallenge,
    recordBackup,

    hasOnboarded,
    startFresh,
    loadDemoData,
    clearAllData,
    exportData,
    importData,

    // Supabase Auth & Cloud Sync
    currentUser,
    isSyncing,
    lastSyncedAt,
    isAuthModalOpen,
    setIsAuthModalOpen,
    syncWithCloud
  }), [
    challenges, challengeEntries, addChallenge, updateChallenge, deleteChallenge, toggleChallengeRequirement, adjustRequirementProgress, setRequirementProgress, applyStreakFreeze,
    challengeCompletionTimes, counterCompletionTimes,
    challengeDayNotes, saveChallengeDayNote, deleteChallengeDayNote,
    counters, counterEntries, addCounter, updateCounter, deleteCounter, adjustCounterValue, setCounterValue,
    journal, saveJournalEntry, deleteJournalEntry,
    notes, addNote, updateNote, deleteNote, togglePinNote, toggleCheckNote,
    learnedWords, favoriteWords, toggleWordLearned, toggleWordFavorite,
    customWords, srsReviews, reviewWordSrs, aiSettings, updateAiSettings, addCustomWord, deleteCustomWord,
    settings, updateSettings, setPrimaryChallenge, recordBackup,
    hasOnboarded, startFresh, loadDemoData, clearAllData, exportData, importData,
    currentUser, isSyncing, lastSyncedAt, isAuthModalOpen, setIsAuthModalOpen, syncWithCloud
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
