import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { fuzzyFilter } from '../../utils/fuzzySearch';
import { Home, Flame, Hash, BookOpen, StickyNote, BookA, Settings as SettingsIcon, Search, CornerDownLeft } from 'lucide-react';

const PAGE_ITEMS = [
  { id: 'page-home', label: 'Home', subtitle: 'Challenges, counters & dashboard', icon: Home, path: '/' },
  { id: 'page-notes', label: 'Notes & Scratchpad', subtitle: 'Quick note taker & board', icon: StickyNote, path: '/notes' },
  { id: 'page-english', label: 'English Daily', subtitle: 'Learn daily vocabulary with audio', icon: BookA, path: '/english-daily' },
  { id: 'page-journal', label: 'Journal', subtitle: 'Daily entries & reflections', icon: BookOpen, path: '/journal' },
  { id: 'page-settings', label: 'Settings', subtitle: 'Backups & preferences', icon: SettingsIcon, action: 'settings' }
];

/**
 * Global fuzzy launcher, toggled with Cmd+K / Ctrl+K from anywhere in the
 * app. Searches pages, challenges, counters, and notes.
 */
export function CommandPalette({ onOpenSettings }) {
  const navigate = useNavigate();
  const { challenges = [], counters = [], notes = [] } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => [
    ...PAGE_ITEMS,
    ...challenges.map(c => ({ id: `chlg-${c.id}`, label: c.name, subtitle: 'Challenge', icon: Flame, path: '/' })),
    ...counters.map(c => ({ id: `ctr-${c.id}`, label: c.name, subtitle: 'Counter', icon: Hash, path: '/' })),
    ...notes.map(n => ({ id: `note-${n.id}`, label: n.title || n.text.slice(0, 30), subtitle: 'Note', icon: StickyNote, path: '/notes' }))
  ], [challenges, counters, notes]);

  const results = useMemo(
    () => fuzzyFilter(items, query, item => item.label).slice(0, 8),
    [items, query]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isToggleCombo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isToggleCombo) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, close]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setActiveIndex(0);
  };

  const handleSelect = (item) => {
    if (item.action === 'settings') {
      onOpenSettings();
    } else {
      navigate(item.path);
    }
    close();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      handleSelect(results[activeIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-surface-dark rounded-xl border border-border-dark shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-dark">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to a page, challenge, or counter..."
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded-md"
          />
          <kbd className="hidden sm:inline text-[10px] font-medium text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-400">No matches</div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    isActive ? 'bg-zinc-100 dark:bg-zinc-800/80' : ''
                  }`}
                >
                  <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-zinc-900 dark:text-zinc-100 font-medium">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-zinc-400 shrink-0">{item.subtitle}</span>
                  {isActive && <CornerDownLeft className="w-3 h-3 text-zinc-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
