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
