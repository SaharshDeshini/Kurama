import React from 'react';
import { NoteTaker } from '../components/notes/NoteTaker';
import { StickyNote } from 'lucide-react';

export function Notes() {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <StickyNote className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Note Taker & Scratchpad
            </h2>
          </div>
          <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
            Write thoughts, quick tasks, or ideas and put them right on your board.
          </p>
        </div>
      </div>

      <NoteTaker />
    </div>
  );
}
