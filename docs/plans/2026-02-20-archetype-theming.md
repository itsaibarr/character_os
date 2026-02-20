# Archetype Theming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch dashboard accent colors based on the user's chosen archetype (Cyberpunk for Builder/Scholar, Zen for others).

**Architecture:** `getUserStats()` returns archetype. Dashboard passes it to a client-side `<ThemeProvider>` that overrides CSS variable values on a wrapper div. All existing components use `var(--color-primary)` already — zero component changes needed.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4 CSS variables, TypeScript

---

## Theme Reference

| Theme | Archetypes | --color-primary | --color-primary-hover | --color-primary-light | --color-primary-ring |
|---|---|---|---|---|---|
| Cyberpunk | Builder, Scholar | `#00d4ff` | `#00b8e0` | `#e0f9ff` | `rgba(0, 212, 255, 0.15)` |
| Zen | Athlete, Operator, Leader | `#d97706` | `#b45309` | `#fef3c7` | `rgba(217, 119, 6, 0.15)` |
| Default | (none / fallback) | `#0056d2` | `#0049b0` | `#e3f2fd` | `rgba(0, 86, 210, 0.15)` |

---

## Task 1: Extend `getUserStats()` to return `archetype`

**Files:**
- Modify: `src/app/actions/tasks.ts`

The `archetype` column is already written during onboarding (`src/app/actions/onboarding.ts` line 43: `archetype: data.archetype`). It just needs to be read back.

**Step 1: Update the select query and return value**

In `getUserStats()`, replace the entire function with:

```typescript
export async function getUserStats() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: userData } = await supabase
    .from('user')
    .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, archetype')
    .eq('id', user.id)
    .single();

  if (!userData) return null;

  const { strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, archetype } = userData;

  return {
    stats: {
      strength: strength_xp ?? 0,
      intellect: intellect_xp ?? 0,
      discipline: discipline_xp ?? 0,
      charisma: charisma_xp ?? 0,
      creativity: creativity_xp ?? 0,
      spirituality: spirituality_xp ?? 0,
    },
    level: Math.floor(((strength_xp ?? 0) + (intellect_xp ?? 0) + (discipline_xp ?? 0) + (charisma_xp ?? 0) + (creativity_xp ?? 0) + (spirituality_xp ?? 0)) / 60) + 1,
    xpProgress: Math.min(100, ((strength_xp ?? 0) % 10 + (intellect_xp ?? 0) % 10 + (discipline_xp ?? 0) % 10) * 3),
    archetype: (archetype as string | null) ?? null,
  };
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors in `src/app/actions/tasks.ts`.

**Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: expose archetype from getUserStats"
```

---

## Task 2: Create `<ThemeProvider>` client component

**Files:**
- Create: `src/components/ThemeProvider.tsx`

A `"use client"` component that receives `archetype`, derives the correct CSS variable values, and injects them on a wrapper `div` via the `style` prop. All descendants using `var(--color-primary)` etc. pick up the override automatically.

**Step 1: Create the file**

```typescript
"use client";

type Archetype = string | null;

interface ThemeVars {
  "--color-primary": string;
  "--color-primary-hover": string;
  "--color-primary-light": string;
  "--color-primary-ring": string;
}

const CYBERPUNK_ARCHETYPES = new Set(["Builder", "Scholar"]);

function getThemeVars(archetype: Archetype): ThemeVars {
  if (archetype && CYBERPUNK_ARCHETYPES.has(archetype)) {
    return {
      "--color-primary": "#00d4ff",
      "--color-primary-hover": "#00b8e0",
      "--color-primary-light": "#e0f9ff",
      "--color-primary-ring": "rgba(0, 212, 255, 0.15)",
    };
  }

  if (archetype && ["Athlete", "Operator", "Leader"].includes(archetype)) {
    return {
      "--color-primary": "#d97706",
      "--color-primary-hover": "#b45309",
      "--color-primary-light": "#fef3c7",
      "--color-primary-ring": "rgba(217, 119, 6, 0.15)",
    };
  }

  // Default — matches globals.css baseline
  return {
    "--color-primary": "#0056d2",
    "--color-primary-hover": "#0049b0",
    "--color-primary-light": "#e3f2fd",
    "--color-primary-ring": "rgba(0, 86, 210, 0.15)",
  };
}

interface ThemeProviderProps {
  archetype: Archetype;
  children: React.ReactNode;
}

export default function ThemeProvider({ archetype, children }: ThemeProviderProps) {
  const themeVars = getThemeVars(archetype);
  return (
    <div style={themeVars as React.CSSProperties}>
      {children}
    </div>
  );
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `src/components/ThemeProvider.tsx`.

**Step 3: Commit**

```bash
git add src/components/ThemeProvider.tsx
git commit -m "feat: add ThemeProvider client component for archetype-based CSS variable overrides"
```

---

## Task 3: Wire `ThemeProvider` into the dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Replace the full file**

```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTasks, getUserStats, createTask, toggleTaskStatus } from "../actions/tasks";
import DashboardCommand from "@/components/dashboard/DashboardCommand";
import TaskStack from "@/components/dashboard/TaskStack";
import StatGrid from "@/components/dashboard/StatGrid";
import ThemeProvider from "@/components/ThemeProvider";
import { LogOut } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const tasks = await getTasks() as any[];
  const userStats = await getUserStats();

  if (!userStats) redirect("/onboarding");

  const handleTaskCreated = async (content: string) => {
    "use server";
    await createTask(content);
  };

  const handleToggleTask = async (taskId: string) => {
    "use server";
    await toggleTaskStatus(taskId);
  };

  return (
    <ThemeProvider archetype={userStats.archetype}>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rotate-45" />
              </div>
              <span className="font-black tracking-tighter text-xl">CH_OS</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Operative</span>
                <span className="text-sm font-bold text-slate-900">{user.email}</span>
              </div>
              <form action="/auth/sign-out" method="post">
                <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
          <section>
            <StatGrid
              stats={userStats.stats}
              level={userStats.level}
              xpProgress={userStats.xpProgress}
            />
          </section>
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">What is the focus today?</h2>
              <p className="text-slate-400 font-medium">Input your intent. AI will decompose and scale.</p>
            </div>
            <DashboardCommand onTaskCreated={handleTaskCreated} />
          </section>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Task Stack</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tasks.filter(t => t.status !== 'completed').length} Pending</span>
            </div>
            <TaskStack tasks={tasks} onToggleStatus={handleToggleTask} />
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

**Step 3: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` and verify:

1. **Builder or Scholar account**: accent elements (XP bar, command button, input focus ring) render in electric cyan (`#00d4ff`)
2. **Athlete, Operator, or Leader account**: same elements render in warm amber (`#d97706`)
3. **Account with no archetype** (old test account): elements render in default blue (`#0056d2`) — identical to before
4. **No visual regressions**: layout, spacing, card borders unchanged
5. **Inspect element** on the `ThemeProvider` wrapper div: `style` attribute shows correct CSS variable overrides

**Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: apply archetype-based theme via ThemeProvider on dashboard"
```
