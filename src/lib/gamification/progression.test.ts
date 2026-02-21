import { isMilestoneLevel, determineEvolutionBranch } from './progression';
import { describe, it, expect } from 'vitest';

describe('Gamification Progression Library', () => {
  describe('isMilestoneLevel', () => {
    it('returns true for defined milestones', () => {
      expect(isMilestoneLevel(5)).toBe(true);
      expect(isMilestoneLevel(10)).toBe(true);
      expect(isMilestoneLevel(20)).toBe(true);
      expect(isMilestoneLevel(35)).toBe(true);
      expect(isMilestoneLevel(100)).toBe(true);
    });

    it('returns false for non-milestones', () => {
      expect(isMilestoneLevel(4)).toBe(false);
      expect(isMilestoneLevel(11)).toBe(false);
      expect(isMilestoneLevel(99)).toBe(false);
    });
  });

  describe('determineEvolutionBranch', () => {
    it('returns "novice" if stats are all 0', () => {
      const stats = { strength_xp: 0, intellect_xp: 0, discipline_xp: 0, charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0 };
      expect(determineEvolutionBranch(stats, 1)).toBe('novice');
    });

    it('returns "novice" when stats have dominant pair but level is too low', () => {
      // This is the exact bug scenario: cha+dis > 50% but user is only level 1
      const stats = { strength_xp: 0, intellect_xp: 0, discipline_xp: 2, charisma_xp: 1, creativity_xp: 0, spirituality_xp: 0 };
      expect(determineEvolutionBranch(stats, 1)).toBe('novice');
    });

    it('evolves to "beast" if strength dominates (>40%) at level 5+', () => {
      const stats = { strength_xp: 410, intellect_xp: 100, discipline_xp: 100, charisma_xp: 100, creativity_xp: 100, spirituality_xp: 190 };
      expect(determineEvolutionBranch(stats, 5)).toBe('beast');
    });

    it('evolves to "mystic" if creativity + charisma > 50% at level 5+', () => {
      const stats = { strength_xp: 0, intellect_xp: 0, discipline_xp: 0, charisma_xp: 300, creativity_xp: 210, spirituality_xp: 0 };
      expect(determineEvolutionBranch(stats, 5)).toBe('mystic');
    });

    it('evolves to "techno" if intellect + discipline > 50% at level 5+', () => {
       const stats = { strength_xp: 100, intellect_xp: 350, discipline_xp: 200, charisma_xp: 100, creativity_xp: 100, spirituality_xp: 150 };
      expect(determineEvolutionBranch(stats, 5)).toBe('techno'); 
    });

    it('evolves to "diplomat" if charisma + discipline > 50% at level 10+', () => {
      const stats = { strength_xp: 100, intellect_xp: 100, discipline_xp: 250, charisma_xp: 300, creativity_xp: 100, spirituality_xp: 150 };
      expect(determineEvolutionBranch(stats, 10)).toBe('diplomat');
    });

    it('does NOT evolve to "diplomat" at level 5 even with dominant cha+dis', () => {
      const stats = { strength_xp: 100, intellect_xp: 100, discipline_xp: 250, charisma_xp: 300, creativity_xp: 100, spirituality_xp: 150 };
      expect(determineEvolutionBranch(stats, 5)).toBe('novice');
    });

    it('evolves to "monk" if spirituality + discipline > 50% at level 10+', () => {
      const stats = { strength_xp: 100, intellect_xp: 100, discipline_xp: 250, charisma_xp: 100, creativity_xp: 100, spirituality_xp: 350 };
      expect(determineEvolutionBranch(stats, 10)).toBe('monk');
    });

    it('defaults to "polymath" if balanced stats at level 20+', () => {
      const stats = { strength_xp: 1000, intellect_xp: 1000, discipline_xp: 1000, charisma_xp: 1000, creativity_xp: 1000, spirituality_xp: 1000 };
      expect(determineEvolutionBranch(stats, 20)).toBe('polymath');
    });
  });
});
