import { parseISO, format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { getTodayDateString } from './dates';

/**
 * Aggregates counter values for today, this week, this month, and overall
 */
export function calculateCounterTotals(counterId, counterEntries = {}) {
  const entriesForCounter = counterEntries[counterId] || {};
  const todayStr = getTodayDateString();
  const today = parseISO(todayStr);

  const todayVal = Number(entriesForCounter[todayStr]) || 0;

  // Week total
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let weekTotal = 0;
  for (const d of weekDays) {
    const key = format(d, 'yyyy-MM-dd');
    weekTotal += Number(entriesForCounter[key]) || 0;
  }

  // Month total
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  let monthTotal = 0;
  for (const d of monthDays) {
    const key = format(d, 'yyyy-MM-dd');
    monthTotal += Number(entriesForCounter[key]) || 0;
  }

  // Overall total
  let overallTotal = 0;
  for (const dateKey in entriesForCounter) {
    overallTotal += Number(entriesForCounter[dateKey]) || 0;
  }

  return {
    today: todayVal,
    week: weekTotal,
    month: monthTotal,
    overall: overallTotal
  };
}

/**
 * Generates 14-day history data for a specific counter for Recharts
 */
export function getCounterChartData(counterId, counterEntries = {}, daysCount = 14) {
  const entriesForCounter = counterEntries[counterId] || {};
  const today = parseISO(getTodayDateString());
  const result = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const dateKey = format(d, 'yyyy-MM-dd');
    const display = format(d, 'MMM d');
    result.push({
      date: dateKey,
      name: display,
      value: Number(entriesForCounter[dateKey]) || 0
    });
  }

  return result;
}

/**
 * Four-hour segments of the day used to bucket completion timestamps for
 * the "when am I most productive" heatmap.
 */
const TIME_OF_DAY_BUCKETS = [
  { label: 'Night', start: 0, end: 4 },
  { label: 'Early AM', start: 4, end: 8 },
  { label: 'Morning', start: 8, end: 12 },
  { label: 'Afternoon', start: 12, end: 16 },
  { label: 'Evening', start: 16, end: 20 },
  { label: 'Late PM', start: 20, end: 24 }
];

/**
 * Buckets an array of ISO timestamp strings into 6 four-hour segments of
 * the day, for visualizing *when* the user tends to complete things.
 */
export function getTimeOfDayDistribution(timestamps = []) {
  const counts = TIME_OF_DAY_BUCKETS.map(b => ({ name: b.label, value: 0 }));
  for (const ts of timestamps) {
    const hour = new Date(ts).getHours();
    const bucketIndex = TIME_OF_DAY_BUCKETS.findIndex(b => hour >= b.start && hour < b.end);
    if (bucketIndex !== -1) counts[bucketIndex].value++;
  }
  return counts;
}

/**
 * Flattens a nested completion-time map (challengeId/counterId -> dateStr -> ...)
 * into a single array of ISO timestamp strings for the given id.
 * Handles both shapes used in DataContext:
 *  - challengeCompletionTimes[id]: { dateStr: { reqId: isoString } }
 *  - counterCompletionTimes[id]: { dateStr: isoString[] }
 */
export function flattenCompletionTimestamps(completionTimesById = {}, id) {
  const byDate = completionTimesById[id] || {};
  const timestamps = [];
  for (const dateStr in byDate) {
    const value = byDate[dateStr];
    if (Array.isArray(value)) {
      timestamps.push(...value);
    } else if (value && typeof value === 'object') {
      timestamps.push(...Object.values(value));
    }
  }
  return timestamps;
}
