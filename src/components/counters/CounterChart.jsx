import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export function CounterChart({ data = [], counterName = 'Activity', unit = '' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
        No recorded history yet
      </div>
    );
  }

  return (
    <div className="h-48 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: '#888' }} 
            axisLine={false} 
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#888' }} 
            axisLine={false} 
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="px-2.5 py-1.5 rounded-md bg-zinc-900 text-white text-xs shadow-lg">
                    <span className="font-medium">{payload[0].payload.name}: </span>
                    <span className="font-mono font-bold">{payload[0].value} {unit}</span>
                  </div>
                );
              }
              return null;
            }} 
          />
          <Bar 
            dataKey="value" 
            fill="#3f3f46" 
            radius={[4, 4, 0, 0]} 
            className="dark:fill-zinc-300 fill-zinc-800"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
