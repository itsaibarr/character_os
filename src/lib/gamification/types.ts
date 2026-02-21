/**
 * Shared gamification types used by both server actions and UI components.
 * IMPORTANT: Never export types or constants from "use server" modules.
 * Turbopack resolves all exports as runtime values, causing crashes.
 */

// ─── Server Action Response ──────────────────────────────────────────────────
export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

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

// ─── Phase 3 type re-exports ──────────────────────────────────────────────────
// Re-exported here so consumers can import Phase 3 types from one central place.
// IMPORTANT: Never re-export types from "use server" modules. Turbopack resolves
// them as runtime values, causing ReferenceErrors. Import from pure libs instead.
export type { ExtractedTask } from "@/lib/ai";
export type { StreakStatus } from "@/lib/gamification/streak";

// Stat key → human label mapping. Shared across analytics, insights, and other components.
export const STAT_KEYS = ["str", "int", "dis", "cha", "cre", "spi"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  str: "Strength",
  int: "Intellect",
  dis: "Discipline",
  cha: "Charisma",
  cre: "Creativity",
  spi: "Spirituality",
};

export interface AttributeDrift {
  attribute: "str" | "int" | "dis" | "cha" | "cre" | "spi";
  direction: "rising" | "lagging";
  deltaPct: number;
}

export interface AnalyticsInsights {
  attributeDrift: AttributeDrift[];
  /** Top 3 task categories by count (using difficulty as category) */
  categoryDistribution: Array<{ category: string; pct: number }>;
  /** 0–1 score. >0.75 = warning level (1.25x of normal load). */
  burnoutScore: number;
  /** e.g. 1.3 means "1.3x normal load" */
  burnoutMultiplier: number;
}
