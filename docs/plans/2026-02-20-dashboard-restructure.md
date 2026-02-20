# Dashboard Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild dashboard around character identity. Move radar chart to /radar. Add shared AppHeader nav. Remove task input from dashboard.

**Architecture:** New lib/character.ts helpers, CharacterDisplay component, AppHeader component, /radar page, updated dashboard page.

**Tech Stack:** Next.js 15 App Router, Supabase JS, TypeScript, Tailwind CSS v4, Framer Motion

---

## Important Notes Before Starting

- `getUserStats()` currently computes character `level` as `Math.floor(totalXP / 60) + 1`. The XP doc says `/100` but the actual code uses `/60`. Use `/100` for the level milestones in `getCharacterStage` (egg <5, child <15, adult <30, master 30+) regardless — these are level thresholds not XP thresholds.
- `StatGrid` computes per-stat level as `Math.floor(stat.value / 10) + 1`. Use this same formula in the `/radar` legend table.
- Do NOT modify `StatGrid` in this plan — the radar chart inside it is handled by the separate `ai-stat-routing` plan.
- `AppHeader` receives `userEmail` and `currentPath` as props from the page — it does not fetch auth itself.
- `next/image` with local `/public/` images requires no `remotePatterns` config.
- The `isCombo` check: secondary stat XP must be `>= primaryXP * 0.8`.

---

## Task 1: Create `src/lib/character.ts`

**Files:**
- Create: `src/lib/character.ts`

**Step 1: Create the file**

```typescript
// src/lib/character.ts

export type CharacterType =
  | 'warrior'
  | 'scholar'
  | 'monk'
  | 'envoy'
  | 'artisan'
  | 'mystic'
  | 'soldier'
  | 'inventor'
  | 'visionary'
  | 'egg';

export type CharacterStage = 'egg' | 'child' | 'adult' | 'master';

export interface StatValues {
  strength: number;
  intellect: number;
  discipline: number;
  charisma: number;
  creativity: number;
  spirituality: number;
}

export function getCharacterStage(level: number): CharacterStage {
  if (level < 5) return 'egg';
  if (level < 15) return 'child';
  if (level < 30) return 'adult';
  return 'master';
}

export function getNextEvolutionLevel(level: number): number | null {
  if (level < 5) return 5;
  if (level < 15) return 15;
  if (level < 30) return 30;
  return null;
}

export function getCharacterType(stats: StatValues, level: number): CharacterType {
  if (level < 5) return 'egg';

  const ranked = (Object.entries(stats) as [keyof StatValues, number][])
    .sort(([, a], [, b]) => b - a);

  const [first, second] = ranked;
  const firstName = first[0];
  const firstXP = first[1];
  const secondName = second[0];
  const secondXP = second[1];

  function isCombo(
    a: keyof StatValues,
    b: keyof StatValues,
    matchA: keyof StatValues,
    matchB: keyof StatValues
  ): boolean {
    const pairMatch =
      (a === matchA && b === matchB) || (a === matchB && b === matchA);
    if (!pairMatch) return false;
    return secondXP >= firstXP * 0.8;
  }

  if (isCombo(firstName, secondName, 'strength', 'discipline'))  return 'soldier';
  if (isCombo(firstName, secondName, 'intellect', 'creativity')) return 'inventor';
  if (isCombo(firstName, secondName, 'charisma', 'creativity'))  return 'visionary';

  const pureMap: Record<keyof StatValues, CharacterType> = {
    strength:     'warrior',
    intellect:    'scholar',
    discipline:   'monk',
    charisma:     'envoy',
    creativity:   'artisan',
    spirituality: 'mystic',
  };

  return pureMap[firstName];
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/character.ts
git commit -m "feat: add character type and stage helpers"
```

---

## Task 2: Extend `getUserStats()` to return character info

**Files:**
- Modify: `src/app/actions/tasks.ts`

**Step 1: Add import at the top of the file (after existing imports)**

```typescript
import { getCharacterType, getCharacterStage } from '@/lib/character';
```

**Step 2: Replace the return block of `getUserStats()`**

Find the current return block and replace it with:

