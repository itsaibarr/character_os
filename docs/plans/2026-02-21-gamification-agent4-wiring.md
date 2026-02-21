# Agent 4: Wiring Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Agents 1/2/3 outputs into shared infrastructure. Wire `StreakWidget` and `InsightsPanel` into `GamificationHub`. Add shared types to `types.ts`. Write unit tests for streak pure functions. Verify the `active_buffs` migration is applied.

**Architecture:** This agent is the sole writer of `GamificationHub.tsx` and `types.ts`. All new components and actions from Agents 1–3 are already complete before this plan runs.

**Tech Stack:** Next.js 16 · TypeScript · Vitest · Supabase

**Prerequisite:** Agents 1, 2, and 3 must ALL be complete before starting this plan. Verify their output files exist:
- `src/app/actions/nlp.ts` — Agent 1 ✓
- `src/lib/gamification/streak.ts` — Agent 2 ✓
- `src/app/actions/streak.ts` — Agent 2 ✓
- `src/components/dashboard/StreakWidget.tsx` — Agent 2 ✓
- `src/app/actions/analytics.ts` — Agent 3 ✓
- `src/components/dashboard/InsightsPanel.tsx` — Agent 3 ✓

---

## Pre-Flight Checks

Run these before starting:

```bash
# Confirm all agent output files exist
ls src/app/actions/nlp.ts
ls src/lib/gamification/streak.ts
ls src/app/actions/streak.ts
ls src/components/dashboard/StreakWidget.tsx
ls src/app/actions/analytics.ts
ls src/components/dashboard/InsightsPanel.tsx

# Confirm TypeScript compiles cleanly before you touch anything
npx tsc --noEmit 2>&1 | head -30
```

Expected: all files exist, no TypeScript errors.

---

## Task 1: Add Shared Types to `types.ts`

**Files:**
- Modify: `src/lib/gamification/types.ts`

Read the current `types.ts` first. Confirm `streak_shield` is already in `ItemEffectType` (it is — no change needed there).

Add three new type re-exports at the bottom of the file so consumers can import from one central location:

```typescript
// Re-export Phase 3 types for centralized imports
export type { ExtractedTask } from "@/app/actions/nlp";
export type { StreakStatus } from "@/app/actions/streak";
export type { AnalyticsInsights, AttributeDrift } from "@/app/actions/analytics";
```

**Step 1: Read `types.ts` to confirm current state**

```bash
cat src/lib/gamification/types.ts
```

Confirm: `streak_shield` is present in `ItemEffectType`. The file ends after `BossHistoryEntry`.

**Step 2: Add the re-exports**

Open `src/lib/gamification/types.ts` and append to the end of the file:

