import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rollForLootRarity } from './rng';

describe('rollForLootRarity', () => {
  const originalRandom = Math.random;

  beforeEach(() => {
    // We'll mock Math.random in each test
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('drops mythic when roll is below mythic threshold', () => {
    // Mythic rate = 0.002. Multiplier = 1.0.
    Math.random = vi.fn().mockReturnValue(0.001);
    expect(rollForLootRarity(1.0)).toBe('mythic');
  });

  it('drops rare when roll is above mythic but below rare threshold', () => {
    // Mythic = 0.002, Rare = 0.02. Cumulative = 0.022.
    Math.random = vi.fn().mockReturnValue(0.01);
    expect(rollForLootRarity(1.0)).toBe('rare');
  });

  it('drops uncommon when roll is above rare but below uncommon threshold', () => {
    // Mythic = 0.002, Rare = 0.02, Uncommon = 0.10. Cumulative = 0.122.
    Math.random = vi.fn().mockReturnValue(0.05);
    expect(rollForLootRarity(1.0)).toBe('uncommon');
  });

  it('drops common when roll is above uncommon but below common threshold', () => {
    // Mythic = 0.002, Rare = 0.02, Uncommon = 0.10, Common = 0.20. Cumulative = 0.322.
    Math.random = vi.fn().mockReturnValue(0.25);
    expect(rollForLootRarity(1.0)).toBe('common');
  });

  it('drops none when roll is above common threshold', () => {
    Math.random = vi.fn().mockReturnValue(0.5);
    expect(rollForLootRarity(1.0)).toBe('none');
  });

  it('increases thresholds with a bonus multiplier', () => {
    // multiplier = 2.0
    // Mythic threshold = 0.002 * 2 = 0.004
    // Rare threshold = (0.002 + 0.02) * 2 = 0.044
    // Uncommon threshold = (0.002 + 0.02 + 0.10) * 2 = 0.244
    // Common threshold = (0.002 + 0.02 + 0.10 + 0.20) * 2 = 0.644

    Math.random = vi.fn().mockReturnValue(0.003);
    expect(rollForLootRarity(2.0)).toBe('mythic');

    Math.random = vi.fn().mockReturnValue(0.2);
    expect(rollForLootRarity(2.0)).toBe('uncommon');

    Math.random = vi.fn().mockReturnValue(0.5);
    expect(rollForLootRarity(2.0)).toBe('common');
  });

  it('never drops anything if bonusMultiplier is 0', () => {
    Math.random = vi.fn().mockReturnValue(0.0000001);
    expect(rollForLootRarity(0)).toBe('none');
  });

  it('guarantees common or better if multiplier is extremely high', () => {
    // multiplier = 100.0
    // Mythic threshold = 0.002 * 100 = 0.2
    // Rare threshold = (0.002 + 0.02) * 100 = 2.2 (always true)
    Math.random = vi.fn().mockReturnValue(0.9);
    expect(rollForLootRarity(100.0)).toBe('rare'); // Rare threshold is 2.2, so it hits rare if it missed mythic
  });
});
