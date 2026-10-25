import { getChallengeDates, getChallengeDayStatus, DayStatus } from './challenges';

/**
 * Minimum sample size (days) required on *each* side of the comparison
 * before we surface a correlation — avoids a misleading percentage from
 * a couple of lucky/unlucky days.
 */
const MIN_SAMPLE_DAYS = 5;

/**
 * Compares challenge completion rate on days the user wrote a journal entry
 * vs days they didn't, across every challenge's history. Surfaces whether
 * journaling correlates with following through on requirements.
 *
 * @param {Array} challenges
 * @param {Object} challengeEntries - dateStr -> reqId -> boolean, keyed by challenge id
 * @param {Object} journal - dateStr -> { content: string }
 * @returns {{journaledRate: number, plainRate: number, diffPoints: number, journaledDays: number, plainDays: number} | null}
 */
export function getJournalCorrelationInsight(challenges = [], challengeEntries = {}, journal = {}) {
  let journaledSuccess = 0;
  let journaledTotal = 0;
  let plainSuccess = 0;
  let plainTotal = 0;

  for (const challenge of challenges) {
    const entriesMap = challengeEntries[challenge.id] || {};
    const frozenDates = challenge.frozenDates || [];
    const dates = getChallengeDates(challenge);

    for (const dateStr of dates) {
      const status = getChallengeDayStatus(challenge, entriesMap[dateStr] || {}, dateStr, frozenDates);
      // Only resolved days (past successes/failures) carry signal — skip future/in-progress/frozen.
      if (status !== DayStatus.SUCCESSFUL && status !== DayStatus.FAILED) continue;

      const hasJournalEntry = Boolean(journal[dateStr]?.content?.trim());
      if (hasJournalEntry) {
        journaledTotal++;
        if (status === DayStatus.SUCCESSFUL) journaledSuccess++;
      } else {
        plainTotal++;
        if (status === DayStatus.SUCCESSFUL) plainSuccess++;
      }
    }
  }

  if (journaledTotal < MIN_SAMPLE_DAYS || plainTotal < MIN_SAMPLE_DAYS) return null;

  const journaledRate = Math.round((journaledSuccess / journaledTotal) * 100);
  const plainRate = Math.round((plainSuccess / plainTotal) * 100);

  return {
    journaledRate,
    plainRate,
    diffPoints: journaledRate - plainRate,
    journaledDays: journaledTotal,
    plainDays: plainTotal
  };
}
