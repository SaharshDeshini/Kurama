import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { parseCommand } from '../../utils/commandParser';
import { Sparkles, ArrowRight, Check, AlertCircle } from 'lucide-react';

export function CommandBox({ onOpenChallengeModal, onOpenCounterModal }) {
  const {
    challenges, counters, challengeEntries, journal,
    toggleChallengeRequirement, adjustCounterValue, saveJournalEntry, addNote
  } = useData();
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [fallbackOptions, setFallbackOptions] = useState(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    setFeedback(null);
    setFallbackOptions(null);

    const result = parseCommand(input, { challenges, counters, challengeEntries });

    if (result.recognized) {
      if (result.type === 'COMPLETE_REQUIREMENT') {
        toggleChallengeRequirement(result.challengeId, result.requirementId, result.dateStr);
      } else if (result.type === 'UPDATE_COUNTER') {
        adjustCounterValue(result.counterId, result.amount, result.dateStr);
      } else if (result.type === 'CREATE_CHALLENGE') {
        if (onOpenChallengeModal) onOpenChallengeModal();
      } else if (result.type === 'CREATE_CHALLENGE_TEMPLATE') {
        if (onOpenChallengeModal) onOpenChallengeModal(result.template);
      } else if (result.type === 'JOURNAL_ENTRY') {
        const existing = journal[result.dateStr]?.content || '';
        const nextContent = existing ? `${existing}\n${result.text}` : result.text;
        saveJournalEntry(result.dateStr, nextContent);
      } else if (result.type === 'NOTE_ENTRY') {
        addNote({ text: result.text, tag: 'Note' });
      }

      setFeedback({ type: 'success', text: result.feedback });
      setInput('');
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFallbackOptions({
        rawText: result.rawText,
        suggestions: result.suggestions
      });
    }
  };

  const handleSuggestionClick = (type) => {
    if (type === 'COMPLETE_REQUIREMENT') {
      // Open challenge modal or scroll to requirements
    } else if (type === 'UPDATE_COUNTER') {
      if (onOpenCounterModal) onOpenCounterModal();
    }
    setFallbackOptions(null);
    setInput('');
  };

  return (
    <div className="w-full bg-surface-dark rounded-xl border border-border-dark p-3.5 transition-surface">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="pl-1 pr-2.5 text-zinc-400 dark:text-zinc-500 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (fallbackOptions) setFallbackOptions(null);
          }}
          placeholder="e.g., +2 pushups, journal: tired today, start 75hard..."
          className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded-md"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="ml-2 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-[0.98] shrink-0 flex items-center gap-1"
        >
          <span>Run</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </form>

      {/* Instant Feedback Message */}
      {feedback && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Fallback Disambiguation Options */}
      {fallbackOptions && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>I'm not sure what you mean. What would you like to do?</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fallbackOptions.suggestions.map((sug) => (
              <button
                key={sug.type}
                type="button"
                onClick={() => handleSuggestionClick(sug.type)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
