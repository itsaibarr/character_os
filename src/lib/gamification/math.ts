/**
 * Gamification Core Math Library
 */

export type DailyLog = {
  log_date: string;
  completed_count: number;
  failed_count: number;
};

/**
 * Calculates dynamic difficulty bounds based on the user's last 7 days of logs.
 * - Too many fails -> lowers base difficulty multiplier (making tasks easier to complete/gain XP).
 * - High completion rate -> raises base difficulty multiplier.
 * Returns a multiplier between 0.8 (easy) and 1.5 (hard).
 */
export function calculateDifficultyAdjustments(weeklyLogs: DailyLog[]): number {
  if (!weeklyLogs || weeklyLogs.length === 0) return 1.0;

  let totalCompleted = 0;
  let totalFailed = 0;

  for (const log of weeklyLogs) {
    totalCompleted += log.completed_count;
    totalFailed += log.failed_count;
  }

  const totalTasks = totalCompleted + totalFailed;
  if (totalTasks === 0) return 1.0;

  const failureRate = totalFailed / totalTasks;
  const completionRate = totalCompleted / totalTasks;

  // High failure rate (> 40%) -> Trigger recovery mode
  if (failureRate > 0.4) {
    return 0.8; // Lower difficulty thresholds to build momentum
  }

  // Perfect/near-perfect completion (> 90%) -> Trigger hardened mode
  if (completionRate > 0.9) {
    return 1.2; // Increase difficulty, forcing the user to take on harder quests for growth
  }

  return 1.0; // Normal bounds
}
