import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

/**
 * Bar chart of completions bucketed into 6 four-hour segments of the day.
 * `data` is the shape returned by utils/statistics#getTimeOfDayDistribution:
 * [{ name: 'Morning', value: 3 }, ...]
 */
export function TimeOfDayHeatmap({ data = [] }) {
  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-zinc-400">
        Not enough completions yet to show a pattern
      </div>
    );
  }

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="px-2.5 py-1.5 rounded-md bg-zinc-900 text-white text-xs shadow-lg">
                    <span className="font-medium">{payload[0].payload.name}: </span>
                    <span className="font-mono font-bold">{payload[0].value}</span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="value"
            fill="#00B4FF"
            radius={[4, 4, 0, 0]}
            className="fill-[#00B4FF]"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
