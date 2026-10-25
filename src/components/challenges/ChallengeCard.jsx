import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { calculateChallengeStats, getChallengeDayStatus, getRecentDayStatuses, isRequirementComplete, DayStatus } from '../../utils/challenges';
import { getChallengeProgression } from '../../utils/challengeLevels';
import { triggerCelebration } from '../../utils/celebration';
import { getTodayDateString } from '../../utils/dates';
import { ChallengeDetail } from './ChallengeDetail';
import { ConfirmDialog } from '../common/ConfirmDialog';
import SpringCheck from '../ui/SpringCheck';
import SloshGauge from '../ui/SloshGauge';
import CometDial from '../ui/CometDial';
import {
  Flame,
  CheckCircle,
  Minus,
  Plus,
  Trash2,
  History,
  Star,
  Check,
  Award,
  ChevronRight,
  Zap,
  Lock,
  Layers,
  Droplets
} from 'lucide-react';

const STRIP_COLORS = {
  [DayStatus.SUCCESSFUL]: 'bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.7)]',
  [DayStatus.FROZEN]: 'bg-sky-400',
  [DayStatus.FAILED]: 'bg-red-500/70',
  [DayStatus.IN_PROGRESS]: 'bg-amber-400',
  [DayStatus.FUTURE]: 'bg-[#141E33]',
  'pre-start': 'bg-transparent border border-[#16233B]'
};

