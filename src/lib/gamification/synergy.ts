export type UserStats = {
  strength_xp: number;
  intellect_xp: number;
  discipline_xp: number;
  charisma_xp: number;
  creativity_xp: number;
  spirituality_xp: number;
};

export type TaskWeights = {
  str_weight: number;
  int_weight: number;
  dis_weight: number;
  cha_weight: number;
  cre_weight: number;
  spi_weight: number;
};

/**
 * Calculates a synergy multiplier based on the task weights and user's current stats.
 * If a task develops 2 or more stats, AND those stats are currently the user's *weakest* stats (bottom 30% of their distribution),
 * it awards a synergy bonus (e.g., 1.5x to 2x).
 */
export function calculateSynergyMultiplier(weights: TaskWeights, stats: UserStats): number {
  const activeWeights = Object.entries(weights).filter(([, weight]) => weight > 0);
  
  // Synergy requires at least 2 attributes being developed
  if (activeWeights.length < 2) return 1.0;

  // Calculate the user's total XP and average to find "weak" stats
  const totalUserXp = Object.values(stats).reduce((sum, val) => sum + val, 0);
  
  // If brand new user, no synergy bonus yet
  if (totalUserXp === 0) return 1.0;

  // Let's say a stat is "weak" if it makes up less than 10% of their total XP
  const weakThreshold = totalUserXp * 0.10;
  
  // Map internal weight keys to user stat keys
  const weightToStatKey: Record<string, keyof UserStats> = {
    str_weight: 'strength_xp',
    int_weight: 'intellect_xp',
    dis_weight: 'discipline_xp',
    cha_weight: 'charisma_xp',
    cre_weight: 'creativity_xp',
    spi_weight: 'spirituality_xp',
  };

  let weakStatsTrained = 0;
  
  for (const [weightKey] of activeWeights) {
    const statKey = weightToStatKey[weightKey];
    if (stats[statKey] < weakThreshold) {
      weakStatsTrained++;
    }
  }

  // If training 1 weak stat alongside a strong one: 1.5x bonus
  // If training 2+ weak stats: 2.0x bonus
  if (weakStatsTrained >= 2) return 2.0;
  if (weakStatsTrained === 1) return 1.5;

  return 1.0;
}
