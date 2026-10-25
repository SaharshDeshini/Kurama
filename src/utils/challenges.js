import { parseISO, differenceInDays, format, addDays, subDays, isAfter, isBefore, isSameDay } from 'date-fns';
import { getTodayDateString } from './dates';

/**
 * Valid statuses for a challenge day
 */
export const DayStatus = {
  FUTURE: 'future',
  IN_PROGRESS: 'in-progress',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  FROZEN: 'frozen'
};

/**
 * Number of successful days required to earn one streak-freeze token.
 */
export const FREEZE_EARN_INTERVAL = 7;

/**
 * A requirement is either a checkbox (boolean entry value) or a counter
 * (numeric entry value that auto-completes once it reaches `target`).
 */
export function isRequirementComplete(req, rawValue) {
  if (req.type === 'counter') {
    const target = Number(req.target) || 1;
    return (Number(rawValue) || 0) >= target;
  }
  return Boolean(rawValue);
}

/**
 * Calculates the status of a specific day for a challenge.
 *
 * @param {Object} challenge - The challenge object containing dailyRequirements
 * @param {Object} dayEntries - The map of requirement completions for the specific day
 *   (boolean for checkbox requirements, number for counter requirements)
 * @param {string} dateStr - The date string for the day being evaluated (yyyy-MM-dd)
 * @param {string[]} [frozenDates] - Dates the user has spent a streak-freeze token on
 * @returns {string} DayStatus
 */
export function getChallengeDayStatus(challenge, dayEntries, dateStr, frozenDates = []) {
  const todayStr = getTodayDateString();
  const dayDate = parseISO(dateStr);
  const todayDate = parseISO(todayStr);

  const requirements = challenge.dailyRequirements || [];
  if (requirements.length === 0) return DayStatus.FUTURE;

  const totalReqs = requirements.length;
  let completedReqs = 0;

  for (const req of requirements) {
    if (dayEntries && isRequirementComplete(req, dayEntries[req.id])) {
      completedReqs++;
    }
  }

  const allCompleted = completedReqs === totalReqs;

  if (isAfter(dayDate, todayDate)) {
    return DayStatus.FUTURE;
  }

  if (isSameDay(dayDate, todayDate)) {
    return allCompleted ? DayStatus.SUCCESSFUL : DayStatus.IN_PROGRESS;
  }

  // It's a past date
  if (allCompleted) return DayStatus.SUCCESSFUL;
  return frozenDates.includes(dateStr) ? DayStatus.FROZEN : DayStatus.FAILED;
}

/**
 * Generates an array of date strings representing the entire duration of the challenge.
 * Open-ended challenges (durationType: 'open') have no fixed end, so this spans
 * from the start date through today instead of a preset day count.
 */
export function getChallengeDates(challenge) {
  const dates = [];
  const start = parseISO(challenge.startDate);

  if (challenge.durationType === 'open') {
    const today = parseISO(getTodayDateString());
    const span = Math.max(0, differenceInDays(today, start)) + 1;
    for (let i = 0; i < span; i++) {
      dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
    }
    return dates;
  }

  const duration = challenge.duration || 1;
  for (let i = 0; i < duration; i++) {
    dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
  }
  return dates;
}

/**
 * Returns the last `count` days' statuses for a challenge (oldest first),
 * regardless of the challenge's fixed/open duration — used for the compact
 * consistency strip shown on the Home dashboard. Days before the challenge
 * started are marked 'pre-start' rather than 'failed'.
 */
export function getRecentDayStatuses(challenge, entriesMap = {}, frozenDates = [], count = 14) {
  const today = parseISO(getTodayDateString());
  const result = [];

  for (let i = count - 1; i >= 0; i--) {
    const dateStr = format(subDays(today, i), 'yyyy-MM-dd');
    if (dateStr < challenge.startDate) {
      result.push({ dateStr, status: 'pre-start' });
      continue;
    }
    const status = getChallengeDayStatus(challenge, entriesMap[dateStr] || {}, dateStr, frozenDates);
    result.push({ dateStr, status });
  }

  return result;
}

/**
 * Calculates statistics for a challenge including streaks and completions.
 *
 * @param {Object} challenge - The challenge object
 * @param {Object} entriesMap - The entries map for this challenge (dateStr -> reqId -> boolean)
 * @param {string[]} [frozenDates] - Dates the user has spent a streak-freeze token on
 */