export function ChallengeCard({ challenge }) {
  const {
    challengeEntries,
    toggleChallengeRequirement,
    adjustRequirementProgress,
    setRequirementProgress,
    deleteChallenge,
    settings,
    setPrimaryChallenge
  } = useData();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [dialMode, setDialMode] = useState('today'); // 'today' | 'journey'

  if (isExpanded) {
    return <ChallengeDetail challenge={challenge} onBack={() => setIsExpanded(false)} />;
  }

  const todayStr = getTodayDateString();
  const frozenDates = challenge.frozenDates || [];
  const stats = calculateChallengeStats(challenge, challengeEntries[challenge.id], frozenDates);
  const entriesMap = challengeEntries[challenge.id] || {};
  const todayEntries = entriesMap[todayStr] || {};
  const strip = getRecentDayStatuses(challenge, entriesMap, frozenDates, 14);
  const isPrimary = settings.primaryChallengeId === challenge.id;
  const todayStatus = getChallengeDayStatus(challenge, todayEntries, todayStr, frozenDates);

  const completedReqsCount = challenge.dailyRequirements.filter(r => isRequirementComplete(r, todayEntries[r.id])).length;
  const totalReqsCount = challenge.dailyRequirements.length;
  const todayProgressPct = totalReqsCount > 0 ? Math.round((completedReqsCount / totalReqsCount) * 100) : 100;
  const journeyProgressPct = stats.isOpenEnded
    ? todayProgressPct
    : (stats.totalDays > 0 ? Math.min(100, Math.round((stats.currentDayNumber / stats.totalDays) * 100)) : 100);

  // RPG Level Progression reacts directly and immediately to today's active task progress
  const progression = getChallengeProgression(stats, completedReqsCount, todayStatus === DayStatus.SUCCESSFUL);

  const activeDialValue = dialMode === 'today' ? todayProgressPct : journeyProgressPct;

  const parseTargetNumber = (val) => {
    if (typeof val === 'number') return val > 0 ? val : 1;
    const num = parseFloat(String(val || '').replace(/[^\d.]/g, ''));
    return (!isNaN(num) && num > 0) ? num : 1;
  };

  const handleToggleRequirementWithCelebration = (reqId) => {
    const wasComplete = isRequirementComplete(
      challenge.dailyRequirements.find(r => r.id === reqId),
      todayEntries[reqId]
    );

    if (!wasComplete) {
      const allOthersComplete = challenge.dailyRequirements
        .filter(r => r.id !== reqId)
        .every(r => isRequirementComplete(r, todayEntries[r.id]));

      if (allOthersComplete) {
        triggerCelebration();
      }
    }

    toggleChallengeRequirement(challenge.id, reqId, todayStr);
  };

  const handleAdjustCounterWithCelebration = (reqId, delta) => {
    const req = challenge.dailyRequirements.find(r => r.id === reqId);
    const target = parseTargetNumber(req?.target);
    const current = Number(todayEntries[reqId]) || 0;
    const nextVal = Math.max(0, current + delta);

    const willBeComplete = nextVal >= target;
    const wasComplete = current >= target;

    if (!wasComplete && willBeComplete) {
      const allOthersComplete = challenge.dailyRequirements
        .filter(r => r.id !== reqId)
        .every(r => isRequirementComplete(r, todayEntries[r.id]));

      if (allOthersComplete) {
        triggerCelebration();
      }
    }

    adjustRequirementProgress(challenge.id, reqId, delta, todayStr);
  };

  const handleSetCounterWithCelebration = (reqId, targetVal) => {
    const req = challenge.dailyRequirements.find(r => r.id === reqId);
    const target = parseTargetNumber(req?.target);
    const current = Number(todayEntries[reqId]) || 0;
    const nextVal = Math.max(0, targetVal);

    const willBeComplete = nextVal >= target;
    const wasComplete = current >= target;

    if (!wasComplete && willBeComplete) {
      const allOthersComplete = challenge.dailyRequirements
        .filter(r => r.id !== reqId)
        .every(r => isRequirementComplete(r, todayEntries[r.id]));

      if (allOthersComplete) {
        triggerCelebration();
      }
    }

    setRequirementProgress(challenge.id, reqId, nextVal, todayStr);
  };

  return (
    <div className={`w-full p-4 sm:p-7 rounded-2xl sm:rounded-3xl border-2 bg-gradient-to-b from-[#090F1E] via-[#070B16] to-[#040811] transition-all relative overflow-hidden flex flex-col justify-between shadow-2xl ${
      isPrimary
        ? 'border-[#38BDF8] shadow-[0_0_36px_rgba(56,189,248,0.22)] ring-1 ring-[#38BDF8]/40'
        : 'border-[#15233C] hover:border-[#1E3355]'
    }`}>
      {/* Radiant ambient glow */}
      <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-br from-[#38BDF8]/12 via-[#0EA5E9]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Title, Badges, Level, Day & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-5 border-b border-[#15233C]/80 relative z-10">
        <div className="min-w-0 flex-1">
          {/* RPG Badges & Level */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border border-border-dark ${progression.currentRank.badgeBg} ${progression.currentRank.color} shadow-sm`}>
              <span>{progression.currentRank.icon}</span>
              <span>{progression.currentRank.title} (Lv. {progression.currentRank.level})</span>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-full">
              <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current text-amber-400" />
              {progression.totalXp.toLocaleString()} XP
            </span>

            {progression.nextRank && (
              <span className="text-[10px] sm:text-[11px] font-mono text-[#8295B0] bg-[#0A1222] border border-[#162744] px-2 py-0.5 rounded-full hidden sm:inline-block">
                {progression.progressToNextRank}% to {progression.nextRank.title}
              </span>
            )}

            {isPrimary && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 shadow-glow-sm">
                Focus
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 truncate">
            <span className="truncate">{challenge.name}</span>
          </h3>

          <div className="text-xs text-[#8295B0] mt-1 font-mono tabular-nums flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span>
              {stats.isOpenEnded
                ? `Day ${stats.currentDayNumber} • Continuous Discipline`
                : `Day ${stats.currentDayNumber} of ${stats.totalDays} Total Days`}
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-[#38BDF8] font-bold">
              {completedReqsCount}/{totalReqsCount} Done Today
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setPrimaryChallenge(isPrimary ? null : challenge.id)}
            title={isPrimary ? 'Unset focus' : 'Set as primary focus challenge'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isPrimary
                ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#38BDF8] shadow-glow-sm'
                : 'border-border-dark text-[#8295B0] hover:text-amber-400 hover:border-amber-500/40 hover:bg-[#0A1222]'
            }`}
          >
            <Star className="w-4 h-4" fill={isPrimary ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="p-2 rounded-xl border border-border-dark text-[#8295B0] hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/20 transition-all cursor-pointer"
            title="Delete challenge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Command Console (Balanced 2-Wing Architecture with Mobile Stack) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-stretch relative z-10 flex-1">
        {/* Left Wing / Reactor Core & Telemetry Deck */}
        <div className="md:col-span-5 lg:col-span-4 xl:col-span-4 rounded-2xl border border-[#15233C] bg-[#070D19]/85 p-4 sm:p-5 flex flex-col justify-between items-center text-center relative overflow-hidden">
          {/* Top Dial Switcher */}
          <div className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-[#8295B0] tracking-wider mb-2">
            <span className="flex items-center gap-1.5 text-[#38BDF8]">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              Reactor Hub
            </span>
            <button
              type="button"
              onClick={() => setDialMode(dialMode === 'today' ? 'journey' : 'today')}
              className="px-2 py-0.5 rounded-md bg-[#101B2E] border border-[#162744] hover:text-white transition-colors text-[9px] font-mono text-[#8295B0] cursor-pointer"
              title="Toggle Dial Display: Today vs Full Journey"
            >
              {dialMode === 'today' ? 'Today' : 'Journey'}
            </button>
          </div>

          {/* Sexy CometDial */}
          <div className="my-2 sm:my-3 shrink-0 flex items-center justify-center relative">
            <CometDial
              value={activeDialValue}
              defaultValue={activeDialValue}
              min={0}
              max={100}
              step={1}
              unit="%"
              label={dialMode === 'today' ? "Today's Directives Progress" : "Full Journey Completion"}
              accent={todayStatus === DayStatus.SUCCESSFUL ? "#10B981" : "#38BDF8"}
              ink="#16253F"
              size={136}
              sweep={290}
              thickness={5}
              speed={35}
              momentum={1}
              tapBounce={0.2}
              flickBounce={0.15}
              cometReach={150}
              cometWidth={9}
            />
          </div>

          <div className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            {dialMode === 'today' ? (
              <span className={todayStatus === DayStatus.SUCCESSFUL ? 'text-emerald-400 font-bold' : 'text-[#38BDF8]'}>
                {todayStatus === DayStatus.SUCCESSFUL ? '✓ 100% Completed Today!' : `Today: ${completedReqsCount}/${totalReqsCount} Directives (${todayProgressPct}%)`}
              </span>
            ) : (
              <span className="text-amber-400 font-bold">
                Day {stats.currentDayNumber} of {stats.totalDays || '∞'} ({journeyProgressPct}%)
              </span>
            )}
          </div>

          {/* Key Metric Tiles */}
          <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5 text-left mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#0A1222] border border-[#15233C]">
              <div className="text-[10px] uppercase font-bold text-[#8295B0] flex items-center gap-1 mb-0.5">
                <Flame className="w-3 h-3 text-amber-400 fill-current" />
                Streak
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-amber-300">{stats.currentStreak} Days</div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-[#0A1222] border border-[#15233C]">
              <div className="text-[10px] uppercase font-bold text-[#8295B0] flex items-center gap-1 mb-0.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Completed
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-emerald-300">{stats.successfulDays} Days</div>
            </div>
          </div>

          {/* 14-Day Pulse Matrix */}
          <div className="w-full pt-2 border-t border-[#15233C]/70">
            <div className="text-[9px] uppercase font-mono text-[#8295B0] text-left mb-1.5 flex items-center justify-between">
              <span>14-Day Consistency Trail</span>
              <span className="text-zinc-500">{stats.successfulDays} total days</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-hidden">
              {strip.map(({ dateStr, status }) => (
                <div
                  key={dateStr}
                  title={`${dateStr}: ${status}`}
                  className={`flex-1 h-2 rounded-full transition-transform hover:scale-125 ${STRIP_COLORS[status] || 'bg-[#141E33]'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Wing / Today's Directives & Water Station */}
        <div className="md:col-span-7 lg:col-span-8 xl:col-span-8 flex flex-col justify-between space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8295B0] pb-1">
            <span className="flex items-center gap-2 text-white text-sm">
              <Layers className="w-4 h-4 text-[#38BDF8]" />
              Today's Directives
            </span>
            <span className={`text-xs font-mono font-bold px-2.5 sm:px-3 py-1 rounded-xl border ${
              todayStatus === DayStatus.SUCCESSFUL
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-glow-sm'
                : 'bg-[#060A14] border-[#15233C] text-[#38BDF8]'
            }`}>
              {completedReqsCount}/{totalReqsCount} Complete
            </span>
          </div>

          {/* Directives List */}
          <div className="space-y-3 sm:space-y-3.5">
            {challenge.dailyRequirements.map((req) => {
              const rawValue = todayEntries[req.id];
              const complete = isRequirementComplete(req, rawValue);

              if (req.type === 'counter') {
                const current = Number(rawValue) || 0;
                const target = parseTargetNumber(req.target);
                const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;
                const isWater = /water|drink|hydrat|fluid|liquid|glass|bottle|liter|litre|ml|cup/i.test(`${req.title} ${req.unit || ''}`);
                const isQuestion = /question|problem|dsa|code|solve|quiz|exercise/i.test(`${req.title} ${req.unit || ''}`);

                return (
                  <div
                    key={req.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                      complete
                        ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200 shadow-sm'
                        : 'border-[#162744] bg-[#070D19] hover:border-[#38BDF8]/50'
                    }`}
                  >
                    {/* Visual Gauge + Information */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Water Flask Gauge or Questions Meter */}
                      {isWater ? (
                        <div
                          className="shrink-0 flex items-center justify-center p-0.5 rounded-2xl bg-[#040811] border border-[#162744] cursor-pointer shadow-inner hover:border-[#38BDF8]/60 transition-all"
                          title="Click or drag vertically to adjust water intake"
                        >
                          <SloshGauge
                            value={pct}
                            width={48}
                            height={72}
                            radius={12}
                            liquidColor="#38BDF8"
                            glassColor="#080F1D"
                            ticks={Math.min(target, 8)}
                            showValue={true}
                            interactive={true}
                            onChange={(newLevel) => {
                              const targetVal = Math.round((newLevel / 100) * target);
                              handleSetCounterWithCelebration(req.id, targetVal);
                            }}
                            ariaLabel={req.title}
                          />
                        </div>
                      ) : (
                        <div className="shrink-0 w-11 h-15 rounded-2xl border border-[#162744] bg-[#0A1222] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                          {/* Vertical glowing kinetic fill bar */}
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#38BDF8] to-[#0EA5E9] transition-all duration-300 opacity-90"
                            style={{ height: `${pct}%` }}
                          />
                          <div className="relative z-10 text-xs font-mono font-black text-white drop-shadow-md">
                            {pct}%
                          </div>
                        </div>
                      )}

                      {/* Title & Visual Tracking Slots */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                          <span className={`text-sm sm:text-base font-bold truncate ${complete ? 'line-through text-[#8295B0]' : 'text-zinc-100'}`}>
                            {req.title}
                          </span>
                          {isWater && (
                            <span className="text-[10px] text-[#38BDF8] bg-[#38BDF8]/15 px-2 py-0.5 rounded-full border border-[#38BDF8]/30 font-mono font-bold flex items-center gap-1">
                              <Droplets className="w-3 h-3" />
                              Hydro Protocol
                            </span>
                          )}
                          {isQuestion && (
                            <span className="text-[10px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/60 font-mono font-bold flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" />
                              Questions
                            </span>
                          )}
                        </div>

                        {/* Interactive Visual Segmented Droplets (For Water) */}
                        {isWater && target <= 16 && (
                          <div className="flex items-center gap-1.5 my-1.5 sm:my-2 flex-wrap">
                            {Array.from({ length: target }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSetCounterWithCelebration(req.id, i + 1 === current ? i : i + 1)}
                                className={`w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-xs transition-transform active:scale-90 cursor-pointer ${
                                  i < current
                                    ? 'bg-[#38BDF8] text-black font-black shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                                    : 'bg-[#10192C] border border-[#162744] text-zinc-600 hover:text-zinc-400'
                                }`}
                                title={`Set to ${i + 1} glasses`}
                              >
                                💧
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Progress readout bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[180px] h-1.5 rounded-full bg-[#10192C] overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${complete ? 'bg-emerald-400' : 'bg-[#38BDF8]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-[#8295B0]">
                            {current} of {target} {req.unit || 'units'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stepper Controls - Full Width on Mobile with Spaced Buttons */}
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 shrink-0 bg-[#0A1222] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-[#162744]">
                      <button
                        type="button"
                        onClick={() => handleAdjustCounterWithCelebration(req.id, -1)}
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-[#1A2E4E] bg-[#070D19] text-zinc-300 hover:text-white hover:border-[#38BDF8]/60 active:scale-90 transition-all cursor-pointer"
                        title="Decrease count"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="min-w-[64px] sm:min-w-[68px] text-center font-mono">
                        <div className="text-base font-black text-white tabular-nums">
                          {current} <span className="text-xs text-zinc-400 font-normal">/ {target}</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-[#8295B0]">
                          {req.unit || 'units'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdjustCounterWithCelebration(req.id, 1)}
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[#38BDF8] text-black hover:bg-[#7DD3FC] active:scale-90 transition-all shadow-glow flex items-center justify-center font-bold cursor-pointer"
                        title="Increase count"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={req.id}
                  className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${
                    complete
                      ? 'border-emerald-500/50 bg-emerald-950/25'
                      : 'border-[#162744] bg-[#070D19] hover:border-[#38BDF8]/40'
                  }`}
                >
                  <SpringCheck
                    label={req.title}
                    checked={complete}
                    onChange={() => handleToggleRequirementWithCelebration(req.id)}
                    color="#F4F4F5"
                    fillColor="#38BDF8"
                    checkColor="#030712"
                    boxSize={22}
                    boxRadius={7}
                    fontSize={14}
                    bounce={0.25}
                    strikeLag={0.12}
                    strike="left"
                    className="w-full font-semibold"
                  />
                </div>
              );
            })}
          </div>

          {/* Ascension Milestone Trail Strip */}
          <div className="p-3 sm:p-3.5 rounded-2xl border border-[#15233C] bg-[#070D19]/60">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#38BDF8]" />
                Ascension Questline
              </span>
              <span className="text-[10px] text-[#8295B0] font-mono">
                {progression.nextRank
                  ? `${progression.progressToNextRank}% to ${progression.nextRank.title} (${progression.xpToNextRank} XP left)`
                  : 'Master Tier Maxed'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {progression.milestones.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    m.isUnlocked
                      ? 'border-[#38BDF8] bg-blue-950/60 text-[#38BDF8] shadow-glow-sm'
                      : m.isCurrent
                        ? 'border-amber-500/80 bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/40 animate-pulse'
                        : 'border-[#15233C] bg-[#0A101F]/60 text-zinc-600'
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider font-bold flex items-center justify-center gap-1">
                    {m.isUnlocked ? <Check className="w-2.5 h-2.5" /> : m.isCurrent ? <Flame className="w-2.5 h-2.5 text-amber-400" /> : <Lock className="w-2.5 h-2.5" />}
                    <span>{m.title}</span>
                  </div>
                  <div className="text-xs font-mono font-bold">{m.day}d</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: History & Details Link */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[#15233C]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#8295B0] relative z-10">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-1.5 font-semibold text-[#8295B0] hover:text-[#38BDF8] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <History className="w-4 h-4" />
          <span>View Full History & Streak Freeze Bank</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <span className="text-xs font-mono text-zinc-500 self-end sm:self-auto">
          Rank {progression.currentRank.level} • {progression.currentRank.title}
        </span>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteChallenge(challenge.id)}
        title="Delete Challenge"
        message={`Are you sure you want to delete "${challenge.name}"? All progress, streaks, and history will be permanently erased.`}
        confirmText="Delete Challenge"
        isDestructive={true}
      />
    </div>
  );
}
