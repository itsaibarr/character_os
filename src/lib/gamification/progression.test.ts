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
      expect(determineEvolutionBranch(stats)).toBe('novice');
    });

    it('evolves to "beast" if strength dominates (>40%)', () => {
      const stats = { strength_xp: 410, intellect_xp: 100, discipline_xp: 100, charisma_xp: 100, creativity_xp: 100, spirituality_xp: 190 };
      expect(determineEvolutionBranch(stats)).toBe('beast');
    });

    it('evolves to "mystic" if creativity + charisma > 50%', () => {
      const stats = { strength_xp: 0, intellect_xp: 0, discipline_xp: 0, charisma_xp: 300, creativity_xp: 210, spirituality_xp: 0 };
      expect(determineEvolutionBranch(stats)).toBe('mystic');
    });

    it('evolves to "techno" if intellect + discipline > 50%', () => {
       const stats = { strength_xp: 100, intellect_xp: 350, discipline_xp: 200, charisma_xp: 100, creativity_xp: 100, spirituality_xp: 150 };
      expect(determineEvolutionBranch(stats)).toBe('techno'); 
    });

    it('evolves to "diplomat" if charisma + discipline > 50%', () => {
      const stats = { strength_xp: 100, intellect_xp: 100, discipline_xp: 250, charisma_xp: 300, creativity_xp: 100, spirituality_xp: 150 };
      expect(determineEvolutionBranch(stats)).toBe('diplomat');
    });

    it('evolves to "monk" if spirituality + discipline > 50%', () => {
      const stats = { strength_xp: 100, intellect_xp: 100, discipline_xp: 250, charisma_xp: 100, creativity_xp: 100, spirituality_xp: 350 };
      expect(determineEvolutionBranch(stats)).toBe('monk');
    });

    it('defaults to "polymath" if balanced stats across the board', () => {
      const stats = { strength_xp: 1000, intellect_xp: 1000, discipline_xp: 1000, charisma_xp: 1000, creativity_xp: 1000, spirituality_xp: 1000 };
      expect(determineEvolutionBranch(stats)).toBe('polymath');
    });
  });
});
