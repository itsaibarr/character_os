import { UserStats } from './synergy';

export type EvolutionBranch = 
  | 'novice' 
  | 'beast' 
  | 'mystic' 
  | 'techno' 
  | 'diplomat' 
  | 'monk' 
  | 'polymath';

const MILESTONES = [5, 10, 20, 35, 50, 75, 100];

/**
 * Determines if the current level triggers a branching event.
 */
export function isMilestoneLevel(level: number): boolean {
  return MILESTONES.includes(level);
}

/**
 * Evaluates the dominant stats to determine the evolution branch.
 * Branches are gated by level requirements:
 *   Lv.5  — Beast (STR > 40%), Mystic (CRE+CHA > 50%), Techno (INT+DIS > 50%)
 *   Lv.10 — Diplomat (CHA+DIS > 50%), Monk (SPI+DIS > 50%)
 *   Lv.20 — Polymath (even spread)
 * Users below the required level stay 'novice'.
 */
export function determineEvolutionBranch(stats: UserStats, level = 1): EvolutionBranch {
  const totalXp = Object.values(stats).reduce((sum, val) => sum + val, 0);
  
  if (totalXp === 0) return 'novice';
  
  const strRatio = stats.strength_xp / totalXp;
  const intRatio = stats.intellect_xp / totalXp;
  const disRatio = stats.discipline_xp / totalXp;
  const chaRatio = stats.charisma_xp / totalXp;
  const creRatio = stats.creativity_xp / totalXp;
  const spiRatio = stats.spirituality_xp / totalXp;

  // Level 20+ — Polymath (even spread: no single pair > 50%, no single stat > 40%)
  if (level >= 20) {
    const maxRatio = Math.max(strRatio, intRatio, disRatio, chaRatio, creRatio, spiRatio);
    if (maxRatio <= 0.4) return 'polymath';
  }

  // Level 10+ branches
  if (level >= 10) {
    if ((chaRatio + disRatio) > 0.5) return 'diplomat';
    if ((spiRatio + disRatio) > 0.5) return 'monk';
  }

  // Level 5+ branches
  if (level >= 5) {
    if (strRatio > 0.4) return 'beast';
    if ((creRatio + chaRatio) > 0.5) return 'mystic';
    if ((intRatio + disRatio) > 0.5) return 'techno';
  }

  // Below required level or no dominant pair → novice
  return 'novice';
}
