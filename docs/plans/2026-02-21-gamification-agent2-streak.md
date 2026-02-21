# Agent 2: Streak System + Shields — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing `user_streaks` DB table into a fully functional streak system — daily check-in, auto-shield activation, milestone awards, and a `StreakWidget` component for the dashboard.

**Architecture:** Pure functions in `src/lib/gamification/streak.ts` handle all date math and milestone logic. Server actions in `src/app/actions/streak.ts` do the DB reads/writes. `StreakWidget` is a presentation-only component that Agent 4 will mount in `GamificationHub`. The item catalog gets 2 new shield items for milestones.

**Tech Stack:** Next.js 16 Server Actions · TypeScript · Supabase (postgres) · Tailwind CSS 4 · Lucide React

**Runs in parallel with:** Agent 1 (NLP) and Agent 3 (Analytics). Do NOT touch `GamificationHub.tsx`, `types.ts`, or files owned by Agents 1/3/4.

**Important:** `consumeStreakShield()` already exists in `src/app/actions/gamification.ts` — do NOT duplicate it. Create `src/app/actions/streak.ts` as a separate file with only new functions.

---

## Pre-Flight Checks

Before writing code, confirm:

- `src/lib/gamification/item-catalog.ts` exports `ITEM_CATALOG: CatalogItem[]` and `CatalogItem` with `ItemEffect` interface. Check that `ItemEffect` has `amount?: number`. Confirm `streak-shield` (id: `'streak-shield'`, rarity: `'uncommon'`) and `grand-streak-shield` (id: `'grand-streak-shield'`, rarity: `'rare'`) already exist.
- `src/app/actions/gamification.ts` exports `type ActionResponse<T>`. The `consumeStreakShield()` function already exists here — do not recreate it.
- DB table `user_streaks` has columns: `user_id, current_streak, longest_streak, shields_available, last_completed_date`
- DB table `inventory` has columns: `user_id, item_id, quantity`
- DB table `daily_logs` has: `user_id, log_date, completed_count`

---

## Task 1: Extend Item Catalog with Milestone Shields

**Files:**
- Modify: `src/lib/gamification/item-catalog.ts`

The catalog already has `streak-shield` (uncommon, misses: 1) and `grand-streak-shield` (rare, misses: 3). We need one mythic shield for the 30-day milestone: `unbreakable-vow`.

We also need to add `days?: number` to the `ItemEffect` interface for the mythic shield's 7-day protection window.

**Step 1: Add `days` field to `ItemEffect`**

Locate the `ItemEffect` interface:

```typescript
export interface ItemEffect {
  stat?: string;
  multiplier?: number;
  durationHours?: number;
  amount?: number;
}
```

Replace with:

```typescript
export interface ItemEffect {
  stat?: string;
  multiplier?: number;
  durationHours?: number;
  amount?: number;
  days?: number; // Used by streak shields with multi-day protection windows
}
```

**Step 2: Add `iron-resolve` and `unbreakable-vow` to the catalog**

Locate the Mythic section at the bottom of `ITEM_CATALOG` and add `iron-resolve` to the Rare section and `unbreakable-vow` to the Mythic section.

In the Rare section, after `grand-streak-shield`, add:

```typescript
  {
    id: 'iron-resolve',
    name: 'Iron Resolve',
    description: 'Your will is iron. Prevents streak loss for 2 consecutive missed days.',
    rarity: 'rare',
    effectType: 'streak_shield',
    effectValue: { amount: 2 },
    consumable: true,
  },
```

In the Mythic section, before `boss-slayer-title`, add:

```typescript
  {
    id: 'unbreakable-vow',
    name: 'Unbreakable Vow',
    description: 'A mythic pact. Shields your streak from any missed days for 7 days.',
    rarity: 'mythic',
    effectType: 'streak_shield',
    effectValue: { days: 7 },
    consumable: true,
  },
```

**Step 3: Verify TypeScript compiles**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/gamification/item-catalog.ts
git commit -m "feat(streak): add iron-resolve and unbreakable-vow to item catalog"
```

---

## Task 2: Pure Functions — `src/lib/gamification/streak.ts`

**Files:**
- Create: `src/lib/gamification/streak.ts`

These are side-effect-free functions — no DB calls. Easy to test.

**Step 1: Create the file**

```typescript
// src/lib/gamification/streak.ts

