import React from 'react';
import { JournalView } from '../components/journal/JournalView';

export function Journal() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Daily Journal
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Write brief reflections, record highlights, and browse past entries.
        </p>
      </div>

      <JournalView />
    </div>
  );
}
