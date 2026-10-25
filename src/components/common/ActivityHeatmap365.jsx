import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format, subDays, parseISO, getDay } from 'date-fns';
import { isRequirementComplete } from '../../utils/challenges';
import { getTodayDateString } from '../../utils/dates';
import { Flame, Trophy, Zap, Calendar, ArrowRight } from 'lucide-react';

export function ActivityHeatmap365({
  challenges = [],
  challengeEntries = {},
  journal = {}
}) {
  const [timeframe, setTimeframe] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return '30';
    }
    return '365';
  });

  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isScrolledPastToday, setIsScrolledPastToday] = useState(false);

  const scrollContainerRef = useRef(null);

  const todayStr = getTodayDateString();
  const today = useMemo(() => parseISO(todayStr), [todayStr]);

  // Compute days and weeks based on active timeframe
  const heatmapData = useMemo(() => {
    let totalDaysToScan = 364; // default 52 weeks
    if (timeframe === '30') totalDaysToScan = 34; // ~5 weeks
    else if (timeframe === '90') totalDaysToScan = 90; // ~13 weeks

    const days = [];
    let totalActiveDays = 0;
    let totalCompletions = 0;
    let currentStreakCounter = 0;
    let maxStreakRecord = 0;

    for (let i = totalDaysToScan; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = getDay(d); // 0 = Sun, 6 = Sat

      let totalReqs = 0;
      let completedReqs = 0;

      // Check all active challenges on this date
      for (const challenge of challenges) {
        if (dateStr < challenge.startDate) continue;
        const dayEntries = (challengeEntries[challenge.id] || {})[dateStr] || {};
        for (const req of challenge.dailyRequirements) {
          totalReqs++;
          if (isRequirementComplete(req, dayEntries[req.id])) {
            completedReqs++;
          }
        }
      }

      // Check journal entry presence
      const hasJournal = Boolean(journal[dateStr]?.text?.trim() || journal[dateStr]?.content?.trim());
      if (hasJournal) completedReqs++;

      // Determine color intensity level (0 to 4)
      let level = 0;
      if (totalReqs === 0) {
        level = hasJournal ? 1 : 0;
      } else {
        const ratio = completedReqs / totalReqs;
        if (ratio >= 1) level = 4;
        else if (ratio >= 0.66) level = 3;
        else if (ratio >= 0.33) level = 2;
        else if (completedReqs > 0) level = 1;
        else level = 0;
      }

      if (completedReqs > 0) {
        totalActiveDays++;
        totalCompletions += completedReqs;
        currentStreakCounter++;
        if (currentStreakCounter > maxStreakRecord) {
          maxStreakRecord = currentStreakCounter;
        }
      } else if (dateStr < todayStr) {
        currentStreakCounter = 0;
      }

      days.push({
        date: d,
        dateStr,
        dayOfWeek,
        level,
        totalReqs,
        completedReqs,
        hasJournal,
        isToday: dateStr === todayStr
      });
    }

    // Group into columns of 7 days (weeks)
    const weeks = [];
    let currentWeek = [];

    // Pad first week if dayOfWeek > 0
    if (days.length > 0) {
      const firstDayOfWeek = days[0].dayOfWeek;
      for (let p = 0; p < firstDayOfWeek; p++) {
        currentWeek.push(null);
      }
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    // Extract month labels with column indices
    const monthLabels = [];
    let lastMonth = '';
    weeks.forEach((week, wIndex) => {
      const validDay = week.find((d) => d !== null);
      if (validDay) {
        const m = format(validDay.date, 'MMM');
        if (m !== lastMonth) {
          monthLabels.push({ index: wIndex, label: m });
          lastMonth = m;
        }
      }
    });

    return {
      weeks,
      monthLabels,
      totalActiveDays,
      totalCompletions,
      maxStreakRecord,
      currentStreak: currentStreakCounter
    };
  }, [challenges, challengeEntries, journal, today, todayStr, timeframe]);

  // Handle auto-scroll to today
  const handleScrollCheck = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      // If scrolled back more than 50px from rightmost edge, show "Jump to Today"
      const distanceFromEnd = scrollWidth - (scrollLeft + clientWidth);
      setIsScrolledPastToday(distanceFromEnd > 40);
    }
  }, []);

  const scrollToToday = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      // Auto scroll immediately to the right on timeframe change or mount
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
      handleScrollCheck();
    }
  }, [timeframe, handleScrollCheck]);

  // Electric Sky Blue heatmap level color mapping
  const getCellColor = (level, isToday, isSelected) => {
    if (isSelected) {
      return 'bg-[#38BDF8] ring-2 ring-white shadow-[0_0_12px_rgba(56,189,248,0.9)] z-20 scale-125';
    }

    switch (level) {
      case 4:
        return 'bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.6)] border border-[#7DD3FC]';
      case 3:
        return 'bg-[#0284C7] border border-[#38BDF8]/40';
      case 2:
        return 'bg-[#0369A1] border border-sky-800/60';
      case 1:
        return 'bg-[#0C2444] border border-[#1E3A8A]/50';
      default:
        return isToday
          ? 'bg-[#0D182E] border-2 border-[#38BDF8] ring-1 ring-[#38BDF8]/50 animate-pulse'
          : 'bg-[#080E1B] border border-[#162744] hover:border-sky-500/50';
    }
  };

  const activeDay = selectedDay || hoveredDay;

  // Mobile layout cell sizing
  const is30Day = timeframe === '30';
  const cellWidthClass = is30Day ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-md' : 'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px]';

  return (
    <div className="space-y-3.5 select-none">
      {/* 1. Controls Bar: Timeframe Pills & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Timeframe Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#060A14] border border-[#162744] self-start sm:self-auto">
          {[
            { id: '30', label: '30 Days' },
            { id: '90', label: '90 Days' },
            { id: '365', label: 'Full Year' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTimeframe(t.id);
                setSelectedDay(null);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                timeframe === t.id
                  ? 'bg-[#38BDF8] text-black shadow-glow-sm'
                  : 'text-[#8295B0] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Quick Stats Badges (Optimized 3-col grid on mobile) */}
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#060A14] border border-[#162744]">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#8295B0] leading-none uppercase font-bold">Streak</div>
              <div className="text-xs font-black text-white">{heatmapData.currentStreak}d</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#060A14] border border-[#162744]">
            <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#8295B0] leading-none uppercase font-bold">Record</div>
              <div className="text-xs font-black text-white">{heatmapData.maxStreakRecord}d</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#060A14] border border-[#162744]">
            <Zap className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#8295B0] leading-none uppercase font-bold">Active</div>
              <div className="text-xs font-black text-[#38BDF8]">{heatmapData.totalActiveDays}d</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Heatmap Grid Container with Auto-Scroll & Edge Fades */}
      <div className="relative rounded-2xl border border-[#162744] bg-[#060A14]/70 p-3 sm:p-4 overflow-hidden">
        {/* Jump to Today floating button (when scrolled left in 90d/365d mode) */}
        {isScrolledPastToday && timeframe !== '30' && (
          <button
            type="button"
            onClick={scrollToToday}
            className="absolute right-3 top-3 z-30 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#38BDF8] text-black text-[11px] font-bold shadow-glow hover:bg-[#7DD3FC] transition-all active:scale-95"
          >
            <span>Today</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScrollCheck}
          className="overflow-x-auto pb-1 scrollbar-thin overscroll-x-contain"
        >
          <div className={`inline-block select-none ${is30Day ? 'w-full' : 'min-w-[620px]'}`}>
            {/* Month Labels */}
            <div className="flex text-[10px] text-[#8295B0] mb-2 pl-6 sm:pl-7">
              {heatmapData.monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  style={{
                    marginLeft:
                      idx === 0
                        ? `${m.index * (is30Day ? 32 : 14)}px`
                        : `${(m.index - heatmapData.monthLabels[idx - 1].index - 1) * (is30Day ? 32 : 14)}px`
                  }}
                  className="font-bold tracking-wider uppercase text-zinc-300"
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Weekday labels + Cells */}
            <div className="flex gap-2 items-center">
              {/* Day Labels */}
              <div className={`flex flex-col justify-between text-[9px] text-[#8295B0] font-mono leading-none pr-1 select-none ${
                is30Day ? 'h-[160px] sm:h-[190px]' : 'h-[88px] sm:h-[104px]'
              }`}>
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>

              {/* Weeks Columns */}
              <div className={`flex gap-1.5 sm:gap-2 ${is30Day ? 'flex-1 justify-between sm:justify-start' : 'gap-1 sm:gap-1.5'}`}>
                {heatmapData.weeks.map((week, wIdx) => (
                  <div key={wIdx} className={`flex flex-col ${is30Day ? 'gap-1.5 sm:gap-2 flex-1 max-w-[40px]' : 'gap-1 sm:gap-1.5'}`}>
                    {week.map((day, dIdx) => {
                      if (!day) {
                        return <div key={dIdx} className={`${cellWidthClass} bg-transparent`} />;
                      }

                      const isSelected = selectedDay?.dateStr === day.dateStr;

                      return (
                        <button
                          key={dIdx}
                          type="button"
                          onClick={() => setSelectedDay((prev) => (prev?.dateStr === day.dateStr ? null : day))}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`${cellWidthClass} cursor-pointer transition-all duration-150 relative flex items-center justify-center ${getCellColor(
                            day.level,
                            day.isToday,
                            isSelected
                          )}`}
                          title={`${day.dateStr}: ${day.completedReqs} tasks complete`}
                        >
                          {/* In 30-day mode, display day number on medium/large cells */}
                          {is30Day && (
                            <span className={`text-[9px] sm:text-[10px] font-mono font-bold ${
                              isSelected
                                ? 'text-black'
                                : day.level >= 3
                                ? 'text-black'
                                : day.level > 0
                                ? 'text-white'
                                : 'text-zinc-500'
                            }`}>
                              {format(day.date, 'd')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar: Interactive Touch Inspector & Color Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
        {/* Dynamic Tooltip / Touch Inspector */}
        <div className="min-h-[28px] flex items-center flex-wrap gap-2 text-zinc-300 font-mono text-[11px] bg-[#060A14] px-3 py-1.5 rounded-xl border border-[#162744]">
          {activeDay ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">
                {format(activeDay.date, 'EEE, MMM d, yyyy')}
              </span>
              <span className="text-[#8295B0]">•</span>
              <span className={activeDay.completedReqs > 0 ? 'text-[#38BDF8] font-bold' : 'text-zinc-500'}>
                {activeDay.completedReqs} of {activeDay.totalReqs || 4} directives done
              </span>
              {activeDay.hasJournal && (
                <span className="text-amber-400 font-semibold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800 text-[10px]">
                  Journaled
                </span>
              )}
              {activeDay.isToday && (
                <span className="text-emerald-300 font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-700 text-[10px]">
                  Today
                </span>
              )}
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-zinc-400 hover:text-white ml-1 px-1 rounded hover:bg-white/10"
                  title="Dismiss inspector"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <span className="text-[#8295B0] italic text-[11px] flex items-center gap-1.5">
              <span>💡 Tap or hover any day in the matrix to inspect progress</span>
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-[#8295B0] font-semibold self-end sm:self-auto">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#080E1B] border border-[#162744]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0C2444]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0369A1]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0284C7]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#38BDF8] shadow-glow-sm" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
