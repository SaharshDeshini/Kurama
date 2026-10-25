import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getTodayDateString } from '../../utils/dates';
import { isRequirementComplete } from '../../utils/challenges';
import { Sparkles, Flame, Check } from 'lucide-react';

/**
 * Apple-Style Concentric Daily Habit Rings
 * Ring 1 (Outer - Blue #00B4FF): Challenges completed today
 * Ring 2 (Middle - Emerald #10B981): English Daily word reviewed/practiced
 * Ring 3 (Inner - Purple #A855F7): Journal reflection written today
 */
export function DailyHabitRings({ size = 120, strokeWidth = 10, showLegend = true }) {
  const {
    challenges = [],
    challengeEntries = {},
    journal = {},
    learnedWords = [],
    srsReviews = {}
  } = useData();

  const todayStr = getTodayDateString();

  // 1. Challenges Progress
  const challengeStats = useMemo(() => {
    let total = 0;
    let completed = 0;

    for (const c of challenges) {
      if (todayStr < c.startDate) continue;
      const dayEntries = (challengeEntries[c.id] || {})[todayStr] || {};
      for (const req of c.dailyRequirements) {
        total++;
        if (isRequirementComplete(req, dayEntries[req.id])) {
          completed++;
        }
      }
    }

    const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    return { total, completed, percent };
  }, [challenges, challengeEntries, todayStr]);

  // 2. English Daily Progress (learned today or reviewed in SRS today)
  const englishStats = useMemo(() => {
    const hasSrsReviewToday = Object.values(srsReviews).some(r => r.lastReviewedAt?.startsWith(todayStr));
    const isDone = hasSrsReviewToday || learnedWords.length > 0;
    return {
      isDone,
      percent: isDone ? 100 : 0,
      label: isDone ? 'Practiced' : 'Pending'
    };
  }, [srsReviews, learnedWords, todayStr]);

  // 3. Journal Progress
  const journalStats = useMemo(() => {
    const entry = journal[todayStr];
    const isDone = Boolean(entry && entry.text && entry.text.trim().length > 0);
    return {
      isDone,
      percent: isDone ? 100 : 0,
      label: isDone ? 'Written' : 'Pending'
    };
  }, [journal, todayStr]);

  // Overall combined score
  const overallScore = Math.round(
    (challengeStats.percent * 0.5) +
    (englishStats.percent * 0.25) +
    (journalStats.percent * 0.25)
  );

  // SVG Geometry calculations
  const center = size / 2;
  const gap = 2.5;

  // Ring radii
  const r1 = center - strokeWidth / 2 - 2; // Outer
  const r2 = r1 - strokeWidth - gap;      // Middle
  const r3 = r2 - strokeWidth - gap;      // Inner

  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  const offset1 = c1 - (challengeStats.percent / 100) * c1;
  const offset2 = c2 - (englishStats.percent / 100) * c2;
  const offset3 = c3 - (journalStats.percent / 100) * c3;

  return (
    <div className="flex items-center gap-4 select-none">
      {/* SVG Rings */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90 transform"
          style={{ filter: 'drop-shadow(0 0 10px rgba(0, 180, 255, 0.15))' }}
        >
          {/* Track 1 (Challenges) */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            stroke="#0D1E3A"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress 1 */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            stroke="#38BDF8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c1}
            strokeDashoffset={offset1}
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />

          {/* Track 2 (English) */}
          <circle
            cx={center}
            cy={center}
            r={r2}
            stroke="#082820"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress 2 */}
          <circle
            cx={center}
            cy={center}
            r={r2}
            stroke="#10B981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c2}
            strokeDashoffset={offset2}
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />

          {/* Track 3 (Journal) */}
          <circle
            cx={center}
            cy={center}
            r={r3}
            stroke="#26103A"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress 3 */}
          <circle
            cx={center}
            cy={center}
            r={r3}
            stroke="#A855F7"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c3}
            strokeDashoffset={offset3}
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-black font-mono tracking-tight text-white leading-none">
            {overallScore}%
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#38BDF8] mt-0.5">
            Today
          </span>
        </div>
      </div>

      {/* Legend / Breakdown Pills */}
      {showLegend && (
        <div className="space-y-2 min-w-0 flex-1 w-full">
          {/* Challenges Ring */}
          <div className="flex items-center justify-between gap-3 text-xs w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shadow-glow-sm shrink-0" />
              <span className="text-zinc-300 font-medium truncate">Challenges</span>
            </div>
            <span className="font-mono font-bold text-white shrink-0">
              {challengeStats.completed}/{challengeStats.total}
            </span>
          </div>

          {/* English Daily Ring */}
          <div className="flex items-center justify-between gap-3 text-xs w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-sm" />
              <span className="text-zinc-300 font-medium truncate">English Daily</span>
            </div>
            <span className={`font-mono text-[11px] font-bold shrink-0 ${englishStats.isDone ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {englishStats.label}
            </span>
          </div>

          {/* Journal Ring */}
          <div className="flex items-center justify-between gap-3 text-xs w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0 shadow-sm" />
              <span className="text-zinc-300 font-medium truncate">Reflection</span>
            </div>
            <span className={`font-mono text-[11px] font-bold shrink-0 ${journalStats.isDone ? 'text-purple-400' : 'text-zinc-500'}`}>
              {journalStats.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
