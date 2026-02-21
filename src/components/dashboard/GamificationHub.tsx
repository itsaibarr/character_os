"use client";

import { useState, useEffect, useCallback } from "react";

import WeeklyBossBoard, {
  type Boss,
  type BossAttack,
} from "@/components/dashboard/gamification/WeeklyBossBoard";
import EvolutionTree, {
  type EvolutionNode,
} from "@/components/dashboard/gamification/EvolutionTree";
import AnalyticsHeatmap, {
  type HeatmapDataPoint,
} from "@/components/dashboard/gamification/AnalyticsHeatmap";

import {
  generateWeeklyBoss,
} from "@/app/actions/gamification";
import { toggleTaskStatus } from "@/app/actions/tasks";

// TODO: Remove stubs once Agent 1 merges (adds these to src/app/actions/gamification.ts)
async function getActiveWeeklyBoss(): Promise<{ boss: Boss; attacks: BossAttack[] } | null> {
  return null;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getHeatmapData(days?: number): Promise<HeatmapDataPoint[]> {
  return [];
}
async function getEvolutionStatus(): Promise<{ nodes: EvolutionNode[] }> {
  return { nodes: [] };
}

interface GamificationHubProps {
  /** Called after any action that changes the user's XP/stats,
   *  so the parent dashboard can refresh the character display. */
  onStatChange?: () => void | Promise<void>;
}

export default function GamificationHub({ onStatChange }: GamificationHubProps) {
  const [boss, setBoss] = useState<{ boss: Boss; attacks: BossAttack[] } | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [evolutionNodes, setEvolutionNodes] = useState<EvolutionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBoss, setGeneratingBoss] = useState(false);

  const loadAll = useCallback(async () => {
    const [bossResult, heatmapResult, evolutionResult] = await Promise.all([
      getActiveWeeklyBoss(),
      getHeatmapData(90),
      getEvolutionStatus(),
    ]);
    setBoss(bossResult);
    setHeatmapData(heatmapResult);
    setEvolutionNodes(evolutionResult.nodes);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
      .catch(err => console.error('[GamificationHub] load error:', err))
      .finally(() => setLoading(false));
  }, [loadAll]);

  const handleAttackToggle = useCallback(
    async (taskId: string) => {
      await toggleTaskStatus(taskId);
      await loadAll();
      await onStatChange?.();
    },
    [loadAll, onStatChange]
  );

  const handleGenerateBoss = useCallback(async () => {
    setGeneratingBoss(true);
    await generateWeeklyBoss();
    await loadAll();
    setGeneratingBoss(false);
  }, [loadAll]);

  if (loading) {
    return (
      <div className="w-full py-10 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="flex flex-col gap-8">
        <WeeklyBossBoard
          boss={boss?.boss}
          attacks={boss?.attacks ?? []}
          onAttackToggle={handleAttackToggle}
          onGenerateBoss={handleGenerateBoss}
          generatingBoss={generatingBoss}
        />
        <EvolutionTree nodes={evolutionNodes} />
      </div>

      <div className="flex flex-col gap-8">
        <AnalyticsHeatmap data={heatmapData} days={90} />
      </div>
    </div>
  );
}