/**
 * Streak system pure functions.
 * All date comparisons use UTC-normalized YYYY-MM-DD strings to avoid timezone drift.
 */

export interface MilestoneReward {
  /** ID of the item to award from the catalog (e.g. 'streak-shield', 'unbreakable-vow') */
  itemId: string;
  /** Bonus XP to award alongside the item */
  bonusXp: number;
  /** Human-readable label for the toast/notification */
  label: string;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  shieldsAvailable: number;
  lastCompletedDate: string | null;
  nextMilestone: 7 | 14 | 30 | null;
  daysUntilMilestone: number | null;
}

// Milestones: streak day → reward
const MILESTONES: Record<number, MilestoneReward> = {
  7:  { itemId: 'streak-shield',    bonusXp: 0,   label: '7-Day Streak! Streak Shield awarded.' },
  14: { itemId: 'iron-resolve',     bonusXp: 50,  label: '14-Day Streak! Iron Resolve + 50 XP awarded.' },
  30: { itemId: 'unbreakable-vow',  bonusXp: 200, label: '30-Day Streak! Unbreakable Vow + 200 XP awarded.' },
};

/**
 * Returns today's date as a YYYY-MM-DD string in the UTC timezone.
 */
export function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns true if the streak is broken (last completed date is not today or yesterday).
 * A streak is NOT broken if the user completed a task today or yesterday.
 */
export function isStreakBroken(lastCompletedDate: string | null): boolean {
  if (!lastCompletedDate) return true;

  const today = new Date(todayUtc());
  const last = new Date(lastCompletedDate);

  // Difference in days
  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // 0 = completed today, 1 = completed yesterday → streak intact
  return diffDays > 1;
}

/**
 * Returns true if the user has already logged activity today.
 */
export function hasCompletedToday(lastCompletedDate: string | null): boolean {
  if (!lastCompletedDate) return false;
  return lastCompletedDate === todayUtc();
}

/**
 * Returns the milestone reward if the new streak count hits a milestone threshold.
 * Returns null if the streak is not at a milestone.
 */
export function calculateStreakMilestone(newStreak: number): MilestoneReward | null {
  return MILESTONES[newStreak] ?? null;
}

/**
 * Returns true if a shield should auto-activate to protect the streak.
 * A shield activates when the streak is broken AND shields are available.
 */
export function shieldShouldActivate(
  shieldsAvailable: number,
  streakBroken: boolean,
): boolean {
  return streakBroken && shieldsAvailable > 0;
}

/**
 * Given the current streak, returns the next milestone day and days remaining.
 * Returns null for both if there are no upcoming milestones.
 */
export function getNextMilestone(
  currentStreak: number,
): { milestone: 7 | 14 | 30 | null; daysUntil: number | null } {
  const thresholds = [7, 14, 30] as const;
  for (const threshold of thresholds) {
    if (currentStreak < threshold) {
      return { milestone: threshold, daysUntil: threshold - currentStreak };
    }
  }
  return { milestone: null, daysUntil: null };
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/gamification/streak.ts
git commit -m "feat(streak): add pure streak functions (isStreakBroken, milestone, shield logic)"
```

---

## Task 3: Server Actions — `src/app/actions/streak.ts`

**Files:**
- Create: `src/app/actions/streak.ts`

**Important notes before writing:**
- `consumeStreakShield()` already exists in `gamification.ts` — do NOT create it again
- The DB column for shields is `shields_available` (not `shields_remaining`)
- The DB column for last activity is `last_completed_date` (type: DATE)
- To award items, upsert to the `inventory` table (see `awardBossDefeatRewards` in `gamification.ts` for the pattern)

**Step 1: Create the file**

```typescript
// src/app/actions/streak.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/app/actions/gamification";
import {
  isStreakBroken,
  hasCompletedToday,
  calculateStreakMilestone,
  shieldShouldActivate,
  getNextMilestone,
  todayUtc,
  type StreakStatus,
  type MilestoneReward,
} from "@/lib/gamification/streak";

export type { StreakStatus };

/**
 * Returns the user's current streak status without any side effects.
 */
export async function getStreakStatus(): Promise<ActionResponse<StreakStatus>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: row } = await supabase
      .from("user_streaks")
      .select(
        "current_streak, longest_streak, shields_available, last_completed_date",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const currentStreak = row?.current_streak ?? 0;
    const { milestone, daysUntil } = getNextMilestone(currentStreak);

    const status: StreakStatus = {
      currentStreak,
      longestStreak: row?.longest_streak ?? 0,
      shieldsAvailable: row?.shields_available ?? 0,
      lastCompletedDate: row?.last_completed_date ?? null,
      nextMilestone: milestone,
      daysUntilMilestone: daysUntil,
    };

    return { success: true, data: status };
  } catch (error: unknown) {
    console.error("[getStreakStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get streak",
    };
  }
}

