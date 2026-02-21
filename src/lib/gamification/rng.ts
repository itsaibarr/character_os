/**
 * Gamification Core RNG & Loot Library
 */

export type ItemRarity = 'mythic' | 'rare' | 'uncommon' | 'common' | 'none';

/**
 * Standard drop table percentages.
 * - Mythic: 0.2%
 * - Rare: 2%
 * - Uncommon: 10%
 * - Common: 20%
 * - None: 67.8%
 */
const DROP_RATES = {
  mythic: 0.002,
  rare: 0.02,
  uncommon: 0.10,
  common: 0.20,
};

/**
 * Rolls for loot rarity upon task or boss completion.
 * @param bonusMultiplier Modifies the drop rate (e.g. 1.5 for a boss fight)
 * @returns The rarity of the dropped item, or 'none'
 */
export function rollForLootRarity(bonusMultiplier: number = 1.0): ItemRarity {
  const roll = Math.random(); // 0.0 to 1.0

  // We check from rarest to most common
  // The cumulative probability determines the threshold

  let cumulativeProbability = 0;

  cumulativeProbability += DROP_RATES.mythic * bonusMultiplier;
  if (roll < cumulativeProbability) return 'mythic';

  cumulativeProbability += DROP_RATES.rare * bonusMultiplier;
  if (roll < cumulativeProbability) return 'rare';

  cumulativeProbability += DROP_RATES.uncommon * bonusMultiplier;
  if (roll < cumulativeProbability) return 'uncommon';

  cumulativeProbability += DROP_RATES.common * bonusMultiplier;
  if (roll < cumulativeProbability) return 'common';

  return 'none';
}
