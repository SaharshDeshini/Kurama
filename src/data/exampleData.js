import { getTodayDateString, addDaysToDateString } from '../utils/dates';

export function getExampleData() {
  const today = getTodayDateString();
  const yesterday = addDaysToDateString(today, -1);
  const twoDaysAgo = addDaysToDateString(today, -2);
  const threeDaysAgo = addDaysToDateString(today, -3);

  return {
    challenges: [
      {
        id: 'chlg_demo_1',
        name: '120 Day Discipline',
        durationType: 'fixed',
        duration: 120,
        startDate: threeDaysAgo,
        dailyRequirements: [
          { id: 'creq_water', title: 'Drink 8 glasses of water', type: 'counter', target: 8, unit: 'glasses' },
          { id: 'creq_questions', title: 'Solve 5 DSA questions', type: 'counter', target: 5, unit: 'questions' },
          { id: 'creq_code', title: 'Code for 2 hours', type: 'checkbox', target: '2', unit: 'hours' },
          { id: 'creq_read', title: 'Read 20 pages', type: 'checkbox', target: '20', unit: 'pages' }
        ],
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ],

    challengeEntries: {
      'chlg_demo_1': {
        [threeDaysAgo]: { 'creq_1': true, 'creq_2': 3, 'creq_3': true, 'creq_4': true },
        [twoDaysAgo]: { 'creq_1': true, 'creq_2': 3, 'creq_3': true, 'creq_4': true },
        [yesterday]: { 'creq_1': true, 'creq_2': 3, 'creq_3': true, 'creq_4': false },
        [today]: { 'creq_1': true, 'creq_2': 2, 'creq_3': false, 'creq_4': false }
      }
    },

    counters: [
      { id: 'cnt_demo_1', name: 'DSA Problems', unit: 'problems', step: 1, target: 5, createdAt: threeDaysAgo },
      { id: 'cnt_demo_2', name: 'Coding Hours', unit: 'hours', step: 0.5, target: 3, createdAt: threeDaysAgo },
      { id: 'cnt_demo_3', name: 'Pages Read', unit: 'pages', step: 5, target: 25, createdAt: threeDaysAgo }
    ],

    counterEntries: {
      'cnt_demo_1': { [threeDaysAgo]: 4, [twoDaysAgo]: 5, [yesterday]: 3, [today]: 3 },
      'cnt_demo_2': { [threeDaysAgo]: 2.5, [twoDaysAgo]: 3.0, [yesterday]: 2.0, [today]: 2.5 },
      'cnt_demo_3': { [threeDaysAgo]: 20, [twoDaysAgo]: 30, [yesterday]: 15, [today]: 20 }
    },

    journal: {
      [today]: {
        content: 'Solid morning focus session. Completed heap invariant proofs. Need to finish bubble-down tests this evening.',
        updatedAt: new Date().toISOString()
      },
      [yesterday]: {
        content: 'Good progress on graph theory. Ran a bit short on reading pages, will make it up tomorrow.',
        updatedAt: new Date().toISOString()
      }
    },

    settings: {
      theme: 'system',
      userName: '',
      motto: '',
      primaryChallengeId: 'chlg_demo_1'
    }
  };
}
