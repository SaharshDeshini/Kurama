import React from 'react';

export function EmptyState({ icon: Icon, title, description, actionText, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed border-border-light dark:border-border-dark bg-surface-light/50 dark:bg-surface-dark/50 ${className}`}>
      {Icon && (
        <div className="p-3 mb-3 rounded-full bg-ember/10 text-ember">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-subtle-light dark:text-subtle-dark max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-ember hover:bg-ember-dark shadow-card dark:shadow-card-dark transition-all active:scale-[0.98]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