```typescript
  const stats = {
    strength: strength_xp ?? 0,
    intellect: intellect_xp ?? 0,
    discipline: discipline_xp ?? 0,
    charisma: charisma_xp ?? 0,
    creativity: creativity_xp ?? 0,
    spirituality: spirituality_xp ?? 0,
  };

  const level =
    Math.floor(
      ((strength_xp ?? 0) + (intellect_xp ?? 0) + (discipline_xp ?? 0) +
       (charisma_xp ?? 0) + (creativity_xp ?? 0) + (spirituality_xp ?? 0)) / 60
    ) + 1;

  return {
    stats,
    level,
    xpProgress: Math.min(
      100,
      ((strength_xp ?? 0) % 10 + (intellect_xp ?? 0) % 10 + (discipline_xp ?? 0) % 10) * 3
    ),
    characterType: getCharacterType(stats, level),
    characterStage: getCharacterStage(level),
  };
```

**Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. All existing callers of `getUserStats()` continue to work — the new fields are purely additive.

**Step 4: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: extend getUserStats with characterType and characterStage"
```

---

## Task 3: Create `CharacterDisplay` component

**Files:**
- Create: `src/components/dashboard/CharacterDisplay.tsx`

**Step 1: Create the file**

```typescript
"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { CharacterType, CharacterStage, StatValues, getNextEvolutionLevel } from "@/lib/character";

interface CharacterDisplayProps {
  characterType: CharacterType;
  characterStage: CharacterStage;
  level: number;
  xpProgress: number;
  stats: StatValues;
}

const TYPE_LABELS: Record<CharacterType, string> = {
  warrior: 'Warrior', scholar: 'Scholar', monk: 'Monk',
  envoy: 'Envoy', artisan: 'Artisan', mystic: 'Mystic',
  soldier: 'Soldier', inventor: 'Inventor', visionary: 'Visionary',
  egg: 'Unknown',
};

const STAGE_LABELS: Record<CharacterStage, string> = {
  egg: 'Egg', child: 'Child', adult: 'Adult', master: 'Master',
};

