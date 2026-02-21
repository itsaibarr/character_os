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
 * Strength > 40% -> Beast
 * Creativity + Charisma -> Mystic
 * Intellect + Discipline -> Techno
 * Charisma + Discipline -> Diplomat
 * Spirituality + Discipline -> Monk
 * Even spread -> Polymath
 */
export function determineEvolutionBranch(stats: UserStats): EvolutionBranch {
  const totalXp = Object.values(stats).reduce((sum, val) => sum + val, 0);
  
  if (totalXp === 0) return 'novice';
  
  const strRatio = stats.strength_xp / totalXp;
  const intRatio = stats.intellect_xp / totalXp;
  const disRatio = stats.discipline_xp / totalXp;
  const chaRatio = stats.charisma_xp / totalXp;
  const creRatio = stats.creativity_xp / totalXp;
  const spiRatio = stats.spirituality_xp / totalXp;
  
  if (strRatio > 0.4) return 'beast';
  
  if ((creRatio + chaRatio) > 0.5) return 'mystic';
  
  if ((intRatio + disRatio) > 0.5) return 'techno';
  
  if ((chaRatio + disRatio) > 0.5) return 'diplomat';
  
  if ((spiRatio + disRatio) > 0.5) return 'monk';
  
  // If no pair is overwhelmingly dominant and spread is relatively even
  return 'polymath';
}
