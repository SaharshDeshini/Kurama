/**
 * Challenge RPG Progression & Milestone System
 * Computes XP, Tier Ranks, Level progression, and Milestone checkpoints
 * to make daily discipline visually exciting, gamified, and responsive in real time.
 */

export const CHALLENGE_RANKS = [
  { level: 1, title: 'Initiate', icon: '🛡️', minXp: 0, minDays: 0, color: 'text-zinc-400', badgeBg: 'bg-zinc-800/80', glow: 'shadow-zinc-500/20' },
  { level: 2, title: 'Apprentice', icon: '⚔️', minXp: 150, minDays: 2, color: 'text-sky-400', badgeBg: 'bg-sky-950/80', glow: 'shadow-sky-500/20' },
  { level: 3, title: 'Vanguard', icon: '⚡', minXp: 400, minDays: 5, color: 'text-[#38BDF8]', badgeBg: 'bg-blue-950/80', glow: 'shadow-[#38BDF8]/30' },
  { level: 4, title: 'Master', icon: '🌟', minXp: 800, minDays: 10, color: 'text-amber-400', badgeBg: 'bg-amber-950/80', glow: 'shadow-amber-500/30' },
  { level: 5, title: 'Grandmaster', icon: '👑', minXp: 1500, minDays: 20, color: 'text-purple-400', badgeBg: 'bg-purple-950/80', glow: 'shadow-purple-500/30' },
  { level: 6, title: 'Sovereign', icon: '🌌', minXp: 2500, minDays: 35, color: 'text-fuchsia-400', badgeBg: 'bg-fuchsia-950/80', glow: 'shadow-fuchsia-500/30' },
  { level: 7, title: 'Transcendent', icon: '🏆', minXp: 4000, minDays: 60, color: 'text-emerald-400', badgeBg: 'bg-emerald-950/80', glow: 'shadow-emerald-500/30' }
];

export function getChallengeProgression(stats, todayCompletedReqs = 0, isTodayComplete = false) {
  const successfulDays = stats.successfulDays || 0;
  const currentStreak = stats.currentStreak || 0;

  // Active XP dynamically responds to today's completed directives (+50 XP each + 100 XP daily mastery)
  const activeTodayXp = (todayCompletedReqs * 50) + (isTodayComplete ? 100 : 0);
  const totalXp = (successfulDays * 100) + (currentStreak * 25) + activeTodayXp;

  // Find active rank based on total XP or completed days (whichever is higher)
  let currentRank = CHALLENGE_RANKS[0];
  let nextRank = CHALLENGE_RANKS[1];

  for (let i = CHALLENGE_RANKS.length - 1; i >= 0; i--) {
    if (totalXp >= CHALLENGE_RANKS[i].minXp || successfulDays >= CHALLENGE_RANKS[i].minDays) {
      currentRank = CHALLENGE_RANKS[i];
      nextRank = CHALLENGE_RANKS[i + 1] || null;
      break;
    }
  }

  let progressToNextRank = 100;
  let xpToNextRank = 0;
  let daysToNextRank = 0;

  if (nextRank) {
    const xpSpan = nextRank.minXp - currentRank.minXp;
    const xpGained = totalXp - currentRank.minXp;
    progressToNextRank = Math.min(100, Math.max(0, Math.round((xpGained / xpSpan) * 100)));
    xpToNextRank = Math.max(0, nextRank.minXp - totalXp);
    daysToNextRank = Math.max(0, nextRank.minDays - successfulDays);
  }

  // Generate 4-5 key milestones for visual journey roadmap
  const totalTargetDays = stats.isOpenEnded ? Math.max(30, Math.ceil((successfulDays + 15) / 10) * 10) : (stats.totalDays || 120);

  const milestoneDays = stats.isOpenEnded
    ? [7, 21, 50, 100]
    : [
        Math.max(1, Math.round(totalTargetDays * 0.1)),
        Math.max(2, Math.round(totalTargetDays * 0.25)),
        Math.max(3, Math.round(totalTargetDays * 0.5)),
        Math.max(4, Math.round(totalTargetDays * 0.75)),
        totalTargetDays
      ];

  const milestones = milestoneDays.map((dayTarget, idx) => {
    const isUnlocked = successfulDays >= dayTarget;
    const isCurrent = !isUnlocked && (idx === 0 || successfulDays >= milestoneDays[idx - 1]);
    return {
      day: dayTarget,
      title: idx === milestoneDays.length - 1 ? 'Ascension' : `Tier ${idx + 1}`,
      isUnlocked,
      isCurrent,
      progress: Math.min(100, Math.round((successfulDays / dayTarget) * 100))
    };
  });

  return {
    currentRank,
    nextRank,
    totalXp,
    progressToNextRank,
    xpToNextRank,
    daysToNextRank,
    milestones
  };
}
