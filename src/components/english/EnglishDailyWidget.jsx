import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { getTodayDateString } from '../../utils/dates';
import { getWordForDate, speakWord } from '../../data/englishDailyWords';
import { Volume2, CheckCircle2, Bookmark, ArrowRight, Sparkles, Lightbulb } from 'lucide-react';
import BlurText from '../ui/BlurText';

export function EnglishDailyWidget() {
  const {
    learnedWords = [],
    favoriteWords = [],
    customWords = [],
    toggleWordLearned,
    toggleWordFavorite
  } = useData();
  const todayStr = getTodayDateString();
  const todayCurated = getWordForDate(todayStr);

  // If user generated custom words recently, highlight the latest one, else today's curated word
  const activeWord = customWords.length > 0 ? customWords[0] : todayCurated;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const isLearned = learnedWords.includes(activeWord.id);
  const isFavorite = favoriteWords.includes(activeWord.id);

  const handleSpeak = (e) => {
    e.stopPropagation();
    setIsSpeaking(true);
    speakWord(activeWord.word);
    setTimeout(() => setIsSpeaking(false), 1200);
  };

  return (
    <div className="relative rounded-2xl border-2 border-[#1A2744] bg-gradient-to-br from-[#0B132B] via-[#0B0F19] to-[#040714] p-5 shadow-xs transition-surface overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1A2744] mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#00B4FF] flex items-center justify-center text-black shadow-glow">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00B4FF]">
              English Daily
            </span>
            <span className="text-zinc-600 mx-1.5">•</span>
            <span className="text-[10px] font-medium text-[#8295B0]">
              {activeWord.isAiGenerated ? 'AI Generated Word' : 'Word of the Day'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleWordFavorite(activeWord.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              isFavorite
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                : 'text-subtle-light dark:text-subtle-dark hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Save to favorite vocabulary'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => toggleWordLearned(activeWord.id)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              isLearned
                ? 'bg-ok text-white shadow-xs'
                : 'border border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark'
            }`}
            title={isLearned ? 'Marked as learned' : 'Mark word as learned'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isLearned ? 'Learned' : 'Learn'}</span>
          </button>
        </div>
      </div>

      {/* Word & Phonetic row */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <BlurText
            key={activeWord.word}
            text={activeWord.word}
            effect="blur"
            animateBy="letters"
            delay={40}
            stepDuration={0.25}
            blur={6}
            distance={15}
            className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans inline-block"
          />

          <button
            type="button"
            onClick={handleSpeak}
            className={`p-1 rounded-full text-[#00B4FF] hover:bg-blue-900/40 transition-transform active:scale-90 ${
              isSpeaking ? 'animate-pulse scale-110 text-blue-300' : ''
            }`}
            title="Listen to pronunciation"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-[#8295B0]">
            {activeWord.phonetic}
          </span>

          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950/70 border border-blue-800/60 text-[#38BDF8]">
            {activeWord.partOfSpeech}
          </span>
        </div>

        {/* Meaning / Definition */}
        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
          {activeWord.definition}
        </p>

        {/* Example in context */}
        <div className="mt-2.5 pl-3 border-l-2 border-[#00B4FF] py-1 bg-[#0A1122]/60 rounded-r-lg">
          <p className="text-xs italic text-blue-100/90">
            "{activeWord.example}"
          </p>
        </div>

        {/* Memory tip / hook toggle */}
        {activeWord.memoryTip && (
          <div className="pt-1">
            {showTip ? (
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-blue-950/60 border border-blue-900/50 text-[11px] text-blue-200">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="font-semibold text-blue-100">Memory Tip:</strong> {activeWord.memoryTip}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTip(true)}
                className="inline-flex items-center gap-1 text-[11px] text-[#00B4FF] hover:text-[#38BDF8] transition-colors"
              >
                <Lightbulb className="w-3 h-3 text-amber-400" />
                <span>Show memory tip</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="mt-4 pt-3 border-t border-[#1A2744] flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#8295B0]">
          {learnedWords.length} word{learnedWords.length === 1 ? '' : 's'} mastered
        </span>

        <Link
          to="/english-daily"
          className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>Explore More Vocabulary</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
