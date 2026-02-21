# Redesign Agent 1: Shell + Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the top-bar navigation with a fixed dark sidebar, update the design token system (rename `primary` → `accent`), and redesign the dashboard to use an editorial horizontal layout with no card wrappers.

**Architecture:** New `AppSidebar` component replaces `AppHeader` globally. Token rename in `globals.css` cascades to all utility classes. Dashboard uses a horizontal character banner, editorial stat table side-by-side with radar, and row-based task list — no `bg-white border rounded-xl shadow-sm` card patterns.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@theme` block), `motion/react` (framer-motion v12), `lucide-react`, `clsx`

**Note for other agents:** This plan modifies `globals.css` first. Plans 2 and 3 can run in parallel assuming these token names are available: `text-accent`, `bg-accent`, `border-accent`, `bg-accent-muted`, `bg-sidebar`, `bg-canvas`, `text-muted`, `text-faint`, `border-border`, `border-border-faint`.

---

### Task 1: Update Design Tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

**Context:** Tailwind v4 uses `@theme {}` to define CSS vars that automatically generate utility classes. `--color-accent` → `bg-accent`, `text-accent`, `border-accent`. `--color-sidebar` → `bg-sidebar`. Etc.

**Step 1: Replace the full `@theme {}` block**

Open `src/app/globals.css`. Replace the entire `@theme { ... }` block with:

```css
@theme {
  --color-background: #ffffff;
  --color-foreground: #0F172A;

  --font-sans: var(--font-sans);

  /* Accent (renamed from primary) */
  --color-accent: #0056D2;
  --color-accent-muted: #EEF4FF;
  --color-accent-ring: rgba(0, 86, 210, 0.15);

  /* Layout surfaces */
  --color-sidebar: #0F172A;
  --color-canvas: #FFFFFF;
  --color-base: #F8FAFC;

  /* Borders */
  --color-border: #E2E8F0;
  --color-border-faint: #F1F5F9;

  /* Text scale */
  --color-text: #0F172A;
  --color-muted: #64748B;
  --color-faint: #94A3B8;

  --transition-soft: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
}
```

**Step 2: Update the `.btn-primary`, `.btn-secondary`, `.input` component classes**

Replace the `@layer components { ... }` block with:

```css
@layer components {
  .btn-primary {
    @apply w-full bg-accent text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:brightness-110 active:scale-[0.98];
  }

  .btn-secondary {
    @apply w-full bg-white text-text border border-border font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98];
  }

  .input {
    @apply w-full bg-white border border-border rounded-lg p-3 text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all duration-200;
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors (token renaming doesn't affect TS — these are CSS classes only).

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "design: rename primary→accent, add sidebar/canvas/muted tokens"
```

---

### Task 2: Create AppSidebar Component

**Files:**
- Create: `src/components/AppSidebar.tsx`

**Context:** This replaces `AppHeader`. It's a fixed 48px-wide dark column on the left. Uses `usePathname()` (must be "use client"). The active nav item gets a white/10 background and a 2px `bg-accent` left indicator bar. User initials avatar at the bottom doubles as a sign-out trigger on hover.

**Step 1: Create the file**

Create `src/components/AppSidebar.tsx` with the following content:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, ListTodo, Radio } from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks",     icon: ListTodo,        label: "Tasks"     },
  { href: "/radar",     icon: Radio,           label: "Radar"     },
];

interface AppSidebarProps {
  userEmail?: string;
}

export default function AppSidebar({ userEmail = "" }: AppSidebarProps) {
  const pathname = usePathname();
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "··";

  return (
    <div className="fixed left-0 top-0 h-screen w-12 bg-sidebar flex flex-col items-center py-4 z-50">
      {/* Logo mark */}
      <div className="w-8 h-8 flex items-center justify-center mb-6 shrink-0">
        <div className="w-3.5 h-3.5 bg-white rotate-45" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg group"
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.15 }}>
                <Icon
                  className={clsx(
                    "w-5 h-5 transition-colors duration-150",
                    active
                      ? "text-white"
                      : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User avatar / sign-out */}
      <form action="/auth/sign-out" method="post" className="shrink-0">
        <button
          title={`Sign out (${userEmail})`}
          className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center hover:bg-red-900/60 hover:text-red-300 transition-colors"
        >
          {initials}
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add src/components/AppSidebar.tsx
git commit -m "feat: add AppSidebar component — fixed dark icon rail with motion active states"
```

---

### Task 3: Redesign CharacterDisplay — Horizontal Banner

**Files:**
- Modify: `src/components/dashboard/CharacterDisplay.tsx`

**Context:** Current design is a `bg-white border rounded-2xl p-6 shadow-sm` card. Replace it with a flat horizontal strip that uses `border-b border-border pb-6` as its only separator. Avatar becomes 48px (was 80px). XP bar moves to the right side of the strip. No card wrapper.

**Step 1: Replace the component**

Rewrite `src/components/dashboard/CharacterDisplay.tsx`:

```tsx
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

function getImageSrc(characterType: CharacterType, characterStage: CharacterStage): string {
  if (characterType === 'egg' || characterStage === 'egg') return '/characters/egg.png';
  return `/characters/${characterType}/${characterStage}.png`;
}

export default function CharacterDisplay({
  characterType, characterStage, level, xpProgress,
}: CharacterDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = getImageSrc(characterType, characterStage);
  const nextEvolution = getNextEvolutionLevel(level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-5 pb-6 border-b border-border"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {!imgError ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
            <Image
              src={imageSrc}
              alt={`${TYPE_LABELS[characterType]} ${STAGE_LABELS[characterStage]}`}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-border flex items-center justify-center">
            <span className="text-[9px] font-black text-faint uppercase tracking-wider text-center leading-tight px-1">
              {characterType === 'egg' ? '?' : TYPE_LABELS[characterType].slice(0, 3)}
            </span>
          </div>
        )}
      </div>

      {/* Name + level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-black text-faint uppercase tracking-widest">
            {characterType === 'egg' ? 'Unhatched' : TYPE_LABELS[characterType]}
          </span>
          <span className="text-[10px] text-faint">·</span>
          <span className="text-[10px] text-faint uppercase tracking-wider">
            {STAGE_LABELS[characterStage]}
          </span>
        </div>
        <div className="text-3xl font-black text-text leading-none mt-0.5">
          Level {level}
        </div>
      </div>

      {/* XP bar */}
      <div className="shrink-0 w-44">
        <div className="flex justify-between text-[10px] font-bold text-faint uppercase tracking-wider mb-1.5">
          <span>XP Progress</span>
          <span>{xpProgress}%</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="h-full bg-accent rounded-full"
          />
        </div>
        <p className="text-[9px] text-faint mt-1.5">
          {nextEvolution !== null ? `Evolves at Lv. ${nextEvolution}` : 'Max Evolution'}
        </p>
      </div>
    </motion.div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add src/components/dashboard/CharacterDisplay.tsx
git commit -m "design: CharacterDisplay → flat horizontal banner, no card wrapper"
```

---

### Task 4: Redesign StatGrid — Editorial Table + Side-by-Side Radar

**Files:**
- Modify: `src/components/dashboard/StatGrid.tsx`

**Context:** Current layout has a level/XP header, a centered radar chart, then a 6-card grid. Replace with: two-column flex — left column is a staggered editorial stat table (dot + name + animated bar + XP + level), right column is the radar chart at ~200px. Remove the separate level/XP header — that info is now in CharacterDisplay.

**Step 1: Replace the component**

Rewrite `src/components/dashboard/StatGrid.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { clsx } from "clsx";

interface StatGridProps {
  stats: {
    strength: number;
    intellect: number;
    discipline: number;
    charisma: number;
    creativity: number;
    spirituality: number;
  };
  level: number;
  xpProgress: number;
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 68;
const RINGS = 4;
const ACCENT = "#0056d2";

const AXES = [
  { label: "STR", color: "#ef4444" },
  { label: "INT", color: "#3b82f6" },
  { label: "DIS", color: "#f59e0b" },
  { label: "CHA", color: "#a855f7" },
  { label: "CRE", color: "#10b981" },
  { label: "SPI", color: "#6366f1" },
];

function vertex(cx: number, cy: number, r: number, index: number): [number, number] {
  const angle = ((index * 60 - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function pointsString(values: number[], cx: number, cy: number, maxR: number): string {
  return values
    .map((v, i) => {
      const [x, y] = vertex(cx, cy, v * maxR, i);
      return `${x},${y}`;
    })
    .join(" ");
}

function RadarChart({ values }: { values: number[] }) {
  const finalPoints = pointsString(values, CX, CY, R);
  const zeroPoints = pointsString(Array(6).fill(0), CX, CY, R);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="Character stats radar chart"
      className="overflow-visible"
    >
      {Array.from({ length: RINGS }).map((_, ringIdx) => {
        const ringR = (R / RINGS) * (ringIdx + 1);
        const ringPoints = pointsString(Array(6).fill(1), CX, CY, ringR);
        return (
          <polygon key={ringIdx} points={ringPoints} fill="none" stroke="#f1f5f9" strokeWidth="1" />
        );
      })}
      {AXES.map((_, i) => {
        const [x, y] = vertex(CX, CY, R, i);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#f1f5f9" strokeWidth="1" />;
      })}
      <motion.polygon
        initial={{ points: zeroPoints }}
        animate={{ points: finalPoints }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        fill={ACCENT}
        fillOpacity={0.12}
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {AXES.map((axis, i) => {
        const [fx, fy] = vertex(CX, CY, values[i] * R, i);
        const [zx, zy] = vertex(CX, CY, 0, i);
        return (
          <motion.circle
            key={i}
            initial={{ cx: zx, cy: zy }}
            animate={{ cx: fx, cy: fy }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            r={2.5}
            fill={axis.color}
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}
      {AXES.map((axis, i) => {
        const [lx, ly] = vertex(CX, CY, R + 18, i);
        const angle = -90 + i * 60;
        const textAnchor =
          angle === -90 || angle === 90 ? "middle" : angle < 0 || angle > 90 ? "end" : "start";
        const dy = angle === -90 ? -4 : angle === 90 ? 12 : 4;
        return (
          <text
            key={i}
            x={lx}
            y={ly + dy}
            textAnchor={textAnchor}
            fontSize="8"
            fontWeight="700"
            fontFamily="inherit"
            letterSpacing="0.08em"
            fill={axis.color}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Stat Table ───────────────────────────────────────────────────────────────

const STAT_META = [
  { key: "strength"     as const, label: "Strength",     dotClass: "bg-red-400",     barClass: "bg-red-400"     },
  { key: "intellect"    as const, label: "Intellect",    dotClass: "bg-blue-400",    barClass: "bg-blue-400"    },
  { key: "discipline"   as const, label: "Discipline",   dotClass: "bg-amber-400",   barClass: "bg-amber-400"   },
  { key: "charisma"     as const, label: "Charisma",     dotClass: "bg-purple-400",  barClass: "bg-purple-400"  },
  { key: "creativity"   as const, label: "Creativity",   dotClass: "bg-emerald-400", barClass: "bg-emerald-400" },
  { key: "spirituality" as const, label: "Spirituality", dotClass: "bg-indigo-400",  barClass: "bg-indigo-400"  },
];

export default function StatGrid({ stats }: StatGridProps) {
  const normalizedValues = STAT_META.map(s => Math.min(stats[s.key], 100) / 100);

  return (
    <div className="flex gap-6 items-start">
      {/* Editorial stat table */}
      <div className="flex-1 min-w-0">
        {STAT_META.map((meta, i) => {
          const value = stats[meta.key];
          const level = Math.floor(value / 10) + 1;
          return (
            <motion.div
              key={meta.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
              className="flex items-center gap-3 py-2.5 border-b border-border-faint"
            >
              <span className={clsx("w-2 h-2 rounded-full shrink-0", meta.dotClass)} />
              <span className="text-xs font-semibold text-muted w-20 shrink-0">{meta.label}</span>
              <div className="flex-1 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(value, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.04 + 0.1 }}
                  className={clsx("h-full rounded-full", meta.barClass)}
                />
              </div>
              <span className="text-sm font-black text-text w-8 text-right shrink-0">{value}</span>
              <span className="text-xs font-medium text-faint w-10 text-right shrink-0">Lv.{level}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div className="shrink-0 pt-1">
        <RadarChart values={normalizedValues} />
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors. Note: `level` and `xpProgress` props are still accepted (to avoid breaking callers) but no longer rendered here (that's now CharacterDisplay's job).

**Step 3: Commit**

```bash
git add src/components/dashboard/StatGrid.tsx
git commit -m "design: StatGrid → editorial stat table side-by-side with radar, no card grid"
```

---

### Task 5: Redesign DashboardCommand — Inline Borderless Input

**Files:**
- Modify: `src/components/dashboard/DashboardCommand.tsx`

**Context:** Current design has `shadow-xl`, `rounded-2xl`, `ring-4` on focus, and a large `py-5` padded input — very "AI app" looking. Replace with a flat, inline input separated from content only by `border-b`. The submit button becomes a simple accent-colored icon, not a pill. Remove the shortcut hints row beneath.

**Step 1: Replace the component**

Rewrite `src/components/dashboard/DashboardCommand.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, ArrowRight, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface DashboardCommandProps {
  onTaskCreated?: (content: string) => void;
}

export default function DashboardCommand({ onTaskCreated }: DashboardCommandProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    onTaskCreated?.(inputValue);
    setInputValue("");
    setIsProcessing(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        "flex items-center gap-3 border-b py-3 transition-colors duration-200",
        isFocused ? "border-accent" : "border-border"
      )}
    >
      <Terminal
        className={clsx(
          "w-4 h-4 shrink-0 transition-colors duration-200",
          isFocused ? "text-accent" : "text-faint"
        )}
      />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Add a command…"
        className="flex-1 text-sm font-medium text-text placeholder:text-faint outline-none bg-transparent"
      />
      <div className="flex items-center gap-2 shrink-0">
        <AnimatePresence>
          {inputValue && !isProcessing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={() => setInputValue("")}
              className="p-1 text-faint hover:text-muted rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="submit"
          disabled={!inputValue.trim() || isProcessing}
          className={clsx(
            "p-1.5 rounded-lg transition-all",
            inputValue.trim() && !isProcessing
              ? "bg-accent text-white hover:brightness-110 active:scale-95"
              : "text-faint cursor-not-allowed"
          )}
        >
          {isProcessing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ArrowRight className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/dashboard/DashboardCommand.tsx
git commit -m "design: DashboardCommand → flat borderless inline input"
```

---

### Task 6: Redesign TaskStack — Row-Based, No Cards

**Files:**
- Modify: `src/components/dashboard/TaskStack.tsx`

**Context:** Current design wraps each task in `bg-white border rounded-xl p-4 hover:shadow-md` — the card anti-pattern. Replace with flat rows separated by `border-b border-border-faint`. Each row: circle toggle + task content + priority dot + stat badges. Remove `MoreHorizontal` and `ChevronRight` action buttons — dashboard is read-only.

**Step 1: Replace the component**

Rewrite `src/components/dashboard/TaskStack.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { clsx } from "clsx";

interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

interface TaskStackProps {
  tasks: Task[];
  onToggleStatus: (id: string) => void;
}

const STAT_LABELS: { key: keyof Task; color: string }[] = [
  { key: "str_weight", color: "bg-red-400"     },
  { key: "int_weight", color: "bg-blue-400"    },
  { key: "dis_weight", color: "bg-amber-400"   },
  { key: "cha_weight", color: "bg-purple-400"  },
  { key: "cre_weight", color: "bg-emerald-400" },
  { key: "spi_weight", color: "bg-indigo-400"  },
];

function ActiveStatDots({ task }: { task: Task }) {
  const dots = STAT_LABELS.filter(s => (task[s.key] as number ?? 0) > 0);
  if (dots.length === 0) return null;
  return (
    <div className="flex items-center gap-1 ml-1">
      {dots.map(({ key, color }) => (
        <span key={key} className={clsx("w-1.5 h-1.5 rounded-full opacity-70", color)} />
      ))}
    </div>
  );
}

export default function TaskStack({ tasks, onToggleStatus }: TaskStackProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-faint py-4">No active commands.</p>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence initial={false}>
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            className="flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group"
          >
            {/* Toggle */}
            <button
              onClick={() => onToggleStatus(task.id)}
              className={clsx(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                task.status === "completed"
                  ? "bg-accent border-accent"
                  : "border-slate-300 group-hover:border-slate-400"
              )}
            >
              {task.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
            </button>

            {/* Content */}
            <span
              className={clsx(
                "flex-1 text-sm font-medium truncate",
                task.status === "completed" ? "line-through text-faint" : "text-text"
              )}
            >
              {task.content}
            </span>

            {/* Right meta */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  task.priority === "high" ? "bg-red-400" :
                  task.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
                )}
              />
              <ActiveStatDots task={task} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/dashboard/TaskStack.tsx
git commit -m "design: TaskStack → flat rows, no card wrappers, minimal meta"
```

---

### Task 7: Update Dashboard Page Layout + Switch to AppSidebar

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`
- Modify: `src/app/tasks/page.tsx`
- Modify: `src/app/radar/page.tsx`

**Context:** Dashboard page needs `ml-12` for the sidebar offset, and needs to use `AppSidebar` instead of `AppHeader`. The two link buttons at the bottom ("View All Tasks", "View Full Radar") need `text-accent border-accent`. Auth pages and other pages that use `AppHeader` also need updating. Radar and tasks pages are handled by agents 2 and 3 — leave them for those agents. But we need to ensure dashboard page compiles.

**Step 1: Update dashboard/page.tsx**

Open `src/app/dashboard/page.tsx`. Make these changes:

1. Replace the import:
   ```tsx
   // Remove:
   import AppHeader from "@/components/AppHeader";
   // Add:
   import AppSidebar from "@/components/AppSidebar";
   ```

2. Replace the loading state JSX:
   ```tsx
   // Replace:
   return (
     <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center">
       <div className="animate-pulse text-slate-400 font-medium">Loading...</div>
     </div>
   );
   // With:
   return (
     <div className="min-h-screen bg-canvas ml-12 flex items-center justify-center">
       <div className="animate-pulse text-faint text-sm font-medium">Loading...</div>
     </div>
   );
   ```

3. Replace the main return:
   ```tsx
   // Replace:
   return (
     <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
       <AppHeader userEmail={userEmail} currentPath="/dashboard" />
       <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
   // With:
   return (
     <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted">
       <AppSidebar userEmail={userEmail} />
       <main className="ml-12 max-w-4xl mx-auto px-8 py-10 space-y-8">
   ```

4. Remove the bottom link section's inline color classes — replace:
   ```tsx
   // Replace:
   <section className="flex items-center justify-center space-x-4 pt-4">
     <Link
       href="/tasks"
       className="px-4 py-2 text-sm font-medium text-[#0056D2] bg-white border border-[#0056D2] rounded-lg hover:bg-[#0056D2] hover:text-white transition-colors"
     >
       View All Tasks
     </Link>
     <Link
       href="/radar"
       className="px-4 py-2 text-sm font-medium text-[#0056D2] bg-white border border-[#0056D2] rounded-lg hover:bg-[#0056D2] hover:text-white transition-colors"
     >
       View Full Radar
     </Link>
   </section>
   // With:
   <section className="flex items-center justify-center space-x-4 pt-4">
     <Link
       href="/tasks"
       className="px-4 py-2 text-sm font-medium text-accent bg-white border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
     >
       View All Tasks
     </Link>
     <Link
       href="/radar"
       className="px-4 py-2 text-sm font-medium text-accent bg-white border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
     >
       View Full Radar
     </Link>
   </section>
   ```

**Step 2: Update sign-in and sign-up pages**

Open `src/app/(auth)/sign-in/page.tsx`. Find and replace any `text-primary`, `bg-primary`, `border-primary`, `focus:border-primary`, `ring-primary` → `text-accent`, `bg-accent`, `border-accent`, `focus:border-accent`, `ring-accent`.

Open `src/app/(auth)/sign-up/page.tsx`. Same replacement.

**Step 3: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

**Step 4: Verify no `AppHeader` references remain in dashboard**

```bash
grep -r "AppHeader" /home/itsaibarr/projects/character-development/src/app/dashboard/
```

Expected: no output.

**Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/(auth)/sign-in/page.tsx src/app/(auth)/sign-up/page.tsx
git commit -m "design: dashboard uses AppSidebar, ml-12 offset, accent token in link buttons"
```
