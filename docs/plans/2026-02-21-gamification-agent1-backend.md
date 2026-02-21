# Gamification Hub — Agent 1: Backend Server Actions

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add data-fetching server actions for the Weekly Boss, Consistency Heatmap, and Evolution Tree, and fix two existing bugs in `toggleTaskStatus`.

**Architecture:** All new functions are added to `src/app/actions/gamification.ts`. Two bug fixes go into `src/app/actions/tasks.ts`. No new files needed. DB migration must be applied first.

**Tech Stack:** Next.js Server Actions, Supabase, TypeScript. Types imported from the UI component files they serve.

---

## Prerequisites — Read These Files First

Before writing any code, read these files in full to understand the data shapes and avoid introducing new bugs:

- `src/app/actions/gamification.ts` — existing actions you will add to
- `src/app/actions/tasks.ts` — contains `toggleTaskStatus` you must fix
- `src/lib/gamification/progression.ts` — `determineEvolutionBranch` and `MILESTONES`
- `src/components/dashboard/gamification/WeeklyBossBoard.tsx` — exports `Boss` and `BossAttack` types
- `src/components/dashboard/gamification/EvolutionTree.tsx` — exports `EvolutionNode` type
- `src/components/dashboard/gamification/AnalyticsHeatmap.tsx` — exports `HeatmapDataPoint` type
- `docs/migrations/gamification_phases.sql` — canonical DB schema

---

## Task 1: Apply the DB Migration

**Files:**
- Read: `docs/migrations/gamification_phases.sql`

**Step 1: Check which tables already exist**

```bash
npx supabase db diff --schema public
```

If tables `bosses`, `daily_logs`, `user_streaks`, `difficulty_adjustments` do not appear in the diff, they need to be created.

**Step 2: Apply the migration**

Go to the Supabase project dashboard → SQL Editor, paste the entire contents of `docs/migrations/gamification_phases.sql`, and run it. Alternatively:

```bash
npx supabase db push
```

**Step 3: Verify the `boss_id` column was added to tasks**

In the Supabase Table Editor, open the `tasks` table and confirm a `boss_id` UUID column exists. If not, run this manually in SQL Editor:

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS boss_id UUID REFERENCES bosses(id) ON DELETE SET NULL;
```

**Step 4: Commit checkpoint**

```bash
git add docs/migrations/gamification_phases.sql
git commit -m "chore: mark gamification migration as applied"
```

---

## Task 2: Fix Bugs in `toggleTaskStatus`

**Files:**
- Modify: `src/app/actions/tasks.ts` (lines ~329-538)

There are two bugs that would cause silent failures at runtime.

**Bug A — Wrong column name on `difficulty_adjustments`:**

Line ~336 queries `.select('multiplier')` but the migration defines `base_multiplier`. Fix it:

```typescript
// BEFORE (wrong)
const { data: diffData } = await supabase
  .from('difficulty_adjustments')
  .select('multiplier')
  .eq('user_id', user.id)
  .single();

const userMultiplierBounds = diffData?.multiplier || 1.0;

// AFTER (correct)
const { data: diffData } = await supabase
  .from('difficulty_adjustments')
  .select('base_multiplier')
  .eq('user_id', user.id)
  .single();

const userMultiplierBounds = diffData?.base_multiplier || 1.0;
```

**Bug B — Wrong column name and wrong damage amount in boss HP section:**

Lines ~529-537 query `hp_current, hp_max` but the migration defines `hp_total` not `hp_max`. Also, HP decrements by 1 regardless of task priority. Replace the entire boss logic block:

```typescript
// BEFORE (lines ~527-538)
if (isBossTask) {
   const { data: boss } = await supabase.from('bosses').select('hp_current, hp_max').eq('id', task.boss_id).single();
   if (boss && boss.hp_current > 0) {
       const newHp = Math.max(0, boss.hp_current - 1);
       await supabase.from('bosses').update({ hp_current: newHp }).eq('id', task.boss_id);

       if (newHp === 0) {
           await supabase.from('logs').insert({ user_id: user.id, content: `Defeated Boss!`, activity_type: "System" });
       }
   }
}

