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
