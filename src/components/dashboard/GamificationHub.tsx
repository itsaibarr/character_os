"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import type { Boss, BossAttack, EvolutionNode, HeatmapDataPoint, ActiveBuff, BossHistoryEntry } from "@/lib/gamification/types";
import WeeklyBossBoard from "@/components/dashboard/gamification/WeeklyBossBoard";
import EvolutionTree from "@/components/dashboard/gamification/EvolutionTree";
import AnalyticsHeatmap from "@/components/dashboard/gamification/AnalyticsHeatmap";
import ActiveBuffs from "@/components/dashboard/ActiveBuffs";
import BossHistory from "@/components/dashboard/gamification/BossHistory";

import {
  getActiveWeeklyBoss,
  getHeatmapData,
  getEvolutionStatus,
  generateWeeklyBoss,
  getBossHistory,
} from "@/app/actions/gamification";
import { getActiveBuffs } from "@/app/actions/inventory";
import { toggleTaskStatus } from "@/app/actions/tasks";

interface GamificationHubProps {
  /** Called after any action that changes the user's XP/stats,
   *  so the parent dashboard can refresh the character display. */
  onStatChange?: () => void | Promise<void>;
}

export default function GamificationHub({ onStatChange }: GamificationHubProps) {
  const [boss, setBoss] = useState<{ boss: Boss; attacks: BossAttack[] } | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [evolutionNodes, setEvolutionNodes] = useState<EvolutionNode[]>([]);
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
  const [bossHistory, setBossHistory] = useState<BossHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBoss, setGeneratingBoss] = useState(false);

  const loadAll = useCallback(async () => {
    const [bossResult, heatmapResult, evolutionResult, buffsResult, historyResult] = await Promise.all([
      getActiveWeeklyBoss(),
      getHeatmapData(90),
      getEvolutionStatus(),
      getActiveBuffs(),
      getBossHistory(),
    ]);
    setBoss(bossResult);
    setHeatmapData(heatmapResult);
    setEvolutionNodes(evolutionResult.nodes);
    if (buffsResult.success && buffsResult.data) {
      setActiveBuffs(buffsResult.data);
    }
    setBossHistory(historyResult);
  }, []);

  useEffect(() => {
    loadAll()
      .catch(err => console.error('[GamificationHub] load error:', err))
      .finally(() => setLoading(false));
  }, [loadAll]);

  const handleAttackToggle = useCallback(
    async (taskId: string, _completed: boolean) => {
      await toggleTaskStatus(taskId);
      await loadAll();
      await onStatChange?.();
    },
    [loadAll, onStatChange]
  );

  const handleGenerateBoss = useCallback(async () => {
    setGeneratingBoss(true);
    try {
      const result = await generateWeeklyBoss();
      if (!result.success) {
        toast.error(result.error ?? 'Could not summon boss. Add at least 3 pending tasks first.');
        return;
      }
      await loadAll();
    } finally {
      setGeneratingBoss(false);
    }
  }, [loadAll]);

  if (loading) {
    return (
      <div className="w-full py-10 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {activeBuffs.length > 0 && <ActiveBuffs buffs={activeBuffs} />}
      
      <WeeklyBossBoard
        boss={boss?.boss}
        attacks={boss?.attacks ?? []}
        onAttackToggle={handleAttackToggle}
        onGenerateBoss={handleGenerateBoss}
        generatingBoss={generatingBoss}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalyticsHeatmap data={heatmapData} days={90} />
        <EvolutionTree nodes={evolutionNodes} />
      </div>

      {bossHistory.length > 0 && (
        <div className="mt-2">
          <h3 className="text-[10px] font-black text-faint uppercase tracking-widest mb-3 px-1">
            Boss History
          </h3>
          <BossHistory entries={bossHistory} />
        </div>
      )}
    </div>
  );
}
