# Gamification Hub — Agent 2: UI Components

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `WeeklyBossBoard` handle a missing boss with an empty state and a generate button. Verify `EvolutionTree` and `AnalyticsHeatmap` are production-ready with no mock dependencies.

**Architecture:** Only the three component files under `src/components/dashboard/gamification/` are touched. No server actions, no dashboard page. Changes are purely to component props and rendering logic.

**Tech Stack:** React, TypeScript, motion/react, clsx, Lucide icons. Same visual language as the rest of the app: `border-border`, `text-faint`, `text-text`, `bg-slate-50`, `rounded-sm`, `tracking-widest` labels.

---

## Prerequisites — Read These Files First

Before making any changes, read all three component files in full:

- `src/components/dashboard/gamification/WeeklyBossBoard.tsx`
- `src/components/dashboard/gamification/EvolutionTree.tsx`
- `src/components/dashboard/gamification/AnalyticsHeatmap.tsx`

Also read `src/components/dashboard/CharacterDisplay.tsx` for reference on what the app's visual language looks like — note the use of `text-[10px] font-black text-faint uppercase tracking-widest`, `border-border`, `bg-slate-100`, `rounded-sm`, `text-text`.

---

## Task 1: Make `WeeklyBossBoard` Handle a Missing Boss

**Files:**
- Modify: `src/components/dashboard/gamification/WeeklyBossBoard.tsx`

Currently the `boss` prop is required. When no active boss exists in the database, the GamificationHub will pass `undefined`. The component must show an empty state with a "Generate Boss" button.

**Step 1: Update the props interface**

Find the existing props interface:

```typescript
// BEFORE
interface WeeklyBossBoardProps {
  boss: Boss;
  attacks: BossAttack[];
  onAttackToggle?: (attackId: string, completed: boolean) => void;
}
```

Replace with:

```typescript
// AFTER
interface WeeklyBossBoardProps {
  boss?: Boss;
  attacks: BossAttack[];
  onAttackToggle?: (attackId: string, completed: boolean) => void;
  onGenerateBoss?: () => void;
  generatingBoss?: boolean;
}
```

**Step 2: Update the function signature**

```typescript
// BEFORE
export default function WeeklyBossBoard({ boss, attacks, onAttackToggle }: WeeklyBossBoardProps) {

// AFTER
export default function WeeklyBossBoard({
  boss,
  attacks,
  onAttackToggle,
  onGenerateBoss,
  generatingBoss = false,
}: WeeklyBossBoardProps) {
```

**Step 3: Guard the `hpPercent` and `isDefeated` calculations**

These currently assume `boss` is defined. Move them inside the render, guarded:

```typescript
// BEFORE (at top of function body)
const hpPercent = Math.max(0, Math.min(100, (boss.hpCurrent / boss.hpTotal) * 100));
const isDefeated = boss.hpCurrent <= 0;

// AFTER
const hpPercent = boss ? Math.max(0, Math.min(100, (boss.hpCurrent / boss.hpTotal) * 100)) : 0;
const isDefeated = boss ? boss.hpCurrent <= 0 : false;
```

**Step 4: Add the empty state branch**

After the props destructuring and the two calculations, add a conditional early return for the empty state. Insert this before the main `return (`:

```typescript
// Empty state — no active boss
if (!boss) {
  return (
    <div className="w-full border border-border bg-slate-50/50 p-4 rounded-sm">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-sm font-black text-text uppercase tracking-widest leading-none flex items-center gap-2">
          <Skull size={14} className="text-orange-500" />
          Weekly Boss
        </h2>
      </div>

      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-border flex items-center justify-center">
          <Skull size={18} className="text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-text mb-1">No Active Boss</p>
          <p className="text-[11px] text-muted max-w-[220px] leading-relaxed">
            Link your pending tasks to a weekly boss to track completion as combat.
          </p>
        </div>
        <button
          onClick={onGenerateBoss}
          disabled={generatingBoss || !onGenerateBoss}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-border rounded-sm bg-white hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {generatingBoss ? (
            <>
              <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Summoning...
            </>
          ) : (
            <>
              <Flame size={12} className="text-orange-500" />
              Summon Boss
            </>
          )}
        </button>
        {!onGenerateBoss && (
          <p className="text-[10px] text-faint">Add at least 3 pending tasks first.</p>
        )}
      </div>
    </div>
  );
}
```

Note: `Flame` is already imported. The empty state uses the same `border-border`, `bg-slate-50/50`, `rounded-sm` patterns as the rest of the app.

**Step 5: Fix the boss data access in the main render**

