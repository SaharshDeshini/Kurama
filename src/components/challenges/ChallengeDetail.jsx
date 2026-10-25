import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { calculateChallengeStats, DayStatus, getChallengeDayStatus, getChallengeDates, getMilestoneCrossed, isRequirementComplete, FREEZE_EARN_INTERVAL } from '../../utils/challenges';
import { getChallengeProgression } from '../../utils/challengeLevels';
import { triggerCelebration } from '../../utils/celebration';
import { getTimeOfDayDistribution, flattenCompletionTimestamps } from '../../utils/statistics';
import { getTodayDateString, formatDisplayDate } from '../../utils/dates';
import {
  ArrowLeft,
  Flame,
  CheckCircle,
  XCircle,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  Snowflake,
  PartyPopper,
  Check,
  Clock,
  Award,
  Zap,
  Lock,
  Sparkles
} from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TimeOfDayHeatmap } from '../common/TimeOfDayHeatmap';
import { parseISO, format, isSameDay } from 'date-fns';

export function ChallengeDetail({ challenge, onBack, onEdit }) {
  const {
    challengeEntries,
    toggleChallengeRequirement,
    adjustRequirementProgress,
    deleteChallenge,
    applyStreakFreeze,
    challengeDayNotes,
    saveChallengeDayNote,
    challengeCompletionTimes
  } = useData();
  const [showMenu, setShowMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState(null);

  const frozenDates = challenge.frozenDates || [];
  const stats = calculateChallengeStats(challenge, challengeEntries[challenge.id], frozenDates);
  const entriesMap = challengeEntries[challenge.id] || {};
  const dayNotes = challengeDayNotes?.[challenge.id] || {};
  const progression = getChallengeProgression(stats);

  // Auto-dismiss the milestone celebration a few seconds after it appears.
  useEffect(() => {
    if (celebrationMilestone === null) return;
    const timer = setTimeout(() => setCelebrationMilestone(null), 4000);
    return () => clearTimeout(timer);
  }, [celebrationMilestone]);

  const handleToggleRequirement = (reqId) => {
    // Predict the resulting streak from this toggle (before the async context
    // update lands) so we can detect a milestone crossing synchronously.
    const dayEntries = entriesMap[selectedDate] || {};
    const nextEntriesMap = {
      ...entriesMap,
      [selectedDate]: { ...dayEntries, [reqId]: !dayEntries[reqId] }
    };
    const nextStats = calculateChallengeStats(challenge, nextEntriesMap, frozenDates);
    const milestone = getMilestoneCrossed(stats.currentStreak, nextStats.currentStreak);
    if (milestone) {
      setCelebrationMilestone(milestone);
      triggerCelebration();
    } else if (nextStats.successfulDays > stats.successfulDays) {
      triggerCelebration();
    }
    toggleChallengeRequirement(challenge.id, reqId, selectedDate);
  };

  const handleUseFreeze = () => {
    applyStreakFreeze(challenge.id, selectedDate);
  };

  const handleDelete = () => {
    deleteChallenge(challenge.id);
    onBack();
  };

  const selectedDayStatus = getChallengeDayStatus(challenge, entriesMap[selectedDate] || {}, selectedDate, frozenDates);
  const dates = getChallengeDates(challenge);

  const freezeLabel = `${stats.freezesAvailable} streak freeze${stats.freezesAvailable === 1 ? '' : 's'} available`;
  const freezeDetail = `1 earned per ${FREEZE_EARN_INTERVAL} successful days${stats.frozenDays > 0 ? `, ${stats.frozenDays} used` : ''}`;
  const freezeSummary = `${freezeLabel} (${freezeDetail})`;

  const timeOfDayData = getTimeOfDayDistribution(flattenCompletionTimestamps(challengeCompletionTimes, challenge.id));

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Milestone celebration toast */}
      {celebrationMilestone !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl animate-in fade-in zoom-in-95">
          <PartyPopper className="w-4 h-4 text-orange-400 dark:text-orange-500 shrink-0" />
          <span className="text-sm font-semibold">{celebrationMilestone}-day streak! Keep going.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Challenges
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-36 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618] shadow-lg z-10">
              <button
                onClick={() => { setShowMenu(false); setIsDeleteOpen(true); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl border-2 border-[#1A2744] bg-[#0A101F]">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-border-dark ${progression.currentRank.badgeBg} ${progression.currentRank.color} shadow-xs`}>
            <span>{progression.currentRank.icon}</span>
            <span>{progression.currentRank.title} (Level {progression.currentRank.level})</span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
            <Zap className="w-3.5 h-3.5 fill-current" />
            {progression.totalXp.toLocaleString()} Total XP
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 mb-2">
          <Flame className="w-6 h-6 text-amber-400" />
          {challenge.name}
        </h2>
        
        <div className="text-sm font-medium text-[#8295B0] mb-3 font-mono tabular-nums">
          Day {stats.currentDayNumber} {stats.isOpenEnded ? '• Ongoing Challenge' : `/ ${stats.totalDays}`}
        </div>
        
        <ProgressBar value={stats.currentDayNumber} max={stats.totalDays} size="md" />

        {/* Milestone Questline Trail */}
        <div className="mt-4 p-3 rounded-xl border border-[#1A2744] bg-[#070D19] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#00B4FF]" />
              Milestone Progression Trail
            </span>
            <span className="text-[11px] text-[#8295B0] font-mono">
              {progression.nextRank
                ? `${progression.progressToNextRank}% to ${progression.nextRank.title} (${progression.daysToNextRank}d to unlock)`
                : 'Highest Rank Ascended 👑'}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
            {progression.milestones.map((m, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border text-center transition-all ${
                  m.isUnlocked
                    ? 'border-[#00B4FF] bg-blue-950/60 text-[#00B4FF] shadow-glow-sm'
                    : m.isCurrent
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/50 animate-pulse'
                      : 'border-border-dark bg-[#0A101F]/60 text-zinc-600'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider font-bold mb-0.5 flex items-center justify-center gap-1">
                  {m.isUnlocked ? <Check className="w-3 h-3" /> : m.isCurrent ? <Flame className="w-3 h-3 text-amber-400" /> : <Lock className="w-2.5 h-2.5" />}
                  {m.title}
                </div>
                <div className="text-xs font-mono font-bold">
                  {m.day}d
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3 rounded-xl bg-ember/10 border-2 border-ember/20">
            <div className="text-xs text-ember font-medium mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Current Streak
            </div>
            <div className="text-xl font-bold text-ember font-mono tabular-nums">{stats.currentStreak}</div>
          </div>
          <div className="p-3 rounded-xl bg-surfaceHover-light dark:bg-surfaceHover-dark border-2 border-border-light dark:border-border-dark">
            <div className="text-xs text-subtle-light dark:text-subtle-dark font-medium mb-1">Best Streak</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">{stats.bestStreak}</div>
          </div>
          <div className="p-3 rounded-xl bg-ok/10 border-2 border-ok/20">
            <div className="text-xs text-ok-dark dark:text-ok font-medium mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Successful
            </div>
            <div className="text-xl font-bold text-ok-dark dark:text-ok font-mono tabular-nums">{stats.successfulDays}</div>
          </div>
          <div className="p-3 rounded-xl bg-miss/10 border-2 border-miss/20">
            <div className="text-xs text-miss font-medium mb-1 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </div>
            <div className="text-xl font-bold text-miss font-mono tabular-nums">{stats.failedDays}</div>
          </div>
        </div>

        {/* Streak insurance */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-sky-600 dark:text-sky-400">
          <Snowflake className="w-3.5 h-3.5" />
          <span>{freezeSummary}</span>
        </div>

        {/* Time-of-day heatmap */}
        <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              When you complete this
            </h4>
          </div>
          <TimeOfDayHeatmap data={timeOfDayData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Requirements Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {isSameDay(parseISO(selectedDate), parseISO(getTodayDateString())) ? "Today's Requirements" : formatDisplayDate(selectedDate).full}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {selectedDayStatus}
            </span>
          </div>

          <div className="space-y-2">
            {challenge.dailyRequirements.map((req) => {
              const rawValue = entriesMap[selectedDate]?.[req.id];
              const isChecked = isRequirementComplete(req, rawValue);
              return (
                <div
                  key={req.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isChecked
                      ? 'border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618]'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {req.type === 'counter' ? (
                      <div className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center ${
                        isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-600 text-transparent'
                      }`}>
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleRequirement(req.id)}
                        className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-600 text-transparent hover:border-emerald-500 dark:hover:border-emerald-500'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                    )}
                    <span className={`text-sm truncate ${isChecked ? 'text-zinc-500 dark:text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100 font-medium'}`}>
                      {req.title}
                    </span>
                  </div>
                  {req.type === 'counter' ? (
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <button
                        type="button"
                        onClick={() => adjustRequirementProgress(challenge.id, req.id, -1, selectedDate)}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                      >
                        <span className="text-sm leading-none">−</span>
                      </button>
                      <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                        {Number(rawValue) || 0}/{req.target} {req.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustRequirementProgress(challenge.id, req.id, 1, selectedDate)}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white active:scale-95 transition-all"
                      >
                        <span className="text-sm leading-none">+</span>
                      </button>
                    </div>
                  ) : (req.target || req.unit) && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 ml-3 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                      {req.target} {req.unit}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDayStatus === DayStatus.FROZEN && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-sky-200/60 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 text-xs text-sky-700 dark:text-sky-300">
              <Snowflake className="w-4 h-4 shrink-0" />
              <span>This day is protected by a streak freeze — it doesn't count as a break.</span>
            </div>
          )}

          {selectedDayStatus === DayStatus.FAILED && (
            <div className="space-y-3">
              {stats.freezesAvailable > 0 && (
                <button
                  type="button"
                  onClick={handleUseFreeze}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  Use a streak freeze on this day
                </button>
              )}
              <DayNoteEditor
                key={selectedDate}
                initialNote={dayNotes[selectedDate] || ''}
                onSave={(note) => saveChallengeDayNote(challenge.id, selectedDate, note)}
              />
            </div>
          )}
        </div>

        {/* History Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Challenge History
            </h3>
          </div>
          
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618]">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                  {d}
                </div>
              ))}
              
              {/* Padding for first day of week. Assuming simple flow for now, but a real calendar would pad based on start date's day of week. To keep it simple, we just flow the dates linearly. */}
              {dates.map((dateStr, idx) => {
                const status = getChallengeDayStatus(challenge, entriesMap[dateStr] || {}, dateStr, frozenDates);
                let bgColor = 'bg-border-light dark:bg-border-dark';
                let textColor = 'text-subtle-light dark:text-subtle-dark';

                if (status === DayStatus.SUCCESSFUL) {
                  bgColor = 'bg-ok';
                  textColor = 'text-white';
                } else if (status === DayStatus.FROZEN) {
                  bgColor = 'bg-sky-400';
                  textColor = 'text-white';
                } else if (status === DayStatus.FAILED) {
                  bgColor = 'bg-miss/80';
                  textColor = 'text-white';
                } else if (status === DayStatus.IN_PROGRESS) {
                  bgColor = 'bg-ember';
                  textColor = 'text-white ring-2 ring-ember ring-offset-2 dark:ring-offset-surface-dark';
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${bgColor} ${textColor} ${selectedDate === dateStr ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-[#141618]' : ''} hover:scale-105`}
                    title={`${dateStr}: ${status}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Challenge"
        message={`Are you sure you want to delete "${challenge.name}"? All progress and history for this challenge will be permanently erased.`}
        confirmText="Delete Challenge"
        isDestructive={true}
      />
    </div>
  );
}

// Keyed by selectedDate from the parent so switching days remounts this with a
// fresh initial note instead of syncing via an effect (same pattern as JournalEntryEditor).
function DayNoteEditor({ initialNote, onSave }) {
  const [note, setNote] = useState(initialNote);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(note);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
        What got in the way? (optional)
      </label>
      <textarea
        rows="2"
        value={note}
        onChange={(e) => { setNote(e.target.value); setIsSaved(false); }}
        placeholder="e.g., Was traveling, ran out of time in the evening..."
        className="w-full p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-y"
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        {isSaved && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 text-[11px] font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
        >
          Save Note
        </button>
      </div>
    </div>
  );
}
