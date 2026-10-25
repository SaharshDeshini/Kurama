import { addDaysToDateString, getTodayDateString } from './dates';

/**
 * Known named challenge templates, addressable by a short keyword
 * (e.g. "start 75hard"). Keys are matched against the user's input
 * with whitespace stripped, case-insensitively.
 */
const CHALLENGE_TEMPLATES = {
  '75hard': {
    name: '75 Hard',
    duration: 75,
    dailyRequirements: [
      { title: 'Two 45-minute workouts (one outdoors)' },
      { title: 'Follow a diet, no cheat meals' },
      { title: 'Drink 1 gallon of water' },
      { title: 'Read 10 pages of a non-fiction book' },
      { title: 'Take a progress photo' }
    ]
  },
  '75soft': {
    name: '75 Soft',
    duration: 75,
    dailyRequirements: [
      { title: 'One 45-minute workout' },
      { title: 'Eat well, no alcohol' },
      { title: 'Drink 3 liters of water' },
      { title: 'Read 10 pages of a non-fiction book' }
    ]
  }
};

/**
 * Deterministic command parser for Personal OS (Challenge-first)
 * @param {string} input
 * @param {Object} context { challenges: [], counters: [], challengeEntries: {} }
 * @returns {Object} result
 */
export function parseCommand(input = '', context = {}) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { recognized: false, reason: 'empty' };
  }

  const lower = trimmed.toLowerCase();
  const todayStr = getTodayDateString();
  const yesterdayStr = addDaysToDateString(todayStr, -1);

  const challenges = context.challenges || [];
  const counters = context.counters || [];
  const challengeEntries = context.challengeEntries || {};

  // 0a. SHORTHAND COUNTER INCREMENT/DECREMENT
  // "+2 pushups", "+1 dsa problems", "-1 coffee"
  const shorthandRegex = /^([+-])\s*(\d+(?:\.\d+)?)\s+(.+?)(?:\s+today|\s+yesterday)?$/i;
  const shorthandMatch = trimmed.match(shorthandRegex);
  if (shorthandMatch) {
    const sign = shorthandMatch[1] === '-' ? -1 : 1;
    const amount = sign * parseFloat(shorthandMatch[2]);
    const rawSubject = shorthandMatch[3].trim().toLowerCase();
    const isYesterday = lower.includes('yesterday');

    const matchedCounter = counters.find(c => {
      const cName = c.name.toLowerCase();
      const cUnit = (c.unit || '').toLowerCase();
      return (rawSubject && (cName.includes(rawSubject) || rawSubject.includes(cName))) ||
             (cUnit && rawSubject.includes(cUnit));
    });

    if (matchedCounter && !isNaN(amount)) {
      return {
        recognized: true,
        type: 'UPDATE_COUNTER',
        counterId: matchedCounter.id,
        counterName: matchedCounter.name,
        amount,
        unit: matchedCounter.unit,
        dateStr: isYesterday ? yesterdayStr : todayStr,
        feedback: `${amount > 0 ? 'Added' : 'Subtracted'} ${Math.abs(amount)} ${matchedCounter.unit || ''} ${amount > 0 ? 'to' : 'from'} ${matchedCounter.name}.`
      };
    }
  }

  // 0b. JOURNAL QUICK ENTRY
  // "journal: tired today", "journal had a good workout"
  const journalRegex = /^journal:?\s+(.+?)(?:\s+yesterday)?$/i;
  const journalMatch = trimmed.match(journalRegex);
  if (journalMatch) {
    const text = journalMatch[1].trim();
    const isYesterday = lower.includes('yesterday');
    if (text) {
      return {
        recognized: true,
        type: 'JOURNAL_ENTRY',
        text,
        dateStr: isYesterday ? yesterdayStr : todayStr,
        feedback: `Added to ${isYesterday ? "yesterday's" : "today's"} journal entry.`
      };
    }
  }

  // 0c. NOTE QUICK ENTRY
  // "note: buy groceries", "n: remember to test algorithm"
  const noteRegex = /^(?:note|n):\s*(.+)$/i;
  const noteMatch = trimmed.match(noteRegex);
  if (noteMatch) {
    const text = noteMatch[1].trim();
    if (text) {
      return {
        recognized: true,
        type: 'NOTE_ENTRY',
        text,
        feedback: `Placed note on your board: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`
      };
    }
  }

  // 1. CHALLENGE REQUIREMENT COMPLETION
  // "I completed Study DSA"
  // "Done coding"
  // "Finished reading"
  // "I studied DSA for 1 hour"
  // "I completed today's reading"
  const completionRegex = /^(?:i\s+)?(?:completed|done|finished|did)\s+(?:today'?s?\s+)?(.+?)(?:\s+today|\s+yesterday)?$/i;
  const completionMatch = trimmed.match(completionRegex);
  if (completionMatch) {
    const rawTarget = completionMatch[1].trim().toLowerCase();
    const isYesterday = lower.includes('yesterday');

    // Try to find matching challenge requirement
    for (const challenge of challenges) {
      if (challenge.status !== 'active') continue;
      const reqs = challenge.dailyRequirements || [];
      const matchedReq = reqs.find(r => {
        const rTitle = r.title.toLowerCase();
        return rTitle === rawTarget || rawTarget.includes(rTitle) || rTitle.includes(rawTarget);
      });

      if (matchedReq) {
        return {
          recognized: true,
          type: 'COMPLETE_REQUIREMENT',
          challengeId: challenge.id,
          requirementId: matchedReq.id,
          requirementTitle: matchedReq.title,
          challengeName: challenge.name,
          dateStr: isYesterday ? yesterdayStr : todayStr,
          feedback: `Completed "${matchedReq.title}" in ${challenge.name}.`
        };
      }
    }
  }

  // 2. ACTIVITY-BASED MATCHING
  // "I studied DSA for 1 hour"
  // "I coded for 2 hours"  
  // "I read 20 pages"
  // "I solved 3 DSA problems"
  const activityRegex = /^(?:i\s+)?(?:studied|coded|read|solved|worked\s+out|meditated|exercised)(?:\s+for)?\s+(.+?)(?:\s+today|\s+yesterday)?$/i;
  const activityMatch = trimmed.match(activityRegex);
  if (activityMatch) {
    const rawActivity = activityMatch[0].toLowerCase();
    const isYesterday = lower.includes('yesterday');

    // Try matching against challenge requirements
    for (const challenge of challenges) {
      if (challenge.status !== 'active') continue;
      const reqs = challenge.dailyRequirements || [];
      const matchedReq = reqs.find(r => {
        const rTitle = r.title.toLowerCase();
        // Fuzzy match: "studied DSA" -> "Study DSA", "coded" -> "Coding", etc.
        return rawActivity.includes(rTitle) || rTitle.includes(rawActivity.split(' ')[1] || '') ||
               (rTitle.includes('study') && rawActivity.includes('studied')) ||
               (rTitle.includes('code') && rawActivity.includes('coded')) ||
               (rTitle.includes('coding') && rawActivity.includes('coded')) ||
               (rTitle.includes('read') && rawActivity.includes('read')) ||
               (rTitle.includes('solve') && rawActivity.includes('solved')) ||
               (rTitle.includes('workout') && rawActivity.includes('worked out')) ||
               (rTitle.includes('meditat') && rawActivity.includes('meditated'));
      });

      if (matchedReq) {
        return {
          recognized: true,
          type: 'COMPLETE_REQUIREMENT',
          challengeId: challenge.id,
          requirementId: matchedReq.id,
          requirementTitle: matchedReq.title,
          challengeName: challenge.name,
          dateStr: isYesterday ? yesterdayStr : todayStr,
          feedback: `Completed "${matchedReq.title}" in ${challenge.name}.`
        };
      }
    }
  }

  // 3. COUNTER MATCHING
  // "I solved 3 DSA problems today"
  // "I coded for 2 hours today"
  // "Add 20 pages read"
  const counterPatternA = /^(?:i\s+)?(?:solved|coded\s+for|read|tracked|logged)\s+(\d+(?:\.\d+)?)\s*(.*?)(?:\s+today|\s+yesterday)?$/i;
  const counterPatternB = /^(?:add|track|log|record)\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\s+today|\s+yesterday)?$/i;
  const cMatchA = trimmed.match(counterPatternA);
  const cMatchB = trimmed.match(counterPatternB);
  const counterMatch = cMatchA || cMatchB;

  if (counterMatch) {
    const amount = parseFloat(counterMatch[1]);
    const rawSubject = (counterMatch[2] || '').trim().toLowerCase();
    const isYesterday = lower.includes('yesterday');
    const targetDate = isYesterday ? yesterdayStr : todayStr;

    const matchedCounter = counters.find(c => {
      const cName = c.name.toLowerCase();
      const cUnit = (c.unit || '').toLowerCase();
      return (
        (rawSubject && cName.includes(rawSubject)) ||
        (rawSubject && rawSubject.includes(cName)) ||
        (cUnit && rawSubject.includes(cUnit)) ||
        (cName.includes('coding') && lower.includes('code')) ||
        (cName.includes('dsa') && lower.includes('dsa')) ||
        (cName.includes('read') && lower.includes('read'))
      );
    });

    if (matchedCounter && !isNaN(amount)) {
      return {
        recognized: true,
        type: 'UPDATE_COUNTER',
        counterId: matchedCounter.id,
        counterName: matchedCounter.name,
        amount,
        unit: matchedCounter.unit,
        dateStr: targetDate,
        feedback: `Added ${amount} ${matchedCounter.unit || ''} to ${matchedCounter.name}.`
      };
    }
  }

  // 4a. CREATE CHALLENGE FROM NAMED TEMPLATE
  // "Start 75hard", "create a 75 hard challenge"
  const templateRegex = /^(?:create|start)\s+(?:a\s+)?([a-z0-9\s]+?)\s*(?:challenge)?$/i;
  const templateMatch = trimmed.match(templateRegex);
  if (templateMatch) {
    const key = templateMatch[1].toLowerCase().replace(/\s+/g, '');
    const template = CHALLENGE_TEMPLATES[key];
    if (template) {
      return {
        recognized: true,
        type: 'CREATE_CHALLENGE_TEMPLATE',
        template,
        feedback: `Opening challenge creation for "${template.name}"...`
      };
    }
  }

  // 4b. CREATE CHALLENGE
  // "Create a 120 day challenge"
  // "Start a 30 day coding challenge"
  const createChallengeRegex = /^(?:create|start)\s+(?:a\s+)?(\d+)\s+day\s+(.+?)(?:\s+challenge)?$/i;
  const createChallengeMatch = trimmed.match(createChallengeRegex);
  if (createChallengeMatch) {
    const duration = parseInt(createChallengeMatch[1], 10);
    const name = createChallengeMatch[2].trim();
    return {
      recognized: true,
      type: 'CREATE_CHALLENGE',
      duration,
      name: `${duration} Day ${name.charAt(0).toUpperCase() + name.slice(1)}`,
      feedback: `Opening challenge creation for "${duration} Day ${name}"...`
    };
  }

  // UNCERTAIN: Do NOT guess! Provide structured suggestions
  return {
    recognized: false,
    rawText: trimmed,
    message: "I'm not sure what you mean.",
    suggestions: [
      { label: 'Complete Requirement', type: 'COMPLETE_REQUIREMENT', prefill: trimmed },
      { label: 'Update Counter', type: 'UPDATE_COUNTER', prefill: trimmed },
    ]
  };
}
