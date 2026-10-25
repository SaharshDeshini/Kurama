import { 
  format, 
  parseISO, 
  isToday as dfIsToday, 
  isPast as dfIsPast, 
  isFuture as dfIsFuture, 
  addDays, 
  subDays, 
  differenceInCalendarDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isValid
} from 'date-fns';

/**
 * Returns today's date in local 'yyyy-MM-dd' format
 */
export function getTodayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Formats a 'yyyy-MM-dd' or ISO date string into human readable header
 */
export function formatDisplayDate(dateStr = getTodayDateString()) {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return '';
    return {
      full: format(d, 'MMMM d, yyyy'),
      weekday: format(d, 'EEEE'),
      monthDay: format(d, 'MMMM d'),
      short: format(d, 'MMM d')
    };
  } catch {
    return { full: '', weekday: '', monthDay: '', short: '' };
  }
}

/**
 * Returns appropriate greeting based on local hour
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function isDateToday(dateStr) {
  try {
    return dfIsToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function isDatePast(dateStr) {
  try {
    const today = getTodayDateString();
    return dateStr < today;
  } catch {
    return false;
  }
}

export function isDateFuture(dateStr) {
  try {
    const today = getTodayDateString();
    return dateStr > today;
  } catch {
    return false;
  }
}

export function addDaysToDateString(dateStr, amount) {
  try {
    const d = parseISO(dateStr);
    return format(addDays(d, amount), 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

export function getDaysDifference(startDateStr, endDateStr) {
  try {
    return differenceInCalendarDays(parseISO(endDateStr), parseISO(startDateStr));
  } catch {
    return 0;
  }
}

/**
 * Returns array of date strings for the current week (Mon-Sun or Sun-Sat)
 */
export function getCurrentWeekDays(baseDate = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(baseDate, { weekStartsOn });
  const end = endOfWeek(baseDate, { weekStartsOn });
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
}

/**
 * Returns all days for a given year & month (0-indexed month)
 */
export function getMonthDaysList(year, month) {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
}
