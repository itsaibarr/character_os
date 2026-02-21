/**
 * Static item catalog for the loot system.
 * Items are defined here and seeded into the `items` DB table by Agent 3.
 * Runtime loot rolls reference this catalog to avoid a DB query per roll.
 */

import type { ItemRarity } from './rng';

export type EffectType =
  | 'xp_boost_all'
  | 'xp_boost_stat'
  | 'streak_shield'
  | 'stat_reset'
  | 'evolution_catalyst'
  | 'permanent_stat'
  | 'cosmetic';

export interface ItemEffect {
  stat?: string;
  multiplier?: number;
  durationHours?: number;
  amount?: number;
  days?: number; // Used by streak shields with multi-day protection windows
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  effectType: EffectType;
  effectValue: ItemEffect;
  consumable: boolean;
}

/**
 * 18 items across 4 rarities.
 *
 * IDs are deterministic slugs — Agent 3's seed script will insert these
 * into the `items` table with matching UUIDs generated from these slugs.
 */
export const ITEM_CATALOG: CatalogItem[] = [
  // ── Common (7 items) ──────────────────────────────────────────────
  {
    id: 'minor-xp-potion',
    name: 'Minor XP Potion',
    description: '+10% all XP for 1 hour.',
    rarity: 'common',
    effectType: 'xp_boost_all',
    effectValue: { multiplier: 1.10, durationHours: 1 },
    consumable: true,
  },
  {
    id: 'focus-tonic',
    name: 'Focus Tonic',
    description: '+15% Discipline XP for 2 hours.',
    rarity: 'common',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'discipline', multiplier: 1.15, durationHours: 2 },
    consumable: true,
  },
  {
    id: 'strength-draught',
    name: 'Strength Draught',
    description: '+15% Strength XP for 2 hours.',
    rarity: 'common',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'strength', multiplier: 1.15, durationHours: 2 },
    consumable: true,
  },
  {
    id: 'intellect-brew',
    name: 'Intellect Brew',
    description: '+15% Intellect XP for 2 hours.',
    rarity: 'common',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'intellect', multiplier: 1.15, durationHours: 2 },
    consumable: true,
  },
  {
    id: 'charisma-elixir',
    name: 'Charisma Elixir',
    description: '+15% Charisma XP for 2 hours.',
    rarity: 'common',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'charisma', multiplier: 1.15, durationHours: 2 },
    consumable: true,
  },
  {
    id: 'creativity-spark',
    name: 'Creativity Spark',
    description: '+15% Creativity XP for 2 hours.',
    rarity: 'common',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'creativity', multiplier: 1.15, durationHours: 2 },
    consumable: true,
  },
  {
    id: 'spirit-incense',
    name: 'Spirit Incense',
    description: '+15% Spirituality XP for 2 hours.',
    rarity: 'common',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'spirituality', multiplier: 1.15, durationHours: 2 },
    consumable: true,
  },

  // ── Uncommon (5 items) ────────────────────────────────────────────
  {
    id: 'streak-shield',
    name: 'Streak Shield',
    description: 'Prevents streak loss for one missed day.',
    rarity: 'uncommon',
    effectType: 'streak_shield',
    effectValue: { amount: 1 },
    consumable: true,
  },
  {
    id: 'xp-potion',
    name: 'XP Potion',
    description: '+20% all XP for 2 hours.',
    rarity: 'uncommon',
    effectType: 'xp_boost_all',
    effectValue: { multiplier: 1.20, durationHours: 2 },
    consumable: true,
  },
  {
    id: 'balanced-tonic',
    name: 'Balanced Tonic',
    description: '+25% XP for your weakest stat for 3 hours.',
    rarity: 'uncommon',
    effectType: 'xp_boost_stat',
    effectValue: { stat: 'weakest', multiplier: 1.25, durationHours: 3 },
    consumable: true,
  },
  {
    id: 'stat-reset-scroll',
    name: 'Stat Reset Scroll',
    description: 'Redistribute 50 XP across your stats.',
    rarity: 'uncommon',
    effectType: 'stat_reset',
    effectValue: { amount: 50 },
    consumable: true,
  },
  {
    id: 'task-amplifier',
    name: 'Task Amplifier',
    description: '+30% XP from your next 5 task completions.',
    rarity: 'uncommon',
    effectType: 'xp_boost_all',
    effectValue: { multiplier: 1.30, durationHours: 4 },
    consumable: true,
  },

  // ── Rare (4 items) ────────────────────────────────────────────────
  {
    id: 'evolution-catalyst',
    name: 'Evolution Catalyst',
    description: 'Preview your next evolution branch before reaching the required level.',
    rarity: 'rare',
    effectType: 'evolution_catalyst',
    effectValue: {},
    consumable: true,
  },
  {
    id: 'double-xp-elixir',
    name: 'Double XP Elixir',
    description: '2x all XP for 3 hours.',
    rarity: 'rare',
    effectType: 'xp_boost_all',
    effectValue: { multiplier: 2.0, durationHours: 3 },
    consumable: true,
  },
  {
    id: 'grand-streak-shield',
    name: 'Grand Streak Shield',
    description: 'Prevents streak loss for 3 consecutive missed days.',
    rarity: 'rare',
    effectType: 'streak_shield',
    effectValue: { amount: 3 },
    consumable: true,
  },
  {
    id: 'iron-resolve',
    name: 'Iron Resolve',
    description: 'Your will is iron. Prevents streak loss for 2 consecutive missed days.',
    rarity: 'rare',
    effectType: 'streak_shield',
    effectValue: { amount: 2 },
    consumable: true,
  },
  {
    id: 'mentor-scroll',
    name: 'Mentor Scroll',
    description: '+50% XP for your two weakest stats for 4 hours.',
    rarity: 'rare',
    effectType: 'xp_boost_all',
    effectValue: { multiplier: 1.50, durationHours: 4 },
    consumable: true,
  },

  // ── Mythic (3 items) ──────────────────────────────────────────────
  {
    id: 'unbreakable-vow',
    name: 'Unbreakable Vow',
    description: 'A mythic pact. Shields your streak from any missed days for 7 days.',
    rarity: 'mythic',
    effectType: 'streak_shield',
    effectValue: { days: 7 },
    consumable: true,
  },
  {
    id: 'polymath-tome',
    name: 'Polymath Tome',
    description: 'Permanently grants +5 XP to all stats.',
    rarity: 'mythic',
    effectType: 'permanent_stat',
    effectValue: { amount: 5 },
    consumable: true,
  },
  {
    id: 'boss-slayer-title',
    name: 'Boss Slayer Title',
    description: 'A cosmetic title earned by the rarest warriors.',
    rarity: 'mythic',
    effectType: 'cosmetic',
    effectValue: {},
    consumable: false,
  },
];

/**
 * Returns all items matching the given rarity.
 */
export function getItemsByRarity(rarity: ItemRarity): CatalogItem[] {
  return ITEM_CATALOG.filter(item => item.rarity === rarity);
}

/**
 * Picks a random item of the given rarity.
 * Returns null if no items exist for that rarity (shouldn't happen with a valid catalog).
 */
export function getRandomItemByRarity(rarity: ItemRarity): CatalogItem | null {
  const pool = getItemsByRarity(rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
