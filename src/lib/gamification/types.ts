/**
 * Shared gamification types used by both server actions and UI components.
 * Imported here to keep server actions free of "use client" file dependencies.
 */

export interface Boss {
  id: string;
  title: string;
  description: string;
  hpTotal: number;
  hpCurrent: number;
  expiresAt: string;
}

export interface BossAttack {
  id: string;
  title: string;
  damage: number;
  completed: boolean;
}

export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface EvolutionNode {
  id: string;
  name: string;
  levelReq: number;
  condition: string;
  isUnlocked: boolean;
  isActive: boolean;
}

export type ItemRarity = "common" | "uncommon" | "rare" | "mythic";

export type ItemEffectType =
  | "xp_boost"
  | "xp_boost_all"
  | "xp_boost_stat"
  | "streak_shield"
  | "evolution_catalyst"
  | "stat_reset"
  | "temp_buff"
  | "permanent_stat"
  | "cosmetic"
  | "title"
  | "permanent_boost";

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  effectType: ItemEffectType;
  quantity: number;
  consumable: boolean;
}

export interface ActiveBuff {
  id: string;
  name: string;
  effectType: string;
  effectValue: number;
  expiresAt: string;
  remainingMinutes: number;
}

export interface LootDrop {
  itemId: string;
  itemName: string;
  rarity: string;
  description: string;
}

export interface BossDefeatReward {
  bonusXp: number;
  lootDrop: LootDrop | null;
}

export interface BossHistoryEntry {
  id: string;
  title: string;
  outcome: "defeated" | "escaped";
  completedAt: string;
}
