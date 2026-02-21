import { describe, it, expect } from 'vitest';
import { calculateSynergyMultiplier, type UserStats, type TaskWeights } from './synergy';

describe('calculateSynergyMultiplier', () => {
  const defaultStats: UserStats = {
    strength_xp: 100,
    intellect_xp: 100,
    discipline_xp: 100,
    charisma_xp: 100,
    creativity_xp: 100,
    spirituality_xp: 100,
  };

  const zeroStats: UserStats = {
    strength_xp: 0,
    intellect_xp: 0,
    discipline_xp: 0,
    charisma_xp: 0,
    creativity_xp: 0,
    spirituality_xp: 0,
  };

  const emptyWeights: TaskWeights = {
    str_weight: 0,
    int_weight: 0,
    dis_weight: 0,
    cha_weight: 0,
    cre_weight: 0,
    spi_weight: 0,
  };

  it('returns 1.0 for zero stats (brand new user)', () => {
    const weights: TaskWeights = { ...emptyWeights, str_weight: 3, int_weight: 3 };
    expect(calculateSynergyMultiplier(weights, zeroStats)).toBe(1.0);
  });

  it('returns 1.0 for single weight task', () => {
    const weights: TaskWeights = { ...emptyWeights, str_weight: 3 };
    expect(calculateSynergyMultiplier(weights, defaultStats)).toBe(1.0);
  });

  it('returns 1.0 when no weights provided', () => {
    expect(calculateSynergyMultiplier(emptyWeights, defaultStats)).toBe(1.0);
  });

  it('returns 2.0 when training 2 weak stats (below 10% threshold)', () => {
    // Total XP = 1000. Threshold = 100.
    const stats: UserStats = {
      strength_xp: 50,    // Weak
      intellect_xp: 50,   // Weak
      discipline_xp: 300,
      charisma_xp: 200,
      creativity_xp: 200,
      spirituality_xp: 200,
    };
    const weights: TaskWeights = { ...emptyWeights, str_weight: 1, int_weight: 1 };
    expect(calculateSynergyMultiplier(weights, stats)).toBe(2.0);
  });

  it('returns 1.5 when training 1 weak and 1 strong stat', () => {
    // Total XP = 1000. Threshold = 100.
    const stats: UserStats = {
      strength_xp: 50,    // Weak
      intellect_xp: 500,  // Strong
      discipline_xp: 150,
      charisma_xp: 100,   // Not weak (threshold is 100, and 100 < 100 is false in code)
      creativity_xp: 100,
      spirituality_xp: 100,
    };
    const weights: TaskWeights = { ...emptyWeights, str_weight: 1, int_weight: 1 };
    expect(calculateSynergyMultiplier(weights, stats)).toBe(1.5);
  });

  it('returns 1.0 when training 2 strong stats (no weak stats)', () => {
    const stats: UserStats = {
      strength_xp: 200,
      intellect_xp: 200,
      discipline_xp: 200,
      charisma_xp: 200,
      creativity_xp: 100,
      spirituality_xp: 100,
    };
    const weights: TaskWeights = { ...emptyWeights, str_weight: 1, int_weight: 1 };
    expect(calculateSynergyMultiplier(weights, stats)).toBe(1.0);
  });

  it('verifies the 10% threshold boundary condition', () => {
    // Total XP = 1000. Threshold = 100.
    // stats[statKey] < weakThreshold (100 in this case)
    const stats: UserStats = {
      strength_xp: 99,    // Weak
      intellect_xp: 100,  // NOT Weak
      discipline_xp: 300,
      charisma_xp: 200,
      creativity_xp: 200,
      spirituality_xp: 101,
    };
    const weights: TaskWeights = { ...emptyWeights, str_weight: 1, int_weight: 1 };
    expect(calculateSynergyMultiplier(weights, stats)).toBe(1.5);
  });

  it('returns 2.0 when training 3 stats, 2 of which are weak', () => {
    // Total XP = 1000. Threshold = 100.
    const stats: UserStats = {
      strength_xp: 50,    // Weak
      intellect_xp: 50,   // Weak
      discipline_xp: 500, // Strong
      charisma_xp: 200,
      creativity_xp: 100,
      spirituality_xp: 100,
    };
    const weights: TaskWeights = { ...emptyWeights, str_weight: 1, int_weight: 1, dis_weight: 1 };
    expect(calculateSynergyMultiplier(weights, stats)).toBe(2.0);
  });
});