export function calculateChallengeStats(challenge, entriesMap = {}, frozenDates = []) {
  const dates = getChallengeDates(challenge);
  const todayStr = getTodayDateString();
  const todayDate = parseISO(todayStr);

  let successfulDays = 0;
  let failedDays = 0;
  let frozenDays = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let inProgressDays = 0;
  let futureDays = 0;

  let tempStreak = 0;

  for (const dateStr of dates) {
    const dayEntries = entriesMap[dateStr] || {};
    const status = getChallengeDayStatus(challenge, dayEntries, dateStr, frozenDates);

    switch (status) {
      case DayStatus.SUCCESSFUL:
        successfulDays++;
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
        break;
      case DayStatus.FROZEN:
        // A frozen day protects the streak in progress without extending it.
        frozenDays++;
        break;
      case DayStatus.FAILED:
        failedDays++;
        tempStreak = 0;
        break;
      case DayStatus.IN_PROGRESS:
        inProgressDays++;
        // If today is in progress, it doesn't break the streak from yesterday,
        // but it doesn't add to it either until completed.
        break;
      case DayStatus.FUTURE:
        futureDays++;
        break;
    }
  }

  // To calculate the EXACT current streak (ending on today or most recent successful day)
  // We traverse backwards from today.
  currentStreak = 0;

  // Find where today is in the dates array
  const todayIndex = dates.indexOf(todayStr);
  let startIndex = todayIndex !== -1 ? todayIndex : dates.length - 1;

  for (let i = startIndex; i >= 0; i--) {
    const dateStr = dates[i];
    const dayEntries = entriesMap[dateStr] || {};
    const status = getChallengeDayStatus(challenge, dayEntries, dateStr, frozenDates);

    if (status === DayStatus.SUCCESSFUL) {
      currentStreak++;
    } else if (status === DayStatus.FROZEN) {
      // Frozen day protects the streak without extending it.
      continue;
    } else if (status === DayStatus.IN_PROGRESS && isSameDay(parseISO(dateStr), todayDate)) {
      // Today is in progress, it doesn't break the streak (which depends on yesterday)
      continue;
    } else {
      // Failed, or In Progress but in the past (which shouldn't happen based on our logic,
      // but just in case), or Future (shouldn't happen traversing backwards from today)
      break;
    }
  }

  const isOpenEnded = challenge.durationType === 'open';
  const currentDayNumber = dates.indexOf(todayStr) + 1;
  const isStarted = isBefore(parseISO(challenge.startDate), todayDate) || isSameDay(parseISO(challenge.startDate), todayDate);
  const isFinished = isOpenEnded
    ? false
    : currentDayNumber > challenge.duration || (!isStarted && currentDayNumber < 1 && isAfter(parseISO(challenge.startDate), todayDate));

  const freezesEarned = Math.floor(successfulDays / FREEZE_EARN_INTERVAL);
  const freezesAvailable = Math.max(0, freezesEarned - frozenDates.length);

  return {
    successfulDays,
    failedDays,
    frozenDays,
    inProgressDays,
    futureDays,
    currentStreak,
    bestStreak,
    isOpenEnded,
    totalDays: isOpenEnded ? null : challenge.duration,
    currentDayNumber: isStarted
      ? (isOpenEnded ? Math.max(currentDayNumber, 1) : Math.min(currentDayNumber > 0 ? currentDayNumber : 1, challenge.duration))
      : 0,
    remainingDays: isOpenEnded ? null : challenge.duration - successfulDays - failedDays,
    isActive: isStarted && !isFinished,
    freezesEarned,
    freezesAvailable
  };
}

/**
 * Returns the highest streak milestone (in days) reached by going from
 * `previousStreak` to `newStreak`, or null if no milestone was crossed.
 * Used to trigger a one-off celebration when a streak first reaches 7/30/100 days.
 *
 * @param {number} previousStreak
 * @param {number} newStreak
 * @returns {number|null}
 */
export function getMilestoneCrossed(previousStreak, newStreak) {
  const milestones = [7, 30, 100];
  const crossed = milestones.filter(m => previousStreak < m && newStreak >= m);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}
