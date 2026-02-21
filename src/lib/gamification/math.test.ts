import { calculateDifficultyAdjustments } from './math';
import { calculateSynergyMultiplier } from './synergy';
import { rollForLootRarity } from './rng';
import { describe, it, expect } from 'vitest';

describe('Gamification Math Library', () => {
  describe('Synergy Multiplier', () => {
    it('should return 1.0 for Single-stat tasks', () => {
      const stats = { strength_xp: 100, intellect_xp: 50, discipline_xp: 0, charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0 };
      const weights = { str_weight: 5, int_weight: 0, dis_weight: 0, cha_weight: 0, cre_weight: 0, spi_weight: 0 };
      
      expect(calculateSynergyMultiplier(weights, stats)).toBe(1.0);
    });

    it('should return 1.5x for training 1 weak stat and 1 strong stat together', () => {
      // Total XP = 150. Weak threshold (<10%) is <15. 
      // discipline_xp (0) is weak. strength_xp (100) is strong.
      const stats = { strength_xp: 100, intellect_xp: 50, discipline_xp: 0, charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0 };
      const weights = { str_weight: 5, int_weight: 0, dis_weight: 5, cha_weight: 0, cre_weight: 0, spi_weight: 0 };
      
      expect(calculateSynergyMultiplier(weights, stats)).toBe(1.5);
    });

    it('should return 1.0 for brand new users (0 total XP)', () => {
      const stats = { strength_xp: 0, intellect_xp: 0, discipline_xp: 0, charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0 };
      const weights = { str_weight: 5, int_weight: 0, dis_weight: 5, cha_weight: 5, cre_weight: 0, spi_weight: 0 };
      
      expect(calculateSynergyMultiplier(weights, stats)).toBe(1.0);
    });

    it('should return 1.0 for tasks with 0 active weights', () => {
      const stats = { strength_xp: 100, intellect_xp: 50, discipline_xp: 0, charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0 };
      const weights = { str_weight: 0, int_weight: 0, dis_weight: 0, cha_weight: 0, cre_weight: 0, spi_weight: 0 };
      
      expect(calculateSynergyMultiplier(weights, stats)).toBe(1.0);
    });

    it('should return 2.0x for training 2 weak stats together', () => {
       // Total XP = 150. Weak threshold (<10%) is <15. 
      // discipline_xp (0) is weak. charisma_xp (0) is weak.
      const stats = { strength_xp: 100, intellect_xp: 50, discipline_xp: 0, charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0 };
      const weights = { str_weight: 0, int_weight: 0, dis_weight: 5, cha_weight: 5, cre_weight: 0, spi_weight: 0 };
      
      expect(calculateSynergyMultiplier(weights, stats)).toBe(2.0);
    });
  });

  describe('Adaptive Difficulty', () => {
    it('should return 1.0 for normal logs', () => {
      const logs = [
        { log_date: 'Day1', completed_count: 5, failed_count: 1 },
      ];
      expect(calculateDifficultyAdjustments(logs)).toBe(1.0);
    });

    it('should lower difficulty bounds strings when failure rate > 40%', () => {
      const logs = [
        { log_date: 'Day1', completed_count: 1, failed_count: 2 }, // 66% failure rate
      ];
      expect(calculateDifficultyAdjustments(logs)).toBe(0.8);
    });

    it('should raise difficulty bounds when success rate > 90%', () => {
      const logs = [
        { log_date: 'Day1', completed_count: 10, failed_count: 0 }, // 100% success rate
      ];
      expect(calculateDifficultyAdjustments(logs)).toBe(1.2);
    });
  });
});

describe('Gamification RNG Library', () => {
  it('should restrict mythic drop rates precisely over 100,000 rolls', () => {
    let mythicCount = 0;
    const iterations = 100000;
    
    // We mock Math.random to verify exact boundaries if needed, 
    // but running large simulations verifies empirical bounds.
    for(let i=0; i<iterations; i++) {
        if (rollForLootRarity() === 'mythic') mythicCount++;
    }

    const mythicRate = (mythicCount / iterations) * 100;
    
    // Exact requested drop rate is 0.20%
    // Acceptable tolerance due to Math.random(): 0.15% to 0.26%
    expect(mythicRate).toBeGreaterThan(0.15);
    expect(mythicRate).toBeLessThan(0.26);
  });

  it('should return none if bonusMultiplier is 0', () => {
    expect(rollForLootRarity(0)).toBe('none');
  });

  it('should return none if bonusMultiplier is negative', () => {
    expect(rollForLootRarity(-1)).toBe('none');
  });

  it('should return mythic guaranteed if bonusMultiplier is extremely high', () => {
    // 0.002 * 501 = 1.002 (Guaranteed mythic if roll < 1.002)
    // NOTE: Math.random() is strictly less than 1.
    expect(rollForLootRarity(501)).toBe('mythic');
  });
});
