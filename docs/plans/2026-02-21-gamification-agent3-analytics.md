# Agent 3: Analytics Insights Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a collapsible "INSIGHTS" panel embedded in the dashboard that shows up to 5 key insights (attribute drift, burnout warning, streak summary, task distribution) using only text + color — no charting libraries.

**Architecture:** Server action `getAnalyticsInsights()` queries existing tables (`characters`, `tasks`, `daily_logs`) using pure read-only SQL. No new DB schema required. `InsightsPanel` is a presentation-only component that Agent 4 mounts in `GamificationHub`.

**Tech Stack:** Next.js 16 Server Actions · TypeScript · Supabase · Tailwind CSS 4 · `motion/react` (collapse animation) · Lucide React

**Runs in parallel with:** Agent 1 (NLP) and Agent 2 (Streak). Do NOT touch `GamificationHub.tsx`, `types.ts`, or files owned by Agents 1/2/4.

---

## Pre-Flight Checks

Before writing code, confirm these tables exist in Supabase (from `docs/migrations/gamification_phases.sql`):

- `characters(user_id, str_xp, int_xp, dis_xp, cha_xp, cre_xp, spi_xp)` — cumulative per-stat XP
- `tasks(user_id, status, updated_at, str_weight, int_weight, dis_weight, cha_weight, cre_weight, spi_weight, difficulty)` — task completion data
- `daily_logs(user_id, log_date, completed_count)` — daily activity log

Confirm `src/app/actions/gamification.ts` exports `type ActionResponse<T>`.

---

## Task 1: Analytics Data Types (local, in `analytics.ts`)

Before writing the action, define the data shapes. These will be local types in `analytics.ts` until Agent 4 promotes them to `types.ts`.

---

## Task 2: Server Action — `getAnalyticsInsights`

**Files:**
- Create: `src/app/actions/analytics.ts`

**Data computation strategy:**

1. **Attribute drift:** Compare XP contribution per stat over the last 7 days vs all-time.
   - Query tasks completed in last 7 days: `tasks WHERE status='completed' AND updated_at >= 7d ago`
   - Each completed task contributes `weight * xp_base` to each stat (use weights: str_weight, int_weight, etc.)
   - Compare 7-day stat share (%) to all-time stat share from `characters`
   - If delta > 5 percentage points → flag as drift

2. **Category distribution:** Use difficulty as a proxy category (easy/medium/hard) since there's no category column. Count completed tasks per difficulty in last 30 days.

3. **Burnout score:** `completed_count` average over last 7 days vs last 30 days. Score = (7d avg / 30d avg). Score > 1.25 → warning.

**Step 1: Create the file**

```typescript
// src/app/actions/analytics.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { ActionResponse } from "@/app/actions/gamification";

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

const STAT_KEYS = ["str", "int", "dis", "cha", "cre", "spi"] as const;
type StatKey = (typeof STAT_KEYS)[number];

const STAT_LABELS: Record<StatKey, string> = {
  str: "Strength",
  int: "Intellect",
  dis: "Discipline",
  cha: "Charisma",
  cre: "Creativity",
  spi: "Spirituality",
};
export { STAT_LABELS };

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
      (logs7d ?? []).reduce((s, l) => s + l.completed_count, 0) /
      Math.max((logs7d ?? []).length, 1);

    const avg30d =
      (logs30d ?? []).reduce((s, l) => s + l.completed_count, 0) /
      Math.max((logs30d ?? []).length, 1);

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
```

**Step 2: Verify TypeScript compiles**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/actions/analytics.ts
git commit -m "feat(analytics): add getAnalyticsInsights server action"
```

---

## Task 3: Dashboard Component — `InsightsPanel`

**Files:**
- Create: `src/components/dashboard/InsightsPanel.tsx`

This is a **presentation-only** component. It receives `insights` and `streakStatus` as props from Agent 4's wiring in `GamificationHub`. It stores collapse state in `localStorage` so it persists across reloads.

**Step 1: Create the file**

```tsx
// src/components/dashboard/InsightsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, Flame, Shield, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import type { AnalyticsInsights, AttributeDrift } from "@/app/actions/analytics";
import { STAT_LABELS } from "@/app/actions/analytics";
import type { StreakStatus } from "@/app/actions/streak";

interface InsightsPanelProps {
  insights: AnalyticsInsights | null;
  streakStatus: StreakStatus | null;
}

const STORAGE_KEY = "insights-panel-collapsed";

