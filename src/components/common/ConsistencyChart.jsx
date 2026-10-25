import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { isRequirementComplete } from '../../utils/challenges';
import { getTodayDateString } from '../../utils/dates';

const DAYS_SHOWN = 14;

function buildDailyPercentages(challenges, challengeEntries) {
  const today = parseISO(getTodayDateString());
  const days = [];

  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    let total = 0;
    let done = 0;

    for (const challenge of challenges) {
      if (dateStr < challenge.startDate) continue;
      const dayEntries = (challengeEntries[challenge.id] || {})[dateStr] || {};
      for (const req of challenge.dailyRequirements) {
        total++;
        if (isRequirementComplete(req, dayEntries[req.id])) done++;
      }
    }

    days.push({
      name: format(d, 'EEE'),
      date: dateStr,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      hasRequirements: total > 0
    });
  }

  return days;
}

function barColor(day) {
  if (!day.hasRequirements) return '#0D1629';
  if (day.percent >= 100) return '#38BDF8';
  if (day.percent > 0) return '#0284C7';
  return '#EF4444';
}

/**
 * Last-14-days consistency bar chart across active challenges.
 * Sky-blue = 100% completed day, deep-blue = partial, red = 0%, dark = no requirements.
 */
export function ConsistencyChart({ challenges = [], challengeEntries = {} }) {
  const days = useMemo(() => buildDailyPercentages(challenges, challengeEntries), [challenges, challengeEntries]);
  const hasAnyRequirements = days.some((d) => d.hasRequirements);

  if (!hasAnyRequirements) {
    return (
      <div className="h-36 sm:h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-[#162744] bg-[#060A14]/70 text-xs text-[#8295B0]">
        <span>No directive activity logged in the last 14 days.</span>
        <span className="text-[11px] text-[#38BDF8] mt-1 font-semibold">
          Check off today's challenge tasks to ignite the velocity bars!
        </span>
      </div>
    );
  }

  return (
    <div className="h-36 sm:h-44 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8295B0', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#8295B0', fontWeight: 'bold' }} axisLine={false} tickLine={false} domain={[0, 100]} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const day = payload[0].payload;
                return (
                  <div className="px-3 py-2 rounded-xl bg-[#060A14] border border-[#162744] text-white text-xs shadow-xl font-mono">
                    <div className="font-bold text-[#38BDF8]">{day.date}</div>
                    <div className="text-zinc-300 mt-0.5">
                      {day.hasRequirements ? `${day.percent}% directives completed` : 'No requirements'}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
            {days.map((day) => (
              <Cell key={day.date} fill={barColor(day)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