```typescript
// ─── Phase 3 type re-exports ──────────────────────────────────────────────────
// Re-exported here so consumers can import Phase 3 types from one central place.
export type { ExtractedTask } from "@/app/actions/nlp";
export type { StreakStatus } from "@/app/actions/streak";
export type { AnalyticsInsights, AttributeDrift } from "@/app/actions/analytics";
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If you see circular import errors, move the type definitions inline in `types.ts` instead of re-exporting.

**Step 4: Commit**

```bash
git add src/lib/gamification/types.ts
git commit -m "feat(types): re-export Phase 3 types (ParsedTask, StreakStatus, AnalyticsInsights)"
```

---

## Task 2: Wire `GamificationHub.tsx`

**Files:**
- Modify: `src/components/dashboard/GamificationHub.tsx`

**Step 1: Read the current file before editing**

```bash
cat src/components/dashboard/GamificationHub.tsx
```

Familiarize yourself with the existing pattern:
- State at the top (`useState`)
- `loadAll` callback with `Promise.all`
- `useEffect` calls `loadAll()`
- Loading spinner while `loading === true`
- Return JSX with components

**Step 2: Add imports**

Locate the existing import block. Add these imports:

```typescript
import StreakWidget from "@/components/dashboard/StreakWidget";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import { getStreakStatus } from "@/app/actions/streak";
import { getAnalyticsInsights } from "@/app/actions/analytics";
import type { StreakStatus } from "@/app/actions/streak";
import type { AnalyticsInsights } from "@/app/actions/analytics";
```

**Step 3: Add state variables**

After the existing state declarations (after `const [generatingBoss, setGeneratingBoss] = useState(false)`), add:

```typescript
const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
const [analyticsInsights, setAnalyticsInsights] = useState<AnalyticsInsights | null>(null);
```

**Step 4: Add to `loadAll`**

The current `loadAll` callback uses `Promise.all`. Extend it to include the two new fetches.

Current `Promise.all` call:
```typescript
const [bossResult, heatmapResult, evolutionResult, buffsResult, historyResult] = await Promise.all([
  getActiveWeeklyBoss(),
  getHeatmapData(90),
  getEvolutionStatus(),
  getActiveBuffs(),
  getBossHistory(),
]);
```

Replace with:
```typescript
const [bossResult, heatmapResult, evolutionResult, buffsResult, historyResult, streakResult, insightsResult] = await Promise.all([
  getActiveWeeklyBoss(),
  getHeatmapData(90),
  getEvolutionStatus(),
  getActiveBuffs(),
  getBossHistory(),
  getStreakStatus(),
  getAnalyticsInsights(),
]);
```

Then add the state setters after the existing ones:
```typescript
if (streakResult.success && streakResult.data) {
  setStreakStatus(streakResult.data);
}
if (insightsResult.success && insightsResult.data) {
  setAnalyticsInsights(insightsResult.data);
}
```

**Step 5: Add components to the render**

The current return JSX is:
```tsx
return (
  <div className="flex flex-col gap-4">
    {activeBuffs.length > 0 && <ActiveBuffs buffs={activeBuffs} />}

    <WeeklyBossBoard ... />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AnalyticsHeatmap ... />
      <EvolutionTree ... />
    </div>

    {bossHistory.length > 0 && (
      <div className="mt-2">
        <h3 ...>Boss History</h3>
        <BossHistory entries={bossHistory} />
      </div>
    )}
  </div>
);
```

Replace with:
```tsx
return (
  <div className="flex flex-col gap-4">
    {/* Streak widget — top of hub for daily visibility */}
    <StreakWidget status={streakStatus} />

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

    {/* Insights panel — collapsible, defaults collapsed */}
    <InsightsPanel insights={analyticsInsights} streakStatus={streakStatus} />

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
```

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Common issues:
- If you see "Type 'X' is not assignable" — check that the return types from `getStreakStatus` and `getAnalyticsInsights` match the state type declarations.
- If you see import errors — verify the paths are correct.

**Step 7: Visual sanity check**

```bash
npm run dev
```

Navigate to `/dashboard`. Confirm:
- `StreakWidget` appears at the top of the gamification section (shows flame, count, shields)
- `InsightsPanel` appears below the heatmap/evolution grid (shows "INSIGHTS" header, collapsed by default)
- Clicking INSIGHTS expands the panel
- No console errors

**Step 8: Commit**

```bash
git add src/components/dashboard/GamificationHub.tsx
git commit -m "feat(hub): wire StreakWidget and InsightsPanel into GamificationHub"
```

---

## Task 3: Verify `active_buffs` Migration

**Context:** The `active_buffs` table migration file exists at `docs/migrations/active_buffs.sql` but may not have been applied to the Supabase project yet. This is a pre-existing gap from Phase 2.

**Step 1: Check if the table exists**

Go to the Supabase dashboard for this project, or run:

```bash
# If you have the Supabase CLI installed:
npx supabase db diff --local 2>&1 | grep active_buffs

# OR check via the project dashboard at https://supabase.com/dashboard
# Navigate to Table Editor and look for 'active_buffs' table
```

**Step 2: If the table does NOT exist, apply the migration**

```bash
# Copy the SQL from docs/migrations/active_buffs.sql
cat docs/migrations/active_buffs.sql
# Paste into the Supabase SQL editor and execute it
```

**Step 3: If the table DOES exist, no action needed**

The `active_buffs` system is already wired in the codebase (`src/lib/gamification/buffs.ts`, `src/app/actions/inventory.ts`). This task is just verification.

**Step 4: Commit note**

No code changes needed for this task. If you applied the migration, note it in the next commit message.

---

## Task 4: Unit Tests for Streak Pure Functions

**Files:**
- Create: `src/lib/gamification/streak.test.ts`

The streak pure functions in `src/lib/gamification/streak.ts` are deterministic and easy to test.

**Step 1: Create the test file**

```typescript
// src/lib/gamification/streak.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isStreakBroken,
  hasCompletedToday,
  calculateStreakMilestone,
  shieldShouldActivate,
  getNextMilestone,
  todayUtc,
} from "./streak";

describe("todayUtc", () => {
  it("returns today in YYYY-MM-DD format", () => {
    const result = todayUtc();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isStreakBroken", () => {
  it("returns true when lastCompletedDate is null", () => {
    expect(isStreakBroken(null)).toBe(true);
  });

  it("returns false when completed today", () => {
    const today = todayUtc();
    expect(isStreakBroken(today)).toBe(false);
  });

  it("returns false when completed yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    expect(isStreakBroken(yesterdayStr)).toBe(false);
  });

  it("returns true when completed 2 days ago", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const str = twoDaysAgo.toISOString().split("T")[0];
    expect(isStreakBroken(str)).toBe(true);
  });

  it("returns true when completed a week ago", () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const str = weekAgo.toISOString().split("T")[0];
    expect(isStreakBroken(str)).toBe(true);
  });
});

describe("hasCompletedToday", () => {
  it("returns false when null", () => {
    expect(hasCompletedToday(null)).toBe(false);
  });

  it("returns true when last completed date is today", () => {
    const today = todayUtc();
    expect(hasCompletedToday(today)).toBe(true);
  });

  it("returns false when last completed date is yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const str = yesterday.toISOString().split("T")[0];
    expect(hasCompletedToday(str)).toBe(false);
  });
});

