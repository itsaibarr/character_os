/**
 * Streak system pure functions.
 * All date comparisons use UTC-normalized YYYY-MM-DD strings to avoid timezone drift.
 */

export interface MilestoneReward {
  /** ID of the item to award from the catalog (e.g. 'streak-shield', 'unbreakable-vow') */
  itemId: string;
  /** Bonus XP to award alongside the item */
  bonusXp: number;
  /** Human-readable label for the toast/notification */
  label: string;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  shieldsAvailable: number;
  lastCompletedDate: string | null;
  nextMilestone: 7 | 14 | 30 | null;
  daysUntilMilestone: number | null;
}

// Milestones: streak day → reward
const MILESTONES: Record<number, MilestoneReward> = {
  7:  { itemId: 'streak-shield',    bonusXp: 0,   label: '7-Day Streak! Streak Shield awarded.' },
  14: { itemId: 'iron-resolve',     bonusXp: 50,  label: '14-Day Streak! Iron Resolve + 50 XP awarded.' },
  30: { itemId: 'unbreakable-vow',  bonusXp: 200, label: '30-Day Streak! Unbreakable Vow + 200 XP awarded.' },
};

/**
 * Returns today's date as a YYYY-MM-DD string in the UTC timezone.
 */
export function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns true if the streak is broken (last completed date is not today or yesterday).
 */
export function isStreakBroken(lastCompletedDate: string | null): boolean {
  if (!lastCompletedDate) return true;

  const today = new Date(todayUtc());
  const last = new Date(lastCompletedDate);

  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // 0 = completed today, 1 = completed yesterday → streak intact
  return diffDays > 1;
}

/**
 * Returns true if the user has already logged activity today.
 */
export function hasCompletedToday(lastCompletedDate: string | null): boolean {
  if (!lastCompletedDate) return false;
  return lastCompletedDate === todayUtc();
}

/**
 * Returns the milestone reward if the new streak count hits a milestone threshold.
 * Returns null if the streak is not at a milestone.
 */
export function calculateStreakMilestone(newStreak: number): MilestoneReward | null {
  return MILESTONES[newStreak] ?? null;
}

/**
 * Returns true if a shield should auto-activate to protect the streak.
 */
export function shieldShouldActivate(
  shieldsAvailable: number,
  streakBroken: boolean,
): boolean {
  return streakBroken && shieldsAvailable > 0;
}

/**
 * Given the current streak, returns the next milestone day and days remaining.
 */
export function getNextMilestone(
  currentStreak: number,
): { milestone: 7 | 14 | 30 | null; daysUntil: number | null } {
  const thresholds = [7, 14, 30] as const;
  for (const threshold of thresholds) {
    if (currentStreak < threshold) {
      return { milestone: threshold, daysUntil: threshold - currentStreak };
    }
  }
  return { milestone: null, daysUntil: null };
}
