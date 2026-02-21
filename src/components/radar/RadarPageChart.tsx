"use client";

import { motion } from "motion/react";

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 110;
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
        <polygon key={i} points={pointsString(Array(6).fill(1), CX, CY, (R / RINGS) * (i + 1))} fill="none" stroke="#F1F5F9" strokeWidth="1" />
      ))}
      {AXES.map((_, i) => { const [x, y] = vertex(CX, CY, R, i); return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#F1F5F9" strokeWidth="1" />; })}
      <motion.polygon initial={{ points: zeroPoints }} animate={{ points: finalPoints }} transition={{ duration: 1.0, ease: "easeOut", delay: 0.3 }} fill={PRIMARY} fillOpacity={0.15} stroke={PRIMARY} strokeWidth="2" strokeLinejoin="round" />
      {AXES.map((axis, i) => {
        const [fx, fy] = vertex(CX, CY, values[i] * R, i);
        const [zx, zy] = vertex(CX, CY, 0, i);
        return <motion.circle key={i} initial={{ cx: zx, cy: zy }} animate={{ cx: fx, cy: fy }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }} r={3.5} fill={axis.color} stroke="white" strokeWidth="1.5" />;
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
