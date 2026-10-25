import React from 'react';

export function ProgressBar({ value = 0, max = 100, showLabel = false, size = 'md', className = '' }) {
  const safeVal = Math.max(0, Math.min(Number(value) || 0, max));
  const percentage = max > 0 ? Math.round((safeVal / max) * 100) : 0;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <span>{percentage}%</span>
          <span>{safeVal} / {max}</span>
        </div>
      )}
      <div className={`w-full bg-border-light dark:bg-border-dark rounded-full overflow-hidden ${heightClasses[size] || heightClasses.md}`}>
        <div
          className="h-full bg-ember rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