export default function InsightsPanel({
  insights,
  streakStatus,
}: InsightsPanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "false";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const warningCount = getWarningCount(insights, streakStatus);

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-faint">
            Insights
          </span>
          {collapsed && warningCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
              {warningCount}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted" />
        )}
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="insights-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border/60">
              {!insights ? (
                <InsightRow icon={null} color="text-faint" label="Loading insights..." />
              ) : (
                <InsightRows insights={insights} streakStatus={streakStatus} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsightRows({
  insights,
  streakStatus,
}: {
  insights: AnalyticsInsights;
  streakStatus: StreakStatus | null;
}) {
  const rows: React.ReactNode[] = [];

  // 1. Attribute drift (max 2 rows)
  const topDrifts = insights.attributeDrift.slice(0, 2);
  for (const drift of topDrifts) {
    rows.push(
      <DriftRow key={`drift-${drift.attribute}`} drift={drift} />,
    );
  }

  // 2. Streak row
  if (streakStatus !== null) {
    rows.push(
      <InsightRow
        key="streak"
        icon={<Flame className="w-3.5 h-3.5" />}
        color={
          streakStatus.currentStreak > 0
            ? "text-emerald-600"
            : "text-slate-400"
        }
        label={
          streakStatus.currentStreak > 0
            ? `${streakStatus.currentStreak}-day streak active${
                streakStatus.shieldsAvailable > 0
                  ? " · " + streakStatus.shieldsAvailable + " shield" + (streakStatus.shieldsAvailable !== 1 ? "s" : "")
                  : ""
              }`
            : "No active streak"
        }
      />,
    );
  }

  // 3. Category distribution (top 2)
  if (insights.categoryDistribution.length > 0) {
    const top = insights.categoryDistribution.slice(0, 2);
    const label = top.map((c) => `${c.category} ${c.pct}%`).join(" · ");
    rows.push(
      <InsightRow
        key="category"
        icon={<LayoutGrid className="w-3.5 h-3.5" />}
        color="text-faint"
        label={label}
      />,
    );
  }

  // 4. Burnout warning (only if score > 0.75)
  if (insights.burnoutScore > 0.75) {
    rows.push(
      <InsightRow
        key="burnout"
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        color="text-red-500"
        label={`Task load ${insights.burnoutMultiplier}x normal — consider a rest day`}
      />,
    );
  }

  if (rows.length === 0) {
    rows.push(
      <InsightRow
        key="empty"
        icon={null}
        color="text-faint"
        label="No insights yet — complete tasks to see patterns"
      />,
    );
  }

  // Max 5 rows total
  const visibleRows = rows.slice(0, 5);

  return (
    <>
      {visibleRows}
      <div className="px-4 py-2">
        <a
          href="/analytics"
          className="text-[11px] text-muted hover:text-orange-500 transition-colors font-medium"
        >
          View full analytics →
        </a>
      </div>
    </>
  );
}

function DriftRow({ drift }: { drift: AttributeDrift }) {
  const isRising = drift.direction === "rising";
  return (
    <InsightRow
      icon={
        isRising ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )
      }
      color="text-orange-500"
      label={`${STAT_LABELS[drift.attribute]} ${isRising ? "rising" : "lagging"} (${isRising ? "+" : "-"}${drift.deltaPct}%)`}
    />
  );
}

function InsightRow({
  icon,
  color,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2">
      {icon && (
        <span className={clsx("shrink-0", color)}>{icon}</span>
      )}
      <span className={clsx("text-[12px] font-medium", color)}>{label}</span>
    </div>
  );
}

function getWarningCount(
  insights: AnalyticsInsights | null,
  streakStatus: StreakStatus | null,
): number {
  if (!insights) return 0;
  let count = 0;
  count += Math.min(insights.attributeDrift.length, 2);
  if (insights.burnoutScore > 0.75) count += 1;
  if (streakStatus && streakStatus.currentStreak === 0) count += 1;
  return count;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/dashboard/InsightsPanel.tsx
git commit -m "feat(analytics): add InsightsPanel collapsible dashboard component"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/app/actions/analytics.ts` | CREATED |
| `src/components/dashboard/InsightsPanel.tsx` | CREATED |

**Agent 4 dependency:** Agent 4 will:
1. Add `AnalyticsInsights` and `AttributeDrift` to `src/lib/gamification/types.ts` (re-export from `analytics.ts`)
2. Import `InsightsPanel` and `getAnalyticsInsights` into `GamificationHub.tsx`

Do NOT modify `GamificationHub.tsx` or `types.ts` yourself.

**Note on `/analytics` link:** The "View full analytics →" link points to `/analytics` which doesn't exist yet. This is intentional — it's a future page placeholder. The link will result in a 404 for now, which is acceptable.