// AFTER (correct column, priority-based damage)
if (isBossTask) {
  const taskDamage = task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10;
  const { data: bossRow } = await supabase
    .from('bosses')
    .select('hp_current, hp_total, status')
    .eq('id', task.boss_id)
    .single();
  if (bossRow && bossRow.hp_current > 0) {
    const newHp = Math.max(0, bossRow.hp_current - taskDamage);
    const newStatus = newHp === 0 ? 'defeated' : bossRow.status;
    await supabase
      .from('bosses')
      .update({ hp_current: newHp, status: newStatus })
      .eq('id', task.boss_id);
    if (newHp === 0) {
      await supabase.from('logs').insert({
        user_id: user.id,
        content: `Boss Defeated! All linked tasks complete.`,
        activity_type: 'System',
      });
    }
  }
}
```

**Step 1: Make the changes**

Apply both fixes to `src/app/actions/tasks.ts`.

**Step 2: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "fix: correct difficulty_adjustments column name and boss HP damage logic"
```

---

## Task 3: Update `generateWeeklyBoss` for Priority-Based HP

**Files:**
- Modify: `src/app/actions/gamification.ts` (~lines 196-250)

Currently `hp_total` is set to `tasks.length`. Update it to use priority-based damage so the HP bar is proportional to task difficulty.

Find the section where the boss is inserted and replace:

```typescript
// BEFORE
const { data: boss, error: bossError } = await supabase
  .from('bosses')
  .insert({
    user_id: user.id,
    title: "The Procrastination Behemoth",
    description: "Defeat all linked tasks before Sunday night!",
    hp_total: tasks.length,
    hp_current: tasks.length,
    expires_at: nextSunday.toISOString()
  })
  .select('id')
  .single();
```

First, fetch the task priorities to compute total HP. Replace the boss generation block:

```typescript
// AFTER — fetch priorities first, then compute hp_total
const { data: tasks } = await supabase
  .from('tasks')
  .select('id, priority')           // <-- add priority to select
  .eq('user_id', user.id)
  .eq('status', 'todo')
  .is('boss_id', null)
  .limit(7);

if (!tasks || tasks.length < 3) {
  return { success: false, error: "Not enough pending tasks to form a boss (need at least 3)." };
}

const computeDamage = (priority: string) =>
  priority === 'high' ? 30 : priority === 'medium' ? 20 : 10;

const totalHp = tasks.reduce((sum, t) => sum + computeDamage(t.priority), 0);

const nextSunday = new Date();
nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));

const { data: boss, error: bossError } = await supabase
  .from('bosses')
  .insert({
    user_id: user.id,
    title: "The Procrastination Behemoth",
    description: "A manifestation of your delayed tasks. Defeat it before Sunday.",
    hp_total: totalHp,
    hp_current: totalHp,
    expires_at: nextSunday.toISOString(),
  })
  .select('id')
  .single();
```

**Step 1: Apply the change**

**Step 2: Commit**

```bash
git add src/app/actions/gamification.ts
git commit -m "fix: compute boss hp_total from task priority weights"
```

---

## Task 4: Add `daily_logs` Upsert to `toggleTaskStatus`

**Files:**
- Modify: `src/app/actions/tasks.ts` (after the `user` table update, ~line 474)

The `AnalyticsHeatmap` reads from `daily_logs.completed_count`. This table is never written to currently. Add an upsert after the user XP update inside the `if (userData)` block, right before the loot roll section.

Find the comment `// 3. RNG Loot Roll` and insert this block immediately before it:

```typescript
// Upsert today's daily log — increment completed_count
const today = new Date().toISOString().split('T')[0];
await supabase
  .from('daily_logs')
  .upsert(
    {
      user_id: user.id,
      log_date: today,
      completed_count: 1,
    },
    {
      onConflict: 'user_id, log_date',
      ignoreDuplicates: false,
    }
  )
  .throwOnError();

// Note: Supabase upsert with onConflict does not increment automatically.
// Use a raw SQL increment instead:
await supabase.rpc('increment_daily_completed', { p_user_id: user.id, p_date: today });
```

