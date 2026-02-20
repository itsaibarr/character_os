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

const SIZE = 240;
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
        const [lx, ly] = vertex(CX, CY, R + 22, i);
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