/**
 * Called when a user completes a task. Updates the streak, applies shields if broken,
 * and awards milestone items. Safe to call multiple times per day (idempotent for same day).
 *
 * Returns the updated StreakStatus plus an optional milestone reward notification.
 */
export async function checkAndUpdateStreak(): Promise<
  ActionResponse<{ status: StreakStatus; milestone: MilestoneReward | null }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const today = todayUtc();

    // 1. Fetch current streak row (or init defaults)
    const { data: row } = await supabase
      .from("user_streaks")
      .select(
        "current_streak, longest_streak, shields_available, last_completed_date",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const lastDate: string | null = row?.last_completed_date ?? null;
    let currentStreak = row?.current_streak ?? 0;
    const longestStreak = row?.longest_streak ?? 0;
    let shieldsAvailable = row?.shields_available ?? 0;

    // 2. Already updated today — no further action needed
    if (hasCompletedToday(lastDate)) {
      const { milestone: nextM, daysUntil } = getNextMilestone(currentStreak);
      return {
        success: true,
        data: {
          status: {
            currentStreak,
            longestStreak,
            shieldsAvailable,
            lastCompletedDate: lastDate,
            nextMilestone: nextM,
            daysUntilMilestone: daysUntil,
          },
          milestone: null,
        },
      };
    }

    // 3. Determine if streak is broken
    const broken = isStreakBroken(lastDate);

    if (broken && shieldShouldActivate(shieldsAvailable, broken)) {
      // Auto-consume one shield — streak continues
      shieldsAvailable -= 1;
      currentStreak += 1; // counts as if they completed yesterday
    } else if (broken) {
      // Streak broken, no shield → reset
      currentStreak = 1;
    } else {
      // Consecutive day
      currentStreak += 1;
    }

    const newLongest = Math.max(longestStreak, currentStreak);

    // 4. Check for milestone
    const milestone = calculateStreakMilestone(currentStreak);

    // 5. Award milestone item if applicable
    if (milestone) {
      const itemSlug = milestone.itemId;

      // Resolve item_id UUID from items table
      const { data: itemRow } = await supabase
        .from("items")
        .select("id")
        .eq("name", _itemNameFromSlug(itemSlug))
        .maybeSingle();

      if (itemRow) {
        const { data: existing } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("item_id", itemRow.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("inventory")
            .update({ quantity: existing.quantity + 1 })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ user_id: user.id, item_id: itemRow.id, quantity: 1 });
        }
      }

      // Award bonus XP evenly across stats (same pattern as awardBossDefeatRewards)
      if (milestone.bonusXp > 0) {
        const perStat = Math.round(milestone.bonusXp / 6);
        const { data: charData } = await supabase
          .from("characters")
          .select(
            "str_xp, int_xp, dis_xp, cha_xp, cre_xp, spi_xp",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (charData) {
          await supabase
            .from("characters")
            .update({
              str_xp: (charData.str_xp ?? 0) + perStat,
              int_xp: (charData.int_xp ?? 0) + perStat,
              dis_xp: (charData.dis_xp ?? 0) + perStat,
              cha_xp: (charData.cha_xp ?? 0) + perStat,
              cre_xp: (charData.cre_xp ?? 0) + perStat,
              spi_xp: (charData.spi_xp ?? 0) + perStat,
            })
            .eq("user_id", user.id);
        }
      }
    }

    // 6. Upsert the streak row
    await supabase.from("user_streaks").upsert(
      {
        user_id: user.id,
        current_streak: currentStreak,
        longest_streak: newLongest,
        shields_available: shieldsAvailable,
        last_completed_date: today,
      },
      { onConflict: "user_id" },
    );

    revalidatePath("/dashboard");

    const { milestone: nextM, daysUntil } = getNextMilestone(currentStreak);

    return {
      success: true,
      data: {
        status: {
          currentStreak,
          longestStreak: newLongest,
          shieldsAvailable,
          lastCompletedDate: today,
          nextMilestone: nextM,
          daysUntilMilestone: daysUntil,
        },
        milestone,
      },
    };
  } catch (error: unknown) {
    console.error("[checkAndUpdateStreak] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update streak",
    };
  }
}

