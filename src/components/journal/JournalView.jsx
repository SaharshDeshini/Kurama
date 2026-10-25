import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { getTodayDateString, addDaysToDateString, formatDisplayDate } from '../../utils/dates';
import { ChevronLeft, ChevronRight, Search, Calendar, Check, BookOpen } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

export function JournalView() {
  const { journal, saveJournalEntry } = useData();
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePrevDay = () => {
    setSelectedDate(prev => addDaysToDateString(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDaysToDateString(prev, 1));
  };

  const dateMeta = formatDisplayDate(selectedDate);

  // Search filter across all journal entries
  const allEntries = Object.entries(journal)
    .filter(([_, data]) => data?.content?.trim())
    .map(([date, data]) => ({ date, content: data.content, updatedAt: data.updatedAt }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredEntries = searchQuery.trim()
    ? allEntries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()) || e.date.includes(searchQuery))
    : allEntries;

  return (
    <div className="space-y-6">
      {/* Editor Card */}
      <div className="bg-surface-dark rounded-xl border border-border-dark p-5 transition-surface">
        {/* Date navigation header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                ({dateMeta.weekday})
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
            >
              Jump to Today
            </button>
          )}
        </div>

        {/* Reflection prompt + editor. Keyed by date so switching days remounts the
            editor with a fresh initial value instead of syncing via an effect. */}
        <JournalEntryEditor
          key={selectedDate}
          isToday={selectedDate === todayStr}
          dateMeta={dateMeta}
          initialContent={journal[selectedDate]?.content || ''}
          onSave={(content) => saveJournalEntry(selectedDate, content)}
        />
      </div>

      {/* Historical Entries & Search */}
      <div className="bg-surface-dark rounded-xl border border-border-dark p-5 transition-surface">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Past Journal Entries
            </h3>
          </div>

          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        {filteredEntries.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredEntries.map(entry => (
              <div
                key={entry.date}
                onClick={() => setSelectedDate(entry.date)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDate === entry.date
                    ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-900/60'
                    : 'border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  <span>{formatDisplayDate(entry.date).full || entry.date}</span>
                  <span className="text-[10px] font-mono text-zinc-400 font-normal">
                    {formatDisplayDate(entry.date).weekday}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={searchQuery ? 'No matching journal entries' : 'No journal entries yet'}
            description={searchQuery ? 'Try another keyword.' : 'Write your first reflection above.'}
          />
        )}
      </div>
    </div>
  );
}

function JournalEntryEditor({ isToday, dateMeta, initialContent, onSave }) {
  const [content, setContent] = useState(initialContent);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(content);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <>
      <div className="mb-2">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          What happened {isToday ? 'today' : `on ${dateMeta.monthDay}`}?
        </h3>
      </div>

      <textarea
        rows="7"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setIsSaved(false);
        }}
        placeholder="Write your thoughts, milestones, or reflections for this date..."
        className="w-full p-3 text-xs sm:text-sm rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-y leading-relaxed font-sans"
      />

      <div className="flex items-center justify-between pt-3 mt-1">
        <div className="text-[11px] text-zinc-400 font-mono">
          {content.trim() ? `${content.trim().split(/\s+/).length} words` : 'Empty entry'}
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            Save Entry
          </button>
        </div>
      </div>
    </>
  );
}
