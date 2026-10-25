import React from 'react';
import { useData } from '../../context/DataContext';
import { getJournalCorrelationInsight } from '../../utils/insights';
import { Lightbulb } from 'lucide-react';

/**
 * Surfaces the "you complete X% more on days you journal" cross-domain
 * insight on the Today dashboard. Renders nothing until there's enough
 * resolved challenge history on both sides of the comparison.
 */
export function JournalCorrelationInsight() {
  const { challenges, challengeEntries, journal } = useData();
  const insight = getJournalCorrelationInsight(challenges, challengeEntries, journal);

  if (!insight) return null;

  const message = insight.diffPoints === 0
    ? "Journaling doesn't seem to move your completion rate either way yet."
    : insight.diffPoints > 0
      ? `You complete requirements ${insight.diffPoints} percentage points more often on days you journal (${insight.journaledRate}% vs ${insight.plainRate}%).`
      : `You complete requirements ${Math.abs(insight.diffPoints)} percentage points less often on days you journal (${insight.journaledRate}% vs ${insight.plainRate}%).`;

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-violet-200/70 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 text-violet-800 dark:text-violet-300 animate-in fade-in">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="text-xs sm:text-sm">{message}</span>
    </div>
  );
}