**Wait** — Supabase client does not natively do `UPDATE ... SET count = count + 1` via upsert. You need a database function. Create this Postgres function in the Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION increment_daily_completed(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_logs (user_id, log_date, completed_count, failed_count)
  VALUES (p_user_id, p_date, 1, 0)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET completed_count = daily_logs.completed_count + 1;
END;
$$;
```

Run that in the Supabase SQL Editor first, then update the `toggleTaskStatus` code to call it:

```typescript
// In toggleTaskStatus, inside if (userData) block, before the loot roll section:
// Increment daily completed count for heatmap
const today = new Date().toISOString().split('T')[0];
await supabase.rpc('increment_daily_completed', {
  p_user_id: user.id,
  p_date: today,
});
```

**Step 1: Run the SQL function in Supabase SQL Editor**

**Step 2: Add the `rpc` call to `toggleTaskStatus` in `src/app/actions/tasks.ts`**

Place it inside the `if (userData)` block, between the `user` table update and the `// 3. RNG Loot Roll` comment.

**Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: increment daily_logs.completed_count on task completion for heatmap"
```

---

## Task 5: Add `getActiveWeeklyBoss` Action

**Files:**
- Modify: `src/app/actions/gamification.ts`

Add this function. It returns the active boss + linked task attacks, or `null` if no active boss exists.

```typescript
import type { Boss, BossAttack } from "@/components/dashboard/gamification/WeeklyBossBoard";

/**
 * Fetches the user's current active weekly boss and its linked task attacks.
 * Returns null if no active boss exists.
 */
export async function getActiveWeeklyBoss(): Promise<{
  boss: Boss;
  attacks: BossAttack[];
} | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch the active boss
    const { data: bossRow } = await supabase
      .from('bosses')
      .select('id, title, description, hp_total, hp_current, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!bossRow) return null;

    // Fetch linked tasks (attacks)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, content, priority, status')
      .eq('boss_id', bossRow.id)
      .eq('user_id', user.id);

    if (!tasks) return null;

    const computeDamage = (priority: string) =>
      priority === 'high' ? 30 : priority === 'medium' ? 20 : 10;

    const attacks: BossAttack[] = tasks.map(t => ({
      id: t.id,
      title: t.content,
      damage: computeDamage(t.priority),
      completed: t.status === 'completed',
    }));

    const boss: Boss = {
      id: bossRow.id,
      title: bossRow.title,
      description: bossRow.description ?? '',
      hpTotal: bossRow.hp_total,
      hpCurrent: bossRow.hp_current,
      expiresAt: bossRow.expires_at,
    };

    return { boss, attacks };
  } catch (error) {
    console.error('[getActiveWeeklyBoss] Error:', error);
    return null;
  }
}
```

**Step 1: Add the import at the top of `gamification.ts`** (alongside existing imports):

```typescript
import type { Boss, BossAttack } from "@/components/dashboard/gamification/WeeklyBossBoard";
```

**Step 2: Add the function body at the end of the file**

**Step 3: Commit**

```bash
git add src/app/actions/gamification.ts
git commit -m "feat: add getActiveWeeklyBoss server action"
```

---

## Task 6: Add `getHeatmapData` Action

**Files:**
- Modify: `src/app/actions/gamification.ts`

```typescript
import type { HeatmapDataPoint } from "@/components/dashboard/gamification/AnalyticsHeatmap";

/**
 * Fetches completed task counts per day for the consistency heatmap.
 */
export async function getHeatmapData(days = 90): Promise<HeatmapDataPoint[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const startStr = startDate.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('log_date, completed_count')
      .eq('user_id', user.id)
      .gte('log_date', startStr)
      .order('log_date', { ascending: true });

    if (!logs) return [];

    return logs.map(l => ({
      date: l.log_date,
      count: l.completed_count,
    }));
  } catch (error) {
    console.error('[getHeatmapData] Error:', error);
    return [];
  }
}
```

Add the `HeatmapDataPoint` import alongside the others at the top.

**Step 1: Add import and function**

**Step 2: Commit**

```bash
git add src/app/actions/gamification.ts
git commit -m "feat: add getHeatmapData server action"
```

---

## Task 7: Add `getEvolutionStatus` Action

**Files:**
- Modify: `src/app/actions/gamification.ts`

This function reads the user's current stats, determines their active evolution branch, and returns 3 ordered nodes for the EvolutionTree: their origin, current branch, and next possible evolution.

```typescript
import type { EvolutionNode } from "@/components/dashboard/gamification/EvolutionTree";
import { determineEvolutionBranch, type EvolutionBranch } from "@/lib/gamification/progression";

