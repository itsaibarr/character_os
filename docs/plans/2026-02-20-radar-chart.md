# Radar Chart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pure-SVG animated hexagon radar chart to StatGrid visualizing all 6 character stats.

**Architecture:** Self-contained SVG component inside StatGrid.tsx. Pure math (sin/cos for hexagon vertices), Framer Motion for entry animation. No new dependencies.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion (motion/react)

---

## Axis layout reference

The 6 axes are evenly spaced at 60° intervals, starting from the top (–90°), going clockwise:

| Index | Stat | Label | Color | Angle (deg) |
|---|---|---|---|---|
| 0 | Strength | STR | text-red-500 | –90 (top) |
| 1 | Intellect | INT | text-blue-500 | –30 |
| 2 | Discipline | DIS | text-amber-500 | 30 |
| 3 | Charisma | CHA | text-purple-500 | 90 (bottom) |
| 4 | Creativity | CRE | text-emerald-500 | 150 |
| 5 | Spirituality | SPI | text-indigo-500 | 210 (= –150) |

Vertex formula (center cx, cy, radius r, angle θ in radians):
```
x = cx + r * cos(θ)
y = cy + r * sin(θ)
```

---

## Task 1: Add `RadarChart` component inside `StatGrid.tsx`

**Files:**
- Modify: `src/components/dashboard/StatGrid.tsx`

**Context:** The file is already `"use client"` and already imports `motion` from `"motion/react"`. The `statList` array defines the 6 stats in the exact order needed. No new imports required.

**Step 1: Replace the full file**

```typescript
"use client";

import { motion } from "motion/react";
import { Dumbbell, Brain, Focus, MessageCircle, PenTool, Sparkles } from "lucide-react";
import { clsx } from "clsx";

interface Stat {
  name: string;
  value: number;
  icon: any;
  color: string;
  label: string;
}

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

// ─── Radar Chart ─────────────────────────────────────────────────────────────

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 80;
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

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function vertex(cx: number, cy: number, r: number, index: number): [number, number] {
  const angle = toRadians(-90 + index * 60);
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
      {/* Background rings */}
      {Array.from({ length: RINGS }).map((_, ringIdx) => {
        const ringR = (R / RINGS) * (ringIdx + 1);
        const ringPoints = pointsString(Array(6).fill(1), CX, CY, ringR);
        return (
          <polygon
            key={ringIdx}
            points={ringPoints}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const [x, y] = vertex(CX, CY, R, i);
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
        );
      })}

      {/* Animated data polygon */}
      <motion.polygon
        initial={{ points: zeroPoints }}
        animate={{ points: finalPoints }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        fill={PRIMARY}
        fillOpacity={0.15}
        stroke={PRIMARY}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {AXES.map((axis, i) => {
        const [fx, fy] = vertex(CX, CY, values[i] * R, i);
        const [zx, zy] = vertex(CX, CY, 0, i);
        return (
          <motion.circle
            key={i}
            initial={{ cx: zx, cy: zy }}
            animate={{ cx: fx, cy: fy }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            r={3}
            fill={axis.color}
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Axis labels */}
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
            fontSize="9"
            fontWeight="700"
            fontFamily="inherit"
            letterSpacing="0.1em"
            fill={axis.color}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── StatGrid ─────────────────────────────────────────────────────────────────

export default function StatGrid({ stats, level, xpProgress }: StatGridProps) {
  const statList: Stat[] = [
    { name: "Strength",    value: stats.strength,    icon: Dumbbell,      color: "text-red-500",     label: "STR" },
    { name: "Intellect",   value: stats.intellect,   icon: Brain,         color: "text-blue-500",    label: "INT" },
    { name: "Discipline",  value: stats.discipline,  icon: Focus,         color: "text-amber-500",   label: "DIS" },
    { name: "Charisma",    value: stats.charisma,    icon: MessageCircle, color: "text-purple-500",  label: "CHA" },
    { name: "Creativity",  value: stats.creativity,  icon: PenTool,       color: "text-emerald-500", label: "CRE" },
    { name: "Spirituality",value: stats.spirituality,icon: Sparkles,      color: "text-indigo-500",  label: "SPI" },
  ];

  const normalizedValues = statList.map((s) => Math.min(s.value, 100) / 100);

  return (
    <div className="w-full space-y-6">
      {/* Level & XP Overview */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Character Level</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-5xl font-black text-slate-900 leading-none">{level}</span>
            <span className="text-lg font-bold text-slate-400">Initiate</span>
          </div>
        </div>
        <div className="flex-1 max-w-[200px] mb-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
            <span>XP Progress</span>
            <span>{xpProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center py-2">
        <RadarChart values={normalizedValues} />
      </div>

      {/* Mini Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statList.map((stat) => (
          <motion.div
            key={stat.name}
            whileHover={{ y: -2 }}
            className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={clsx("p-1.5 rounded-lg bg-slate-50", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-400">Lv.{Math.floor(stat.value / 10) + 1}</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.name}</div>
              <div className="text-lg font-black text-slate-900">{stat.value}</div>
            </div>
            <div className="mt-2 h-1 bg-slate-50 rounded-full overflow-hidden">
              <div
                className={clsx("h-full rounded-full opacity-30", stat.color.replace("text-", "bg-"))}
                style={{ width: `${(stat.value % 10) * 10}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` and verify:

1. Hexagon radar chart renders above the stat card grid
2. Filled polygon animates in from center outward on page load
3. Axis labels (STR/INT/DIS/CHA/CRE/SPI) appear at vertices in their colors
4. Chart stays centered at all breakpoints
5. Existing level header, XP bar, and stat cards are unchanged

**Step 3: Commit**

```bash
git add src/components/dashboard/StatGrid.tsx
git commit -m "feat: add pure-SVG animated hexagon radar chart to StatGrid"
```

---

## Task 2: Edge-case polish (conditional)

**Files:**
- Modify: `src/components/dashboard/StatGrid.tsx` (only if issues found in Task 1)

**Step 1: If labels clip or overlap**

Increase `labelR` from `R + 18` to `R + 22` inside `RadarChart`. If the CHA (bottom) label touches the SVG edge, increase `SIZE` from `220` to `240` and update the `viewBox` string to match, keeping `CX = SIZE / 2` and `CY = SIZE / 2`.

**Step 2: Zero-XP state is already correct**

All-zero values produce a degenerate polygon collapsed to the center — visually a single dot. No special handling needed.

**Step 3: Values above 100 XP**

The `Math.min(value, 100) / 100` cap means any stat above 100 renders at the outer ring. Polygon never overflows the background grid.

**Step 4: Commit only if changes were made**

```bash
git add src/components/dashboard/StatGrid.tsx
git commit -m "fix: adjust radar chart label offsets"
```

---

## Done

Single file changed: `src/components/dashboard/StatGrid.tsx`. The `RadarChart` SVG component (~80 lines) lives alongside the existing grid. No new packages, no new files, no prop changes needed on the parent.
