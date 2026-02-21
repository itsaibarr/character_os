# Gamification Hub — Agent 3: Dashboard Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a self-contained `GamificationHub` component that fetches real data and renders the three gamification widgets. Replace the entire mock data block in `dashboard/page.tsx` with a single `<GamificationHub />`.

**Architecture:** New file `src/components/dashboard/GamificationHub.tsx` handles all fetching and state for the gamification section. `dashboard/page.tsx` no longer owns any gamification state. The hub calls the server actions added by Agent 1 and renders the updated components from Agent 2.

**Tech Stack:** React (useState, useEffect, useCallback), Next.js Server Actions, TypeScript.

**Dependency note:** This plan assumes Agent 1 has added these exports to `src/app/actions/gamification.ts`:
- `getActiveWeeklyBoss()` → `Promise<{ boss: Boss; attacks: BossAttack[] } | null>`
- `getHeatmapData(days?: number)` → `Promise<HeatmapDataPoint[]>`
- `getEvolutionStatus()` → `Promise<{ nodes: EvolutionNode[] }>`

And Agent 2 has updated `WeeklyBossBoard` to accept `boss?: Boss`, `onGenerateBoss?`, `generatingBoss?`.

If Agent 1 is not yet complete, you can stub the server actions locally and replace the stubs once Agent 1 merges.

---

## Prerequisites — Read These Files First

- `src/app/dashboard/page.tsx` — understand exactly what mock state you are removing
- `src/app/actions/gamification.ts` — know the function signatures you will call
- `src/components/dashboard/gamification/WeeklyBossBoard.tsx` — know the props it now accepts
- `src/components/dashboard/gamification/EvolutionTree.tsx` — know its props
- `src/components/dashboard/gamification/AnalyticsHeatmap.tsx` — know its props
- `src/components/dashboard/TaskStackWrapper.tsx` — reference for how other dashboard components handle loading state

---

## Task 1: Create `GamificationHub.tsx`

**Files:**
- Create: `src/components/dashboard/GamificationHub.tsx`

This is a self-contained `"use client"` component. It owns all loading, error, and data state for the three gamification widgets. It never receives gamification data as props from the dashboard — it fetches its own.

```typescript
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
  getActiveWeeklyBoss,
  getHeatmapData,
  getEvolutionStatus,
  generateWeeklyBoss,
} from "@/app/actions/gamification";
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
    loadAll().finally(() => setLoading(false));
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
```

**Step 1: Create the file at `src/components/dashboard/GamificationHub.tsx` with the code above**

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep GamificationHub
```

Expected: no output (no errors). If Agent 1's actions don't exist yet, you'll see import errors — stub them temporarily:

```typescript
// Temporary stub if Agent 1 is not yet merged:
// async function getActiveWeeklyBoss() { return null; }
// async function getHeatmapData() { return []; }
// async function getEvolutionStatus() { return { nodes: [] }; }
```

Remove stubs once Agent 1's branch is merged.

**Step 3: Commit**

```bash
git add src/components/dashboard/GamificationHub.tsx
git commit -m "feat: add GamificationHub self-fetching component"
```

---

## Task 2: Clean Up `dashboard/page.tsx`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

The dashboard page currently owns mock state for all three gamification widgets plus LootDropAlert and NPCChatWidget. You will remove the gamification mock state and replace the grid section with `<GamificationHub />`.

### Step 1: Remove mock state variables

Find and delete these `useState` declarations:

```typescript
// DELETE these lines:
const [bossExpiresAt, setBossExpiresAt] = useState<string>("");
const [heatmapData, setHeatmapData] = useState<{date: string, count: number}[]>([]);
const [lootItem, setLootItem] = useState<LootItem | null>(null);
const [bossAttacks, setBossAttacks] = useState([
  { id: "1", title: "Complete Physics Homework", damage: 15, completed: true },
  { id: "2", title: "Workout for 45 mins", damage: 20, completed: false },
  { id: "3", title: "Read 20 pages", damage: 10, completed: false }
]);
const [chatMessages, setChatMessages] = useState<Array<...>>([...]);
```

### Step 2: Remove the `useEffect` that sets `bossExpiresAt`

```typescript
// DELETE this effect:
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setBossExpiresAt(new Date(Date.now() + 86400000 * 3).toISOString());
}, []);
```

### Step 3: Remove mock side effects from `loadData`

Inside the main `loadData` `useEffect`, find and delete:

```typescript
// DELETE: mock loot drop trigger
setTimeout(() => {
  setLootItem({
    id: "mock_1",
    name: "Scroll of the Scholar",
    rarity: "rare",
    effectType: "xp_boost"
  });
}, 3000);