type BranchMeta = { name: string; levelReq: number; condition: string };

const BRANCH_META: Record<EvolutionBranch | 'novice', BranchMeta> = {
  novice:   { name: 'Novice',   levelReq: 1,  condition: 'Begin your journey' },
  beast:    { name: 'Beast',    levelReq: 5,  condition: 'STR Dominant (>40%)' },
  mystic:   { name: 'Mystic',   levelReq: 5,  condition: 'CRE + CHA Dominant (>50%)' },
  techno:   { name: 'Techno',   levelReq: 5,  condition: 'INT + DIS Dominant (>50%)' },
  diplomat: { name: 'Diplomat', levelReq: 10, condition: 'CHA + DIS Dominant (>50%)' },
  monk:     { name: 'Monk',     levelReq: 10, condition: 'SPI + DIS Dominant (>50%)' },
  polymath: { name: 'Polymath', levelReq: 20, condition: 'Balanced across all stats' },
};

// What the user could evolve into next, based on current branch
const NEXT_BRANCH: Partial<Record<EvolutionBranch | 'novice', EvolutionBranch>> = {
  novice:   'techno',
  beast:    'polymath',
  mystic:   'polymath',
  techno:   'polymath',
  diplomat: 'polymath',
  monk:     'polymath',
};

/**
 * Returns ordered evolution nodes for display in the EvolutionTree component.
 */
export async function getEvolutionStatus(): Promise<{ nodes: EvolutionNode[] }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { nodes: [] };

    const { data: userData } = await supabase
      .from('user')
      .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
      .eq('id', user.id)
      .single();

    if (!userData) return { nodes: [] };

    const stats = {
      strength_xp:    userData.strength_xp    ?? 0,
      intellect_xp:   userData.intellect_xp   ?? 0,
      discipline_xp:  userData.discipline_xp  ?? 0,
      charisma_xp:    userData.charisma_xp    ?? 0,
      creativity_xp:  userData.creativity_xp  ?? 0,
      spirituality_xp: userData.spirituality_xp ?? 0,
    };

    const totalXp = Object.values(stats).reduce((s, v) => s + v, 0);
    const level = Math.floor(totalXp / 60) + 1;

    const currentBranch = totalXp === 0 ? 'novice' : determineEvolutionBranch(stats);

    const nodes: EvolutionNode[] = [];

    // Node 1: always Novice as origin
    nodes.push({
      id: 'novice',
      ...BRANCH_META.novice,
      isUnlocked: true,
      isActive: currentBranch === 'novice',
    });

    // Node 2: current active branch (if not novice)
    if (currentBranch !== 'novice') {
      const meta = BRANCH_META[currentBranch];
      nodes.push({
        id: currentBranch,
        ...meta,
        isUnlocked: true,
        isActive: true,
      });
    }

    // Node 3: next possible evolution
    const nextBranchKey = NEXT_BRANCH[currentBranch] ?? 'polymath';
    const nextMeta = BRANCH_META[nextBranchKey];
    nodes.push({
      id: nextBranchKey,
      ...nextMeta,
      isUnlocked: level >= nextMeta.levelReq,
      isActive: false,
    });

    return { nodes };
  } catch (error) {
    console.error('[getEvolutionStatus] Error:', error);
    return { nodes: [] };
  }
}
```

**Step 1: Add the imports at top of `gamification.ts`:**

```typescript
import type { EvolutionNode } from "@/components/dashboard/gamification/EvolutionTree";
import { determineEvolutionBranch, type EvolutionBranch } from "@/lib/gamification/progression";
```

**Step 2: Add the `BRANCH_META`, `NEXT_BRANCH` constants and the `getEvolutionStatus` function**

Place constants at module scope (outside any function), then add the function below.

**Step 3: Commit**

```bash
git add src/app/actions/gamification.ts
git commit -m "feat: add getEvolutionStatus server action"
```

---

## Final Verification

Check TypeScript compiles cleanly:

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `hp_max` or `multiplier` column errors, recheck Task 2 fixes.

**Final commit if any loose changes:**

```bash
git add -p
git commit -m "fix: resolve remaining type errors in gamification actions"
```
