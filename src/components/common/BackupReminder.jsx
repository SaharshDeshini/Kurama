import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { getDaysSinceBackup, isBackupStale } from '../../utils/backup';
import { CloudOff } from 'lucide-react';

/**
 * Nudges the user to export a backup when their data has never been exported,
 * or it's been a while — Personal OS is localStorage-only, so an export is
 * the only protection against losing everything to a cleared browser.
 */
export function BackupReminder() {
  const { settings } = useData();
  const { openSettings } = useOutletContext();

  if (!isBackupStale(settings.lastBackupAt)) return null;

  const daysSinceBackup = getDaysSinceBackup(settings.lastBackupAt);
  const message = daysSinceBackup === null
    ? "You haven't backed up your data yet."
    : `It's been ${daysSinceBackup} days since your last backup.`;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 animate-in fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <CloudOff className="w-4 h-4 shrink-0" />
        <span className="text-xs sm:text-sm truncate">
          {message} Everything lives only in this browser.
        </span>
      </div>
      <button
        type="button"
        onClick={openSettings}
        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 dark:bg-amber-500 text-white hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors"
      >
        Back up now
      </button>
    </div>
  );
}
