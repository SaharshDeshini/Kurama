/**
 * Number of days without an export before we nudge the user to back up.
 * Since Personal OS stores everything in localStorage only, an export is
 * the only way to prevent silent data loss (browser storage cleared, device
 * lost, etc). Shared by the Settings page and the dashboard reminder banner.
 */
export const BACKUP_REMINDER_DAYS = 7;

/**
 * @param {string|null} lastBackupAt - ISO timestamp of the last export, or null
 * @returns {number|null} whole days since the last backup, or null if never backed up
 */
export function getDaysSinceBackup(lastBackupAt) {
  if (!lastBackupAt) return null;
  return Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * @param {string|null} lastBackupAt
 * @returns {boolean} true if the user has never backed up, or it's been too long
 */
export function isBackupStale(lastBackupAt) {
  const days = getDaysSinceBackup(lastBackupAt);
  return days === null || days >= BACKUP_REMINDER_DAYS;
}