// DELETE: mock heatmap generation
const mockHeatmap = Array.from({ length: 90 }).map((_, i) => ({
  date: new Date(Date.now() - (89 - i) * 86400000).toISOString().split('T')[0],
  count: Math.floor(Math.random() * 8)
}));
setHeatmapData(mockHeatmap);
```

### Step 4: Remove dead handlers and mock nodes

Delete these functions and constants entirely (they are no longer used):

```typescript
// DELETE:
const handleBossAttackToggle = (id: string, completed: boolean) => { ... };
const handleSendMessage = (text: string) => { ... };
const evolutionNodes = [...];
const currentBossHp = ...;
```

### Step 5: Remove gamification component imports that move to GamificationHub

```typescript
// DELETE these import lines:
import WeeklyBossBoard from "@/components/dashboard/gamification/WeeklyBossBoard";
import AnalyticsHeatmap from "@/components/dashboard/gamification/AnalyticsHeatmap";
import EvolutionTree from "@/components/dashboard/gamification/EvolutionTree";
import LootDropAlert, { LootItem } from "@/components/dashboard/gamification/LootDropAlert";
import NPCChatWidget from "@/components/dashboard/gamification/NPCChatWidget";
```

### Step 6: Add the `GamificationHub` import

```typescript
import GamificationHub from "@/components/dashboard/GamificationHub";
```

### Step 7: Replace the gamification section in the JSX

Find this block in the JSX:

```typescript
{/* Global Loot Drop Alert */}
<LootDropAlert item={lootItem} onDismiss={() => setLootItem(null)} />

{/* NPC Chat Widget */}
<NPCChatWidget
  npcName="Aura"
  moodScore={85}
  messages={chatMessages}
  onSendMessage={handleSendMessage}
/>
```

Replace with nothing (delete both widgets for now — they are separate features not in scope):

```typescript
{/* LootDropAlert and NPCChatWidget to be wired with real data in a future task */}
```

Find the gamification grid section:

```typescript
{/* BOTTOM ROW: Gamification Mechanics Elements */}
<div>
   <h2 className="text-sm font-black text-text uppercase tracking-widest leading-none mb-6">
     Gamification Hub (Mock Data)
   </h2>
   <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="flex flex-col gap-8">
        <WeeklyBossBoard boss={...} attacks={bossAttacks} onAttackToggle={handleBossAttackToggle} />
        <EvolutionTree nodes={evolutionNodes} />
      </div>
      <div className="flex flex-col gap-8">
        <AnalyticsHeatmap data={heatmapData} days={90} />
      </div>
   </div>
</div>
```

Replace with:

```typescript
{/* BOTTOM ROW: Gamification Hub */}
<div>
  <h2 className="text-sm font-black text-text uppercase tracking-widest leading-none mb-6">
    Gamification Hub
  </h2>
  <GamificationHub onStatChange={refreshStats} />
</div>
```

**Step 8: Verify TypeScript compiles for the dashboard**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/page"
```

Expected: no output.

**Step 9: Check for unused import warnings**

```bash
npx eslint src/app/dashboard/page.tsx --rule '{"no-unused-vars": "warn"}'
```

Remove any remaining unused imports flagged.

**Step 10: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: replace mock gamification data with GamificationHub component"
```

---

## Task 3: Full TypeScript and Lint Check

**Files:** All modified files

```bash
npx tsc --noEmit
npx eslint src/app/dashboard/page.tsx src/components/dashboard/GamificationHub.tsx
```

Fix any errors before the final commit.

**Commit any fixes:**

```bash
git add -p
git commit -m "fix: resolve lint/type errors in dashboard integration"
```

---

## Task 4: Smoke Test

Start the dev server and verify the gamification hub renders:

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` and check:

1. **Loading state** — briefly shows a spinner before data loads.
2. **Weekly Boss section** — if the user has an active boss, shows boss HP bar and task attacks. If no boss, shows the "Summon Boss" empty state.
3. **Evolution Pathways** — shows 2-3 nodes with the current branch highlighted. If the user has no XP, shows Novice as active + two locked nodes.
4. **Consistency Heatmap** — shows 90 cells. Empty cells are light grey. Any day where tasks were completed shows a darker cell.
5. **Section title** — reads "Gamification Hub" (no "Mock Data" suffix).
6. **No console errors** — especially no React hooks order warnings (fixed in the earlier hooks fix session).

If the DB tables don't exist yet (migration not applied), `getActiveWeeklyBoss` and `getHeatmapData` will return empty/null gracefully — the UI should still render without crashing.

---

## Rollback Plan

If any server action from Agent 1 causes a 500 error in production, the `GamificationHub` will show the spinner indefinitely because `loadAll` rejects. Add a catch to the `useEffect`:

```typescript
useEffect(() => {
  loadAll()
    .catch(err => console.error('[GamificationHub] load error:', err))
    .finally(() => setLoading(false));
}, [loadAll]);
```

This ensures the hub always exits the loading state, even on error. The widgets then render with empty data gracefully.

Add this error handling before the final commit if not already included.