In the main return, `boss` is now guaranteed to be defined (we returned early if it wasn't). TypeScript still needs the non-null assertion removed. The existing code accesses `boss.expiresAt`, `boss.title`, etc. — TypeScript will be happy once the early return guard is in place, since after the guard `boss` is narrowed to `Boss`.

**Step 6: Verify the file compiles**

```bash
npx tsc --noEmit 2>&1 | grep WeeklyBossBoard
```

Expected: no errors.

**Step 7: Commit**

```bash
git add src/components/dashboard/gamification/WeeklyBossBoard.tsx
git commit -m "feat: add empty state and generate boss button to WeeklyBossBoard"
```

---

## Task 2: Verify `EvolutionTree` with Real Data Shape

**Files:**
- Read + inspect: `src/components/dashboard/gamification/EvolutionTree.tsx`

The `EvolutionTree` component receives `nodes: EvolutionNode[]` as props. It renders them in a vertical list. No changes to the component logic are needed — it already handles the full range of node states (`isActive`, `isUnlocked`, locked/faded).

**Step 1: Check edge cases in the component**

Read through the render logic and verify:

1. **Empty array** — if `nodes` is `[]`, the component renders the header but an empty list. This is acceptable.
2. **Single node** — renders correctly (just one item in the vertical list).
3. **`isActive: true` on multiple nodes** — the `layoutId="activeEvolution"` on the motion div would animate between them. This is fine since only one should ever be active.

No code changes needed unless you find a bug.

**Step 2: Confirm `EvolutionNode` export is present**

The type must be exported from the component file so `gamification.ts` (Agent 1) can import it:

```typescript
// Should already be at top of EvolutionTree.tsx:
export interface EvolutionNode {
  id: string;
  name: string;
  levelReq: number;
  condition: string;
  isUnlocked: boolean;
  isActive: boolean;
}
```

If the `export` keyword is missing, add it.

**Step 3: Commit if any change was made**

```bash
git add src/components/dashboard/gamification/EvolutionTree.tsx
git commit -m "fix: export EvolutionNode type from EvolutionTree"
```

If no change was needed, no commit required.

---

## Task 3: Verify `AnalyticsHeatmap` with Real (Sparse) Data

**Files:**
- Read + inspect: `src/components/dashboard/gamification/AnalyticsHeatmap.tsx`

The real `daily_logs` data will often have sparse entries — most days will have no entry in the DB (count = 0). The component already handles this with `dataMap.get(date) || 0`. Verify the edge cases:

**Step 1: Check the `maxCount` calculation**

Currently:

```typescript
const maxCount = useMemo(() => Math.max(5, ...data.map(d => d.count)), [data]);
```

If `data` is an empty array, `Math.max(5, ...[] )` returns `5` — this is correct and safe.

**Step 2: Check date alignment**

The component generates dates using `new Date()` which uses the local timezone. The `daily_logs.log_date` column stores `DATE` (no timezone). Verify the comparison works correctly by checking the `generateDateRange` function — it uses `.toISOString().split('T')[0]` which returns UTC date. This could be off by one day for users in UTC-X timezones after midnight UTC.

This is an acceptable edge case for now. Do not over-engineer a timezone fix. Add a comment noting the known limitation:

```typescript
// Note: dates are generated in UTC. For users in negative UTC offsets,
// today's local date may differ from the UTC date after midnight UTC.
// This is an acceptable edge case for the current phase.
function generateDateRange(days: number) {
```

**Step 3: Confirm `HeatmapDataPoint` export is present**

```typescript
// Should already be at top of AnalyticsHeatmap.tsx:
export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}
```

If the `export` keyword is missing, add it.

**Step 4: Commit if any change was made**

```bash
git add src/components/dashboard/gamification/AnalyticsHeatmap.tsx
git commit -m "fix: ensure HeatmapDataPoint is exported, add timezone edge case comment"
```

---

## Task 4: Verify `Boss` and `BossAttack` Exports from `WeeklyBossBoard`

**Files:**
- Read: `src/components/dashboard/gamification/WeeklyBossBoard.tsx`

Agent 1's `getActiveWeeklyBoss` function imports `Boss` and `BossAttack` types from this file. Confirm both are exported:

```typescript
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
```

If either is missing the `export` keyword, add it. These were already exported in the original file — just verify.

**Step 1: Check the file**

**Step 2: Commit if changed**

```bash
git add src/components/dashboard/gamification/WeeklyBossBoard.tsx
git commit -m "fix: ensure Boss and BossAttack types are exported"
```

---

## Final Verification

Ensure TypeScript is happy across all three component files:

```bash
npx tsc --noEmit 2>&1 | grep -E "gamification/"
```

Expected: no output (no errors).

Also do a quick visual audit — mentally trace through the render logic for each component with these scenarios:
- `WeeklyBossBoard` with `boss = undefined` → should show empty state with Summon button
- `WeeklyBossBoard` with `boss` populated and 3 attacks (1 completed, 2 not) → should show HP bar at ~67%
- `EvolutionTree` with `nodes = []` → should show header, empty body, no crash
- `EvolutionTree` with 3 nodes → should render vertical list with active ring on the active node
- `AnalyticsHeatmap` with `data = []` → should render 90 grey cells, no crash
