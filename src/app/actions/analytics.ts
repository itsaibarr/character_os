"use server";

import { createClient } from "@/utils/supabase/server";
import type { ActionResponse } from "@/lib/gamification/types";
import type { AnalyticsInsights, AttributeDrift } from "@/lib/gamification/types";
import { STAT_KEYS, type StatKey } from "@/lib/gamification/types";

/**
 * Returns analytics insights for the dashboard panel.
 * All queries are read-only against existing tables — no new schema required.
 */
export async function getAnalyticsInsights(): Promise<
  ActionResponse<AnalyticsInsights>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // ── 1. All-time XP from characters table ──────────────────────────
    const { data: charData } = await supabase
      .from("characters")
      .select("str_xp, int_xp, dis_xp, cha_xp, cre_xp, spi_xp")
      .eq("user_id", user.id)
      .maybeSingle();

    const allTimeXp: Record<StatKey, number> = {
      str: charData?.str_xp ?? 0,
      int: charData?.int_xp ?? 0,
      dis: charData?.dis_xp ?? 0,
      cha: charData?.cha_xp ?? 0,
      cre: charData?.cre_xp ?? 0,
      spi: charData?.spi_xp ?? 0,
    };

    const allTimeTotal = Object.values(allTimeXp).reduce((a, b) => a + b, 0);

    // ── 2. 7-day task XP contribution ─────────────────────────────────
    // Use task weights as a proxy for stat contribution.
    // XP_base = difficulty multiplier: low=1, medium=1.5, high=2
    const { data: recentTasks } = await supabase
      .from("tasks")
      .select(
        "str_weight, int_weight, dis_weight, cha_weight, cre_weight, spi_weight, difficulty",
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("updated_at", sevenDaysAgo.toISOString());

    const recentXp: Record<StatKey, number> = {
      str: 0, int: 0, dis: 0, cha: 0, cre: 0, spi: 0,
    };

    const difficultyXpBase = (d: string | null) =>
      d === "high" ? 2 : d === "medium" ? 1.5 : 1;

    for (const t of recentTasks ?? []) {
      const base = difficultyXpBase(t.difficulty);
      recentXp.str += (t.str_weight ?? 0) * base;
      recentXp.int += (t.int_weight ?? 0) * base;
      recentXp.dis += (t.dis_weight ?? 0) * base;
      recentXp.cha += (t.cha_weight ?? 0) * base;
      recentXp.cre += (t.cre_weight ?? 0) * base;
      recentXp.spi += (t.spi_weight ?? 0) * base;
    }

    const recentTotal = Object.values(recentXp).reduce((a, b) => a + b, 0);

    // ── 3. Compute attribute drift ─────────────────────────────────────
    const attributeDrift: AttributeDrift[] = [];

    if (allTimeTotal > 0 && recentTotal > 0) {
      for (const stat of STAT_KEYS) {
        const allTimePct = (allTimeXp[stat] / allTimeTotal) * 100;
        const recentPct = (recentXp[stat] / recentTotal) * 100;
        const delta = recentPct - allTimePct;

        if (Math.abs(delta) >= 5) {
          attributeDrift.push({
            attribute: stat,
            direction: delta > 0 ? "rising" : "lagging",
            deltaPct: Math.round(Math.abs(delta)),
          });
        }
      }

      // Sort: biggest drift first
      attributeDrift.sort((a, b) => b.deltaPct - a.deltaPct);
    }

    // ── 4. Category distribution (difficulty as proxy) ─────────────────
    const { data: last30Tasks } = await supabase
      .from("tasks")
      .select("difficulty")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("updated_at", thirtyDaysAgo.toISOString());

    const diffCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    for (const t of last30Tasks ?? []) {
      const d = t.difficulty ?? "medium";
      diffCounts[d] = (diffCounts[d] ?? 0) + 1;
    }
    const totalDiff = Object.values(diffCounts).reduce((a, b) => a + b, 0);

    const categoryDistribution = totalDiff > 0
      ? Object.entries(diffCounts)
          .map(([cat, count]) => ({
            category: cat,
            pct: Math.round((count / totalDiff) * 100),
          }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3)
      : [];

    // ── 5. Burnout score ────────────────────────────────────────────────
    const { data: logs7d } = await supabase
      .from("daily_logs")
      .select("completed_count")
      .eq("user_id", user.id)
      .gte("log_date", sevenDaysAgoStr);

    const { data: logs30d } = await supabase
      .from("daily_logs")
      .select("completed_count")
      .eq("user_id", user.id)
      .gte("log_date", thirtyDaysAgoStr);

    const avg7d =
      (logs7d ?? []).reduce((s, l) => s + l.completed_count, 0) / 7;

    const avg30d =
      (logs30d ?? []).reduce((s, l) => s + l.completed_count, 0) / 30;

    const burnoutMultiplier =
      avg30d > 0 ? parseFloat((avg7d / avg30d).toFixed(2)) : 1;

    // Normalize to 0–1 score: 1.25x load → 0.75 score (warning threshold)
    // Score = (multiplier - 1) / 1 clamped to [0, 1]
    const burnoutScore = Math.min(Math.max(burnoutMultiplier - 1, 0), 1);

    return {
      success: true,
      data: {
        attributeDrift,
        categoryDistribution,
        burnoutScore,
        burnoutMultiplier,
      },
    };
  } catch (error: unknown) {
    console.error("[getAnalyticsInsights] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to compute insights",
    };
  }
}