const STAT_META: { key: keyof StatValues; label: string; color: string; dotColor: string }[] = [
  { key: 'strength',     label: 'STR', color: 'text-red-500',     dotColor: 'bg-red-500'     },
  { key: 'intellect',    label: 'INT', color: 'text-blue-500',    dotColor: 'bg-blue-500'    },
  { key: 'discipline',   label: 'DIS', color: 'text-amber-500',   dotColor: 'bg-amber-500'   },
  { key: 'charisma',     label: 'CHA', color: 'text-purple-500',  dotColor: 'bg-purple-500'  },
  { key: 'creativity',   label: 'CRE', color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
  { key: 'spirituality', label: 'SPI', color: 'text-indigo-500',  dotColor: 'bg-indigo-500'  },
];

function getTop2Stats(stats: StatValues) {
  return STAT_META
    .map(meta => ({ meta, xp: stats[meta.key] }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 2)
    .map(r => r.meta);
}

function getImageSrc(characterType: CharacterType, characterStage: CharacterStage): string {
  if (characterType === 'egg' || characterStage === 'egg') return '/characters/egg.png';
  return `/characters/${characterType}/${characterStage}.png`;
}

export default function CharacterDisplay({
  characterType, characterStage, level, xpProgress, stats,
}: CharacterDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = getImageSrc(characterType, characterStage);
  const nextEvolution = getNextEvolutionLevel(level);
  const top2 = getTop2Stats(stats);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Character Image */}
        <div className="shrink-0">
          {!imgError ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
              <Image
                src={imageSrc}
                alt={`${TYPE_LABELS[characterType]} ${STAGE_LABELS[characterStage]}`}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center leading-tight px-1">
                {characterType === 'egg' ? '?' : TYPE_LABELS[characterType]}
              </span>
            </div>
          )}
        </div>

        {/* Character Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-slate-900 leading-none">{level}</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {characterType === 'egg' ? 'Unhatched' : TYPE_LABELS[characterType]}
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest ml-1">
              · {STAGE_LABELS[characterStage]}
            </span>
          </div>

          {characterType !== 'egg' && (
            <div className="flex items-center gap-3 mb-3">
              {top2.map(stat => (
                <div key={stat.key} className="flex items-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${stat.color}`}>
                    {stat.label}
                  </span>
                  <span className="flex gap-px">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < Math.min(5, Math.floor(stats[stat.key] / 10) + 1)
                            ? stat.dotColor
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>XP Progress</span>
              <span>{xpProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {nextEvolution !== null ? `Evolves at Level ${nextEvolution}` : 'Max Evolution'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/dashboard/CharacterDisplay.tsx
git commit -m "feat: add CharacterDisplay component"
```

---

## Task 4: Create `AppHeader` shared component

**Files:**
- Create: `src/components/AppHeader.tsx`

**Step 1: Create the file**

```typescript
import Link from "next/link";
import { LogOut } from "lucide-react";

interface AppHeaderProps {
  userEmail: string;
  currentPath: string;
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks',     label: 'Tasks'     },
  { href: '/radar',     label: 'Radar'     },
];

export default function AppHeader({ userEmail, currentPath }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45" />
            </div>
            <span className="font-black tracking-tighter text-xl">CH_OS</span>
          </div>
          <nav className="flex items-center space-x-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = currentPath === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive
                      ? "px-3 py-1.5 rounded-lg text-sm font-bold text-slate-900 bg-slate-100"
                      : "px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Operative</span>
            <span className="text-sm font-bold text-slate-900">{userEmail}</span>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: add shared AppHeader component with nav links"
```

---

## Task 5: Update `src/app/dashboard/page.tsx`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Replace the full file**

```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserStats } from "../actions/tasks";
import StatGrid from "@/components/dashboard/StatGrid";
import AppHeader from "@/components/AppHeader";
import CharacterDisplay from "@/components/dashboard/CharacterDisplay";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const userStats = await getUserStats();

  if (!userStats) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
      <AppHeader userEmail={user.email!} currentPath="/dashboard" />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <section>
          <CharacterDisplay
            characterType={userStats.characterType}
            characterStage={userStats.characterStage}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
            stats={userStats.stats}
          />
        </section>

        <section>
          <StatGrid
            stats={userStats.stats}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
          />
        </section>

        <section className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/radar"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
          >
            View Radar Chart <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
          >
            Manage Tasks <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
```

**Step 2: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`:
1. AppHeader renders with logo + Dashboard/Tasks/Radar nav + user email
2. CharacterDisplay card shows (gray placeholder if no images yet)
3. StatGrid renders below
4. DashboardCommand and TaskStack are gone
5. Bottom links appear

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: rebuild dashboard with CharacterDisplay and AppHeader"
```

---

## Task 6: Create `/radar` page

**Files:**
- Create: `src/components/radar/RadarPageChart.tsx`
- Create: `src/app/radar/page.tsx`

**Step 1: Create `src/components/radar/RadarPageChart.tsx`**

```typescript
"use client";

import { motion } from "motion/react";

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 107;
const RINGS = 4;
const PRIMARY = "#0056d2";

const AXES = [
  { label: "STR", color: "#ef4444" },
  { label: "INT", color: "#3b82f6" },
  { label: "DIS", color: "#f59e0b" },
  { label: "CHA", color: "#a855f7" },
  { label: "CRE", color: "#10b981" },
  { label: "SPI", color: "#6366f1" },
];

function toRadians(deg: number) { return (deg * Math.PI) / 180; }

function vertex(cx: number, cy: number, r: number, index: number): [number, number] {
  const angle = toRadians(-90 + index * 60);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function pointsString(values: number[], cx: number, cy: number, maxR: number): string {
  return values.map((v, i) => { const [x, y] = vertex(cx, cy, v * maxR, i); return `${x},${y}`; }).join(" ");
}

export default function RadarPageChart({ values }: { values: number[] }) {
  const finalPoints = pointsString(values, CX, CY, R);
  const zeroPoints = pointsString(Array(6).fill(0), CX, CY, R);

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="Character stats radar chart" className="overflow-visible">
      {Array.from({ length: RINGS }).map((_, i) => (
        <polygon key={i} points={pointsString(Array(6).fill(1), CX, CY, (R / RINGS) * (i + 1))} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {AXES.map((_, i) => { const [x, y] = vertex(CX, CY, R, i); return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />; })}
      <motion.polygon initial={{ points: zeroPoints }} animate={{ points: finalPoints }} transition={{ duration: 0.8, ease: "easeOut" }} fill={PRIMARY} fillOpacity={0.15} stroke={PRIMARY} strokeWidth="2" strokeLinejoin="round" />
      {AXES.map((axis, i) => {
        const [fx, fy] = vertex(CX, CY, values[i] * R, i);
        const [zx, zy] = vertex(CX, CY, 0, i);
        return <motion.circle key={i} initial={{ cx: zx, cy: zy }} animate={{ cx: fx, cy: fy }} transition={{ duration: 0.8, ease: "easeOut" }} r={4} fill={axis.color} stroke="white" strokeWidth="1.5" />;
      })}
      {AXES.map((axis, i) => {
        const [lx, ly] = vertex(CX, CY, R + 28, i);
        const angle = -90 + i * 60;
        const textAnchor = angle === -90 || angle === 90 ? "middle" : angle < 0 || angle > 90 ? "end" : "start";
        const dy = angle === -90 ? -4 : angle === 90 ? 14 : 4;
        return <text key={i} x={lx} y={ly + dy} textAnchor={textAnchor} fontSize="11" fontWeight="700" fontFamily="inherit" letterSpacing="0.1em" fill={axis.color}>{axis.label}</text>;
      })}
    </svg>
  );
}
```

**Step 2: Create `src/app/radar/page.tsx`**

```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserStats } from "@/app/actions/tasks";
import AppHeader from "@/components/AppHeader";
import RadarPageChart from "@/components/radar/RadarPageChart";

const STAT_DEFS = [
  { key: 'strength'     as const, label: 'Strength',     color: '#ef4444', dotBg: 'bg-red-500'     },
  { key: 'intellect'    as const, label: 'Intellect',    color: '#3b82f6', dotBg: 'bg-blue-500'    },
  { key: 'discipline'   as const, label: 'Discipline',   color: '#f59e0b', dotBg: 'bg-amber-500'   },
  { key: 'charisma'     as const, label: 'Charisma',     color: '#a855f7', dotBg: 'bg-purple-500'  },
  { key: 'creativity'   as const, label: 'Creativity',   color: '#10b981', dotBg: 'bg-emerald-500' },
  { key: 'spirituality' as const, label: 'Spirituality', color: '#6366f1', dotBg: 'bg-indigo-500'  },
];

export default async function RadarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const userStats = await getUserStats();
  if (!userStats) redirect("/onboarding");

  const { stats } = userStats;
  const statRows = STAT_DEFS.map(def => ({
    ...def,
    xp:    stats[def.key],
    level: Math.floor(stats[def.key] / 10) + 1,
  }));
  const normalizedValues = STAT_DEFS.map(def => Math.min(stats[def.key], 100) / 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
      <AppHeader userEmail={user.email!} currentPath="/radar" />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Stat Analysis</div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Radar Chart</h1>
        </div>
        <div className="flex justify-center mb-10">
          <RadarPageChart values={normalizedValues} />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-4 px-5 py-2 border-b border-slate-100">
            {['Stat', 'XP', 'Level', 'Progress'].map(h => (
              <span key={h} className={`text-[10px] font-black text-slate-400 uppercase tracking-widest ${h !== 'Stat' ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>
          {statRows.map((row, i) => (
            <div key={row.key} className={`grid grid-cols-4 items-center px-5 py-3 ${i < statRows.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.dotBg}`} />
                <span className="text-sm font-bold text-slate-700">{row.label}</span>
              </div>
              <span className="text-sm font-black text-slate-900 text-right">{row.xp}</span>
              <span className="text-sm font-bold text-slate-500 text-right">Lv.{row.level}</span>
              <div className="flex justify-end">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${row.dotBg} opacity-60`} style={{ width: `${(row.xp % 10) * 10}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
```

**Step 3: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/radar`:
1. AppHeader renders with "Radar" link active
2. Large radar chart (320px) centered and animates in
3. Legend table shows all 6 stats with XP values and per-stat levels
4. Navigating between `/dashboard` and `/radar` works via nav links

**Step 4: Commit**

```bash
git add src/components/radar/RadarPageChart.tsx src/app/radar/page.tsx
git commit -m "feat: add /radar page with full-size chart and stat legend"
```

---

## Implementation Order

Execute tasks in this sequence:

1. Task 1 — `src/lib/character.ts`
2. Task 2 — extend `getUserStats()` in `tasks.ts`
3. Task 3 — `CharacterDisplay.tsx` (parallel with Task 4 safe)
4. Task 4 — `AppHeader.tsx`
5. Task 6 step 1 — `RadarPageChart.tsx` (client component, no deps)
6. Task 5 — `dashboard/page.tsx`
7. Task 6 step 2 — `radar/page.tsx`

---

## Merge Conflict Note

The `ai-stat-routing` branch also modifies `getUserStats()`. When merging, keep both additions in the return block — multi-stat XP fields from that plan plus `characterType` and `characterStage` from this one. The `/tasks` page link in the dashboard will 404 until the task system plan is executed.
