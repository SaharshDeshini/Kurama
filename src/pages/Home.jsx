import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getTodayDateString, formatDisplayDate, getGreeting } from '../utils/dates';
import { calculateChallengeStats } from '../utils/challenges';
import { CommandBox } from '../components/command/CommandBox';
import { ChallengeModal } from '../components/challenges/ChallengeModal';
import { ChallengeCard } from '../components/challenges/ChallengeCard';
import { ConsistencyChart } from '../components/common/ConsistencyChart';
import { ActivityHeatmap365 } from '../components/common/ActivityHeatmap365';
import { JournalCorrelationInsight } from '../components/common/JournalCorrelationInsight';
import { EnglishDailyWidget } from '../components/english/EnglishDailyWidget';
import { DailyHabitRings } from '../components/common/DailyHabitRings';
import { NoteTaker } from '../components/notes/NoteTaker';
import { EmptyState } from '../components/common/EmptyState';
import {
  Flame,
  Plus,
  StickyNote,
  BookA,
  Zap,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BlurText from '../components/ui/BlurText';
import RubberSegment from '../components/ui/RubberSegment';

export function Home() {
  const {
    challenges = [],
    challengeEntries = {},
    journal = {},
    notes = [],
    learnedWords = [],
    settings = {},
    currentUser
  } = useData();

  const [chartView, setChartView] = useState('365'); // '365' | '14'

  const todayStr = getTodayDateString();
  const dateMeta = formatDisplayDate(todayStr);
  const greeting = getGreeting();

  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [challengeTemplate, setChallengeTemplate] = useState(null);

  // Compute active streak across all challenges
  const activeStreak = useMemo(() => {
    if (!challenges.length) return 0;
    let maxStreak = 0;
    for (const c of challenges) {
      const stats = calculateChallengeStats(c, challengeEntries[c.id] || {}, c.frozenDates || []);
      if (stats.currentStreak > maxStreak) {
        maxStreak = stats.currentStreak;
      }
    }
    return maxStreak;
  }, [challenges, challengeEntries]);

  const sortedChallenges = useMemo(() => {
    return [...challenges].sort((a, b) => {
      if (a.id === settings.primaryChallengeId) return -1;
      if (b.id === settings.primaryChallengeId) return 1;
      return 0;
    });
  }, [challenges, settings.primaryChallengeId]);

  const userName = settings?.userName?.trim()
    || (currentUser?.email ? currentUser.email.split('@')[0] : '')
    || 'Traveler';

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8 animate-in fade-in pb-10">
      {/* 1. Header Bar: Date */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1A2744]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8295B0]">
          <span className="text-zinc-200">{dateMeta.weekday}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B4FF] shadow-glow" />
          <span>{dateMeta.full}</span>
        </div>
      </div>

      {/* 2. Hero Greeting */}
      <div className="space-y-1.5 pt-1">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
          {greeting},{' '}
          <span className="text-[#38BDF8]">
            {userName}
          </span>
          .
        </h1>
        <BlurText
          text={settings?.motto ? `"${settings.motto}"` : '"Discipline equals freedom. Small steps every single day."'}
          effect="blur"
          animateBy="words"
          direction="top"
          delay={70}
          stepDuration={0.3}
          blur={6}
          distance={18}
          className="text-xs sm:text-sm text-[#8295B0] italic font-medium"
        />
      </div>

      {/* 3. Daily Executive Dashboard Card (Apple-Style Concentric Habit Rings + 4 Stat Tiles) */}
      <div className="rounded-2xl border border-[#1A2744] bg-[#070B14]/85 backdrop-blur-md p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          {/* Left: Concentric Daily Habit Rings */}
          <div className="md:col-span-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8295B0]">
                Daily Habit Rings
              </span>
              <span className="text-[11px] font-bold text-[#38BDF8]">Today</span>
            </div>
            <DailyHabitRings size={120} strokeWidth={9} showLegend={true} />
          </div>

          {/* Right: 4 Balanced Stat Tiles (2x2 Grid) */}
          <div className="md:col-span-6 grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Streak */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-[#1A2744] bg-[#0A101F]/80 hover:border-[#38BDF8]/40 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded-md bg-[#38BDF8]/10 text-[#38BDF8]">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="text-[10px] uppercase font-bold text-[#8295B0]">Streak</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white">{activeStreak} <span className="text-xs font-normal text-zinc-400">Days</span></div>
            </div>

            {/* Active Challenges */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-[#1A2744] bg-[#0A101F]/80 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-[#8295B0]">Challenges</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white">{challenges.length} <span className="text-xs font-normal text-zinc-400">Active</span></div>
            </div>

            {/* Vocabulary Mastered */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-[#1A2744] bg-[#0A101F]/80 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded-md bg-purple-500/10 text-purple-400">
                  <BookA className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-[#8295B0]">Vocab</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white">{learnedWords.length} <span className="text-xs font-normal text-zinc-400">Learned</span></div>
            </div>

            {/* Notes Recorded */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-[#1A2744] bg-[#0A101F]/80 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                  <StickyNote className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-[#8295B0]">Notes</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white">{notes.length} <span className="text-xs font-normal text-zinc-400">Saved</span></div>
            </div>
          </div>
        </div>
      </div>


      {/* 4. Consistency Analytics Section */}
      {challenges.length > 0 && (
        <div className="rounded-2xl border border-[#162744] bg-[#070B14]/90 backdrop-blur-md p-3.5 sm:p-5 shadow-xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#38BDF8] flex items-center justify-center text-black shadow-glow-sm">
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                  Consistency Matrix
                </h3>
                <p className="text-[11px] text-[#8295B0]">
                  Track habit discipline and execution streaks
                </p>
              </div>
            </div>

            <div className="self-start sm:self-auto">
              <RubberSegment
                items={[
                  { value: '365', label: 'Matrix Grid' },
                  { value: '14', label: '14D Velocity' }
                ]}
                value={chartView}
                onChange={(val) => setChartView(val)}
                trackColor="#060A14"
                thumbColor="#38BDF8"
                textColor="#8295B0"
                activeTextColor="#030712"
                size="sm"
                radius={8}
                inset={2}
              />
            </div>
          </div>

          <div className="w-full min-w-0">
            {chartView === '365' ? (
              <ActivityHeatmap365
                challenges={challenges}
                challengeEntries={challengeEntries}
                journal={journal}
              />
            ) : (
              <ConsistencyChart challenges={challenges} challengeEntries={challengeEntries} />
            )}
          </div>
        </div>
      )}

      {/* 5. Journal Correlation Insight */}
      <JournalCorrelationInsight />

      {/* 6. English Daily — Word of the Day Widget */}
      <EnglishDailyWidget />

      {/* 7. Active Challenges Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8295B0] whitespace-nowrap">
              Active Challenges
            </h3>
            <span className="text-[11px] font-bold font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded-full border border-[#38BDF8]/20 shrink-0">
              {sortedChallenges.length}
            </span>
          </div>
          <button
            onClick={() => { setChallengeTemplate(null); setChallengeModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#38BDF8] text-black hover:bg-[#7DD3FC] shadow-glow transition-all active:scale-[0.98] shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Challenge</span>
          </button>
        </div>

        {sortedChallenges.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Start your first challenge"
            description="Set a day target, or just keep going with no end date — add tick or counter requirements to track each day."
            actionText="+ Create Challenge"
            onAction={() => setChallengeModalOpen(true)}
          />
        ) : (
          <div className="space-y-6 w-full">
            {sortedChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </div>

      {/* 8. Quick Notes & Scratchpad */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8295B0] whitespace-nowrap truncate">
              <span className="sm:hidden">Quick Notes</span>
              <span className="hidden sm:inline">Quick Notes & Scratchpad</span>
            </h3>
            <span className="text-[11px] font-bold font-mono text-zinc-300 bg-[#162744] px-2 py-0.5 rounded-full shrink-0">
              {notes.length}
            </span>
          </div>
          <Link
            to="/notes"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#38BDF8] hover:text-[#7DD3FC] transition-colors shrink-0 whitespace-nowrap"
          >
            <span className="hidden sm:inline">Open </span>
            <span>Full Board</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <NoteTaker isCompact={true} />
      </div>

      {/* Command Box */}
      <CommandBox
        onOpenChallengeModal={(template) => {
          setChallengeTemplate(template || null);
          setChallengeModalOpen(true);
        }}
      />

      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={challengeModalOpen}
        onClose={() => { setChallengeModalOpen(false); setChallengeTemplate(null); }}
        initialTemplate={challengeTemplate}
      />
    </div>
  );
}