describe("calculateStreakMilestone", () => {
  it("returns null for streaks below 7", () => {
    expect(calculateStreakMilestone(1)).toBeNull();
    expect(calculateStreakMilestone(6)).toBeNull();
  });

  it("returns streak-shield reward at 7 days", () => {
    const reward = calculateStreakMilestone(7);
    expect(reward).not.toBeNull();
    expect(reward?.itemId).toBe("streak-shield");
    expect(reward?.bonusXp).toBe(0);
  });

  it("returns iron-resolve reward at 14 days with 50 bonus XP", () => {
    const reward = calculateStreakMilestone(14);
    expect(reward).not.toBeNull();
    expect(reward?.itemId).toBe("iron-resolve");
    expect(reward?.bonusXp).toBe(50);
  });

  it("returns unbreakable-vow reward at 30 days with 200 bonus XP", () => {
    const reward = calculateStreakMilestone(30);
    expect(reward).not.toBeNull();
    expect(reward?.itemId).toBe("unbreakable-vow");
    expect(reward?.bonusXp).toBe(200);
  });

  it("returns null for streaks not at a milestone (e.g. 8, 15, 31)", () => {
    expect(calculateStreakMilestone(8)).toBeNull();
    expect(calculateStreakMilestone(15)).toBeNull();
    expect(calculateStreakMilestone(31)).toBeNull();
  });
});

describe("shieldShouldActivate", () => {
  it("returns false when streak is not broken", () => {
    expect(shieldShouldActivate(3, false)).toBe(false);
  });

  it("returns false when streak is broken but no shields", () => {
    expect(shieldShouldActivate(0, true)).toBe(false);
  });

  it("returns true when streak is broken and shields are available", () => {
    expect(shieldShouldActivate(1, true)).toBe(true);
    expect(shieldShouldActivate(5, true)).toBe(true);
  });
});

describe("getNextMilestone", () => {
  it("returns 7 and 7 days until at streak 0", () => {
    const { milestone, daysUntil } = getNextMilestone(0);
    expect(milestone).toBe(7);
    expect(daysUntil).toBe(7);
  });

  it("returns 14 and correct days when between 7 and 14", () => {
    const { milestone, daysUntil } = getNextMilestone(10);
    expect(milestone).toBe(14);
    expect(daysUntil).toBe(4);
  });

  it("returns 30 at streak 20", () => {
    const { milestone, daysUntil } = getNextMilestone(20);
    expect(milestone).toBe(30);
    expect(daysUntil).toBe(10);
  });

  it("returns null past 30 days", () => {
    const { milestone, daysUntil } = getNextMilestone(31);
    expect(milestone).toBeNull();
    expect(daysUntil).toBeNull();
  });

  it("returns 1 day until milestone when one away", () => {
    const { milestone, daysUntil } = getNextMilestone(6);
    expect(milestone).toBe(7);
    expect(daysUntil).toBe(1);
  });
});
```

**Step 2: Run the tests**

```bash
npx vitest run src/lib/gamification/streak.test.ts
```

Expected: All tests pass. If any fail, read the error and fix the pure function or the test.

**Step 3: Run all tests to confirm no regressions**

```bash
npx vitest run
```

Expected: All existing tests still pass plus the new streak tests.

**Step 4: Commit**

```bash
git add src/lib/gamification/streak.test.ts
git commit -m "test(streak): add unit tests for streak pure functions"
```

---

## Task 5: Final Integration Verification

**Step 1: Full TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

**Step 3: Start dev server and smoke-test all 3 features**

```bash
npm run dev
```

**NLP (Agent 1):**
- Go to `/tasks`
- Confirm "Parse Text" button appears in header (right side)
- Click it → paste "Tomorrow finish physics homework, buy groceries, update portfolio"
- Click "Parse →" → confirmation panel appears with 3 tasks, checkboxes
- Deselect one → "Add selected (2)" → tasks appear in inbox

**Streak (Agent 2):**
- Go to `/dashboard`
- Confirm `StreakWidget` is visible at top of gamification section
- Shows flame icon, streak count, shield icons, milestone countdown
- Complete a task → streak count updates (if first task today)

**Analytics (Agent 3):**
- On `/dashboard`, confirm "INSIGHTS" header is visible below heatmap
- Click to expand → shows attribute drift rows (if any), streak, task distribution
- If burnout > 1.25x load, shows red warning row
- Collapse state persists across page refresh

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(phase3): complete Phase 3 wiring — NLP parser, streak system, insights panel"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/lib/gamification/types.ts` | MODIFIED (add Phase 3 type re-exports) |
| `src/components/dashboard/GamificationHub.tsx` | MODIFIED (add streak + analytics state + render) |
| `src/lib/gamification/streak.test.ts` | CREATED |

**Do NOT touch:**
- `src/app/actions/nlp.ts` (Agent 1 owns)
- `src/app/actions/streak.ts` (Agent 2 owns)
- `src/app/actions/analytics.ts` (Agent 3 owns)
- `src/components/tasks/ParseTextButton.tsx` (Agent 1 owns)
- `src/components/dashboard/StreakWidget.tsx` (Agent 2 owns)
- `src/components/dashboard/InsightsPanel.tsx` (Agent 3 owns)
- `src/lib/gamification/item-catalog.ts` (Agent 2 owns)
- `src/lib/gamification/streak.ts` (Agent 2 owns)