/**
 * Maps catalog item IDs (slugs) to their display names in the DB items table.
 * Must match the `name` column in the items table (seeded from item-catalog.ts).
 */
function _itemNameFromSlug(slug: string): string {
  const map: Record<string, string> = {
    'streak-shield':   'Streak Shield',
    'iron-resolve':    'Iron Resolve',
    'unbreakable-vow': 'Unbreakable Vow',
  };
  return map[slug] ?? slug;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/actions/streak.ts
git commit -m "feat(streak): add getStreakStatus and checkAndUpdateStreak server actions"
```

---

## Task 4: Dashboard Widget — `StreakWidget`

**Files:**
- Create: `src/components/dashboard/StreakWidget.tsx`

This is a **presentation-only** component. Agent 4 will mount it in `GamificationHub` and pass the `status` prop.

**Step 1: Create the file**

```tsx
// src/components/dashboard/StreakWidget.tsx
"use client";

import { Flame, Shield } from "lucide-react";
import { clsx } from "clsx";
import type { StreakStatus } from "@/app/actions/streak";

interface StreakWidgetProps {
  status: StreakStatus | null;
}

export default function StreakWidget({ status }: StreakWidgetProps) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white animate-pulse">
        <div className="w-4 h-4 bg-slate-200 rounded" />
        <div className="w-16 h-3 bg-slate-200 rounded" />
      </div>
    );
  }

  const { currentStreak, shieldsAvailable, nextMilestone, daysUntilMilestone } = status;
  const isActive = currentStreak > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-white">
      {/* Streak count */}
      <div className="flex items-center gap-2">
        <Flame
          className={clsx(
            "w-4 h-4",
            isActive ? "text-orange-500" : "text-slate-300",
          )}
        />
        <span
          className={clsx(
            "text-[15px] font-black tabular-nums",
            isActive ? "text-orange-400" : "text-slate-400",
          )}
        >
          {currentStreak}
        </span>
        <span className="text-[11px] text-muted font-medium">
          {currentStreak === 1 ? "day streak" : "day streak"}
        </span>
      </div>

      {/* Shields */}
      <div className="flex items-center gap-2">
        {shieldsAvailable > 0 ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(shieldsAvailable, 5) }).map(
              (_, i) => (
                <Shield
                  key={i}
                  className="w-3.5 h-3.5 text-orange-400 fill-orange-100"
                />
              ),
            )}
            {shieldsAvailable > 5 && (
              <span className="text-[10px] text-muted">+{shieldsAvailable - 5}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] text-slate-400">No shields</span>
          </div>
        )}

        {/* Milestone countdown */}
        {nextMilestone && daysUntilMilestone !== null && (
          <>
            <span className="text-[10px] text-slate-200">·</span>
            <span className="text-[10px] text-faint">
              {nextMilestone}d in{" "}
              <span className="font-semibold text-orange-400">
                {daysUntilMilestone}
              </span>{" "}
              {daysUntilMilestone === 1 ? "day" : "days"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/dashboard/StreakWidget.tsx
git commit -m "feat(streak): add StreakWidget dashboard component"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/lib/gamification/item-catalog.ts` | MODIFIED (add `days?` to `ItemEffect`, add 2 items) |
| `src/lib/gamification/streak.ts` | CREATED |
| `src/app/actions/streak.ts` | CREATED |
| `src/components/dashboard/StreakWidget.tsx` | CREATED |

**Agent 4 dependency:** Agent 4 will:
1. Add `StreakStatus` to `src/lib/gamification/types.ts` (importing from `streak.ts` and re-exporting)
2. Import `StreakWidget` and `getStreakStatus` into `GamificationHub.tsx`
3. Write unit tests for the pure functions in `streak.ts`

Do NOT modify `GamificationHub.tsx` or `types.ts` yourself.
