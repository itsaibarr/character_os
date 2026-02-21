import { describe, it, expect } from 'vitest';
import { calculateCombinedMultiplier } from './buffs';

describe('calculateCombinedMultiplier', () => {
  it('returns 1.0 when no buffs are active', () => {
    expect(calculateCombinedMultiplier([])).toBe(1.0);
    expect(calculateCombinedMultiplier(null as any)).toBe(1.0);
  });

  it('calculates properly for a single xp_boost_all buff', () => {
    const buffs = [
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 1.5 } }
    ];
    expect(calculateCombinedMultiplier(buffs)).toBe(1.5);
  });

  it('combines multiple xp_boost_all buffs multiplicatively', () => {
    const buffs = [
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 1.5 } },
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 1.2 } }
    ];
    // 1.5 * 1.2 = 1.8
    expect(calculateCombinedMultiplier(buffs)).toBeCloseTo(1.8);
  });

  it('caps the multiplier at 3.0x', () => {
    const buffs = [
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 2.0 } },
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 2.0 } }
    ];
    // 2.0 * 2.0 = 4.0, should be capped at 3.0
    expect(calculateCombinedMultiplier(buffs)).toBe(3.0);
  });

  it('applies xp_boost_stat only if statFilter matches', () => {
    const buffs = [
      { effect_type: 'xp_boost_stat', effect_value: { multiplier: 2.0, stat: 'intellect' } },
      { effect_type: 'xp_boost_stat', effect_value: { multiplier: 1.5, stat: 'strength' } }
    ];
    
    expect(calculateCombinedMultiplier(buffs, 'intellect')).toBe(2.0);
    expect(calculateCombinedMultiplier(buffs, 'strength')).toBe(1.5);
    expect(calculateCombinedMultiplier(buffs, 'discipline')).toBe(1.0);
  });

  it('combines global and stat-specific buffs', () => {
    const buffs = [
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 1.2 } },
      { effect_type: 'xp_boost_stat', effect_value: { multiplier: 1.5, stat: 'intellect' } }
    ];
    
    // For intellect: 1.2 * 1.5 = 1.8
    expect(calculateCombinedMultiplier(buffs, 'intellect')).toBeCloseTo(1.8);
    // For others: 1.2
    expect(calculateCombinedMultiplier(buffs, 'strength')).toBe(1.2);
  });

  it('ignores non-xp_boost effect types', () => {
    const buffs = [
      { effect_type: 'xp_boost_all', effect_value: { multiplier: 1.5 } },
      { effect_type: 'streak_shield', effect_value: {} }
    ];
    expect(calculateCombinedMultiplier(buffs)).toBe(1.5);
  });

  it('handles custom multipliers (defaults to 1.0 if missing)', () => {
    const buffs = [
      { effect_type: 'xp_boost_all', effect_value: {} }
    ];
    expect(calculateCombinedMultiplier(buffs)).toBe(1.0);
  });
});
