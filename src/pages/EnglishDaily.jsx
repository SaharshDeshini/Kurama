import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getTodayDateString } from '../utils/dates';
import { ENGLISH_DAILY_WORDS, getWordForDate, speakWord } from '../data/englishDailyWords';
import { generateWordWithAi, evaluateUserSentenceWithAi } from '../utils/aiWordService';
import {
  Volume2,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Search,
  Eye,
  EyeOff,
  BookA,
  Lightbulb,
  History,
  GraduationCap,
  Loader2,
  Trash2,
  Key,
  AlertCircle,
  PenTool,
  Send,
  RotateCcw,
  Award,
  Flame,
  Check,
  Clock
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { SettingsModal } from '../components/settings/SettingsModal';

export function EnglishDaily() {
  const {
    learnedWords = [],
    favoriteWords = [],
    customWords = [],
    srsReviews = {},
    reviewWordSrs,
    aiSettings = { provider: 'gemini', apiKey: '', level: 'advanced' },
    toggleWordLearned,
    toggleWordFavorite,
    addCustomWord,
    deleteCustomWord
  } = useData();

  const todayStr = getTodayDateString();
  const todayDefaultWord = getWordForDate(todayStr);

  // Combine custom AI words with standard curated words
  const allWords = useMemo(() => {
    return [...customWords, ...ENGLISH_DAILY_WORDS];
  }, [customWords]);

  const [currentWordIndex, setCurrentWordIndex] = useState(() => {
    if (customWords.length > 0) return 0;
    const idx = ENGLISH_DAILY_WORDS.findIndex(w => w.id === todayDefaultWord.id);
    return idx >= 0 ? idx : 0;
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [accent, setAccent] = useState('us'); // 'us' | 'uk'
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isDefinitionRevealed, setIsDefinitionRevealed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ai' | 'learned' | 'favorites'

  // AI Sentence Practice state
  const [practiceSentence, setPracticeSentence] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evalError, setEvalError] = useState(null);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const safeIndex = currentWordIndex < allWords.length ? currentWordIndex : 0;
  const currentWord = allWords[safeIndex] || ENGLISH_DAILY_WORDS[0];
  const isLearned = learnedWords.includes(currentWord.id);
  const isFavorite = favoriteWords.includes(currentWord.id);
  const currentSrs = srsReviews[currentWord.id] || null;

  const handleSpeak = (wordText, chosenAccent = accent) => {
    setIsSpeaking(true);
    speakWord(wordText || currentWord.word, chosenAccent);
    setTimeout(() => setIsSpeaking(false), 1200);
  };

  const resetPracticeState = () => {
    setPracticeSentence('');
    setEvaluationResult(null);
    setEvalError(null);
  };

  const handlePrev = () => {
    setIsDefinitionRevealed(false);
    resetPracticeState();
    setCurrentWordIndex(prev => (prev === 0 ? allWords.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsDefinitionRevealed(false);
    resetPracticeState();
    setCurrentWordIndex(prev => (prev === allWords.length - 1 ? 0 : prev + 1));
  };

  const handleRandom = () => {
    setIsDefinitionRevealed(false);
    resetPracticeState();
    let nextIdx = safeIndex;
    while (nextIdx === safeIndex && allWords.length > 1) {
      nextIdx = Math.floor(Math.random() * allWords.length);
    }
    setCurrentWordIndex(nextIdx);
  };

  const handleEvaluateSentence = async (e) => {
    e?.preventDefault();
    if (!practiceSentence.trim()) return;

    if (!aiSettings.apiKey || !aiSettings.apiKey.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);
    try {
      const result = await evaluateUserSentenceWithAi({
        word: currentWord.word,
        userSentence: practiceSentence.trim(),
        sentence: practiceSentence.trim(),
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey
      });
      setEvaluationResult(result);
    } catch (err) {
      setEvalError(err.message || 'Failed to evaluate sentence.');
    } finally {
      setIsEvaluating(false);
    }
  };


  const handleGenerateWord = async () => {
    if (!aiSettings.apiKey || !aiSettings.apiKey.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    try {
      const generated = await generateWordWithAi({
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        level: aiSettings.level,
        existingWords: allWords.map(w => w.word)
      });
      addCustomWord(generated);
      setCurrentWordIndex(0); // Set newly generated AI word as current hero
      setIsDefinitionRevealed(false);
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate word. Check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredWords = allWords.filter(w => {
    const matchesSearch =
      !searchQuery.trim() ||
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.synonyms && w.synonyms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;
    if (activeTab === 'ai') return Boolean(w.isAiGenerated);
    if (activeTab === 'learned') return learnedWords.includes(w.id);
    if (activeTab === 'favorites') return favoriteWords.includes(w.id);
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00B4FF] flex items-center justify-center text-black shadow-glow">
              <BookA className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              English Daily
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00B4FF]/15 text-[#00B4FF] border border-[#00B4FF]/30">
                AI Powered
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#8295B0] mt-1">
            Build an articulate vocabulary every day. Learn curated words or connect AI to generate brand new ones.
          </p>
        </div>

        {/* Header Actions & Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleGenerateWord}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow disabled:opacity-60 disabled:pointer-events-none"
            title="Generate a brand new articulate English word using your AI key"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Crafting Word...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Generate with AI</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-xl border border-border-dark bg-surface-dark text-subtle-dark hover:text-white hover:border-[#00B4FF]/50 transition-colors"
            title="Configure AI API Key (Gemini, Groq, OpenAI)"
          >
            <Key className="w-4 h-4 text-[#00B4FF]" />
          </button>

          <div className="px-3 py-1.5 rounded-xl border border-border-dark bg-surface-dark flex items-center gap-1.5 text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-[#00B4FF]" />
            <span className="font-semibold text-white">{learnedWords.length}</span>
            <span className="text-[#8295B0]">Learned</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl border border-border-dark bg-surface-dark flex items-center gap-1.5 text-xs">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white">{favoriteWords.length}</span>
            <span className="text-[#8295B0]">Saved</span>
          </div>
        </div>
      </div>

      {/* AI Error or Settings Missing Prompt */}
      {generateError && (
        <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/40 text-xs flex items-center justify-between gap-3 text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{generateError}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-900 text-white font-medium shrink-0"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Featured Word Card (Hero) */}
      <div className="relative rounded-2xl border-2 border-[#1A2744] bg-[#0A101F] p-6 sm:p-7 shadow-xs transition-surface overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B4FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header Nav */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A2744]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00B4FF]">
              Word #{safeIndex + 1} of {allWords.length}
            </span>

            {currentWord.isAiGenerated && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00B4FF]/20 border border-[#00B4FF]/50 text-[#00B4FF] flex items-center gap-1 shadow-glow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                AI Generated
              </span>
            )}

            {!currentWord.isAiGenerated && currentWord.id === todayDefaultWord.id && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/70 border border-[#00B4FF]/40 text-[#38BDF8]">
                Today's Curated Word
              </span>
            )}

            {currentWord.isAiGenerated && (
              <button
                type="button"
                onClick={() => {
                  deleteCustomWord(currentWord.id);
                  setCurrentWordIndex(0);
                }}
                className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors ml-1"
                title="Delete this AI word"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Word Steppers */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Previous Word"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRandom}
              className="p-1.5 rounded-lg text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Random Word"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Next Word"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Word Title & Pronunciation & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
              {currentWord.word}
            </h1>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSpeak(currentWord.word, accent)}
                className={`p-1.5 rounded-full text-black bg-[#00B4FF] hover:bg-[#38BDF8] shadow-glow-sm transition-transform active:scale-95 ${
                  isSpeaking ? 'animate-pulse scale-110' : ''
                }`}
                title="Listen to pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              {/* Accent Switcher Pill */}
              <div className="flex items-center rounded-lg border border-border-dark bg-[#081226] p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => { setAccent('us'); handleSpeak(currentWord.word, 'us'); }}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    accent === 'us'
                      ? 'bg-[#00B4FF] text-black shadow-glow-sm'
                      : 'text-[#8295B0] hover:text-white'
                  }`}
                  title="American English accent"
                >
                  🇺🇸 US
                </button>
                <button
                  type="button"
                  onClick={() => { setAccent('uk'); handleSpeak(currentWord.word, 'uk'); }}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    accent === 'uk'
                      ? 'bg-[#00B4FF] text-black shadow-glow-sm'
                      : 'text-[#8295B0] hover:text-white'
                  }`}
                  title="British English accent"
                >
                  🇬🇧 UK
                </button>
              </div>
            </div>

            <span className="text-sm font-mono text-subtle-light dark:text-subtle-dark">
              {currentWord.phonetic}
            </span>

            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {currentWord.partOfSpeech}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsQuizMode(!isQuizMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isQuizMode
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark'
              }`}
              title="Toggle Flashcard / Quiz Mode to test memory"
            >
              {isQuizMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isQuizMode ? 'Quiz Active' : 'Quiz Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleWordFavorite(currentWord.id)}
              className={`p-2 rounded-lg border transition-colors ${
                isFavorite
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-500'
                  : 'border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => toggleWordLearned(currentWord.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${
                isLearned
                  ? 'bg-ok text-white shadow-xs'
                  : 'border border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLearned ? 'Learned' : 'Mark Learned'}</span>
            </button>
          </div>
        </div>

        {/* Word Content / Meaning */}
        <div className="mt-6 space-y-4">
          {isQuizMode && !isDefinitionRevealed ? (
            <div className="p-6 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-2">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Flashcard Active: Do you recall what <span className="font-bold underline">{currentWord.word}</span> means?
              </p>
              <button
                type="button"
                onClick={() => setIsDefinitionRevealed(true)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Reveal Meaning & Example
              </button>
            </div>
          ) : (
            <>
              {/* Definition */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle-light dark:text-subtle-dark mb-1">
                  Meaning & Definition
                </h4>
                <p className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  {currentWord.definition}
                </p>
              </div>

              {/* Example sentence */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle-light dark:text-subtle-dark mb-1">
                  Example Sentence
                </h4>
                <div className="pl-3.5 border-l-2 border-blue-500 py-1 bg-surfaceHover-light/40 dark:bg-surfaceHover-dark/30 rounded-r-lg">
                  <p className="text-xs sm:text-sm italic text-zinc-800 dark:text-zinc-200">
                    "{currentWord.example}"
                  </p>
                </div>
              </div>

              {/* Synonyms & Antonyms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle-light dark:text-subtle-dark mb-1.5">
                      Synonyms
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentWord.synonyms.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 text-xs rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle-light dark:text-subtle-dark mb-1.5">
                      Antonyms
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentWord.antonyms.map((a) => (
                        <span
                          key={a}
                          className="px-2 py-0.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-border-light dark:border-border-dark"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Memory Tip & Etymology */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentWord.memoryTip && (
                  <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Memory Hook</span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                      {currentWord.memoryTip}
                    </p>
                  </div>
                )}

                {currentWord.etymology && (
                  <div className="p-3 rounded-xl border border-border-light dark:border-border-dark bg-surfaceHover-light/40 dark:bg-surfaceHover-dark/30 text-xs">
                    <div className="flex items-center gap-1.5 text-subtle-light dark:text-subtle-dark font-semibold mb-1">
                      <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Word Origin & Etymology</span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                      {currentWord.etymology}
                    </p>
                  </div>
                )}
              </div>

              {/* Spaced Repetition (SRS) Memory Review Bar */}
              <div className="p-4 rounded-xl border border-[#1A2744] bg-[#081226]/90 mt-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#00B4FF]" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Spaced Repetition (SRS) Review
                    </span>
                  </div>
                  {currentSrs ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 border border-[#00B4FF]/40 text-[#38BDF8] font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Next due: {currentSrs.nextReviewDate} (Rep #{currentSrs.repetitions})
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#8295B0]">
                      Rate recall to set smart review schedule
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => reviewWordSrs(currentWord.id, 'again')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      currentSrs?.quality === 'again'
                        ? 'border-red-500 bg-red-950/50 text-red-300 ring-1 ring-red-500'
                        : 'border-border-dark bg-[#0A101F] text-[#8295B0] hover:text-red-300 hover:border-red-900/60'
                    }`}
                  >
                    <span>Again</span>
                    <span className="text-[10px] opacity-70">1 Day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => reviewWordSrs(currentWord.id, 'hard')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      currentSrs?.quality === 'hard'
                        ? 'border-amber-500 bg-amber-950/50 text-amber-300 ring-1 ring-amber-500'
                        : 'border-border-dark bg-[#0A101F] text-[#8295B0] hover:text-amber-300 hover:border-amber-900/60'
                    }`}
                  >
                    <span>Hard</span>
                    <span className="text-[10px] opacity-70">3 Days</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => reviewWordSrs(currentWord.id, 'good')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      currentSrs?.quality === 'good'
                        ? 'border-[#00B4FF] bg-[#00B4FF]/15 text-[#00B4FF] ring-1 ring-[#00B4FF] shadow-glow-sm'
                        : 'border-border-dark bg-[#0A101F] text-[#8295B0] hover:text-[#00B4FF] hover:border-[#00B4FF]/50'
                    }`}
                  >
                    <span>Good</span>
                    <span className="text-[10px] opacity-70">7 Days</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => reviewWordSrs(currentWord.id, 'mastered')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      currentSrs?.quality === 'mastered'
                        ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-border-dark bg-[#0A101F] text-[#8295B0] hover:text-emerald-300 hover:border-emerald-900/60'
                    }`}
                  >
                    <span>Mastered</span>
                    <span className="text-[10px] opacity-70">30 Days</span>
                  </button>
                </div>
              </div>

              {/* AI Sentence Mastery & Linguistic Practice */}
              <div className="p-4 rounded-xl border border-[#1A2744] bg-[#091122]/90 mt-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-[#00B4FF]" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      AI Sentence Practice & Scoring
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8295B0]">
                    Write a sentence using <span className="font-bold text-white">"{currentWord.word}"</span>
                  </span>
                </div>

                <form onSubmit={handleEvaluateSentence} className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={practiceSentence}
                      onChange={(e) => setPracticeSentence(e.target.value)}
                      placeholder={`Type a sentence using "${currentWord.word}" to get AI linguistic feedback...`}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-dark bg-[#0A101F] text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isEvaluating || !practiceSentence.trim()}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow-sm disabled:opacity-50"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Evaluating Nuance...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-black" />
                          <span>Evaluate with AI</span>
                        </>
                      )}
                    </button>

                    {practiceSentence && (
                      <button
                        type="button"
                        onClick={resetPracticeState}
                        className="text-[11px] text-[#8295B0] hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>

                {evalError && (
                  <div className="p-2.5 rounded-lg border border-red-900/50 bg-red-950/30 text-xs text-red-300 flex items-center justify-between gap-2">
                    <span>{evalError}</span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-[10px] font-bold text-white underline"
                    >
                      API Settings
                    </button>
                  </div>
                )}

                {evaluationResult && (
                  <div className="p-3.5 rounded-xl border border-[#00B4FF]/40 bg-[#081226] space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                          evaluationResult.score >= 8
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : evaluationResult.score >= 5
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                        }`}>
                          Score: {evaluationResult.score} / 10
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-300">
                          {evaluationResult.isCorrect ? '✅ Well Applied' : '⚠️ Needs Refinement'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed">
                      {evaluationResult.feedback}
                    </p>

                    {evaluationResult.improvedVersion && (
                      <div className="pt-2 border-t border-[#1A2744]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#00B4FF] block mb-0.5">
                          Polished Phrasing:
                        </span>
                        <p className="text-xs italic text-[#38BDF8]">
                          "{evaluationResult.improvedVersion}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vocabulary Bank / Word Explorer */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-subtle-light dark:text-subtle-dark">
              Vocabulary Library ({filteredWords.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0A101F] border border-border-dark p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#00B4FF] text-black font-bold shadow-glow-sm'
                    : 'text-[#8295B0] hover:text-white'
                }`}
              >
                All ({allWords.length})
              </button>
              {customWords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    activeTab === 'ai'
                      ? 'bg-[#00B4FF] text-black font-bold shadow-glow-sm'
                      : 'text-[#00B4FF] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Generated ({customWords.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('learned')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'learned'
                    ? 'bg-[#00B4FF] text-black font-bold shadow-glow-sm'
                    : 'text-[#8295B0] hover:text-white'
                }`}
              >
                Learned ({learnedWords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('favorites')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-[#00B4FF] text-black font-bold shadow-glow-sm'
                    : 'text-[#8295B0] hover:text-white'
                }`}
              >
                Favorites ({favoriteWords.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-[#8295B0] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vocabulary..."
                className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF] w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Word Grid */}
        {filteredWords.length === 0 ? (
          <EmptyState
            icon={BookA}
            title="No vocabulary words found"
            description="Try adjusting your search query, generating a word with AI, or switching filter tabs."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredWords.map((w) => {
              const wordIsLearned = learnedWords.includes(w.id);
              const wordIsFavorite = favoriteWords.includes(w.id);
              const isSelected = w.id === currentWord.id;

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    const globalIdx = allWords.findIndex(item => item.id === w.id);
                    if (globalIdx >= 0) setCurrentWordIndex(globalIdx);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#00B4FF] bg-[#00B4FF]/10 ring-1 ring-[#00B4FF] shadow-glow-sm'
                      : 'border-border-dark bg-surface-dark hover:border-[#00B4FF]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-zinc-100 font-sans group-hover:text-[#00B4FF] transition-colors">
                          {w.word}
                        </span>
                        {w.isAiGenerated && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-[#00B4FF]/20 text-[#00B4FF] border border-[#00B4FF]/40 inline-flex items-center gap-0.5">
                            <Sparkles className="w-2 h-2" />
                            AI
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#8295B0]">
                          {w.phonetic}
                        </span>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSpeak(w.word)}
                          className="p-1 rounded text-[#8295B0] hover:text-[#00B4FF]"
                          title="Listen"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWordFavorite(w.id)}
                          className={`p-1 rounded ${
                            wordIsFavorite ? 'text-amber-500' : 'text-[#8295B0] hover:text-amber-500'
                          }`}
                          title="Favorite"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${wordIsFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                      {w.definition}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border-dark flex items-center justify-between text-[10px]">
                    <span className="uppercase tracking-wider font-semibold text-[#00B4FF]">
                      {w.partOfSpeech}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWordLearned(w.id);
                      }}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                        wordIsLearned ? 'text-emerald-400 font-semibold' : 'text-[#8295B0] hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{wordIsLearned ? 'Learned' : 'Learn'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Modal (Opens when user clicks Key icon or tries to generate without key) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
