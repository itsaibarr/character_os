"use client";

import { memo, useMemo } from "react";

import { clsx } from "clsx";
import { Activity } from "lucide-react";
import type { HeatmapDataPoint } from "@/lib/gamification/types";

export type { HeatmapDataPoint };

interface AnalyticsHeatmapProps {
  data: HeatmapDataPoint[];
  days?: number;
}

// Note: dates are generated in UTC. For users in negative UTC offsets,
// today's local date may differ from the UTC date after midnight UTC.
// This is an acceptable edge case for the current phase.
function generateDateRange(days: number) {
  const dates = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function AnalyticsHeatmap({ data, days = 90 }: AnalyticsHeatmapProps) {
  const dates = useMemo(() => generateDateRange(days), [days]);
  const dataMap = useMemo(() => new Map(data.map(d => [d.date, d.count])), [data]);
  
  // Find max for scaling, default to at least 5 for division
  const maxCount = useMemo(() => Math.max(5, ...data.map(d => d.count)), [data]);

  // Accent-tinted scale (derived from --color-accent: #0056D2)
  const getColorLevel = (count: number) => {
    if (count === 0) return "bg-blue-50 border-transparent";
    
    const ratio = count / maxCount;
    if (ratio > 0.8) return "bg-blue-800 border-blue-900";
    if (ratio > 0.5) return "bg-blue-600 border-blue-700";
    if (ratio > 0.2) return "bg-blue-400 border-blue-500";
    return "bg-blue-200 border-blue-300";
  };

  return (
    <div className="w-full border border-border bg-white p-4 rounded-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black text-faint uppercase tracking-widest flex items-center gap-1.5">
          <Activity size={12} />
          Consistency Heatmap
        </h3>
        <span className="text-[10px] text-faint">Last {days} Days</span>
      </div>

      <div className="flex flex-wrap gap-[3px]">
        {dates.map((date) => {
          const count = dataMap.get(date) || 0;
          return (
            <div
              key={date}
              title={`${date}: ${count} tasks`}
              className={clsx(
                "w-3 h-3 rounded-[2px] border transition-colors hover:border-slate-900 cursor-crosshair",
                getColorLevel(count)
              )}
            />
          );
        })}
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-faint uppercase tracking-wider">
        <span>Less</span>
        <div className="flex gap-[3px]">
          <div className="w-2.5 h-2.5 rounded-[1px] bg-blue-50" />
          <div className="w-2.5 h-2.5 rounded-[1px] bg-blue-200" />
          <div className="w-2.5 h-2.5 rounded-[1px] bg-blue-400" />
          <div className="w-2.5 h-2.5 rounded-[1px] bg-blue-600" />
          <div className="w-2.5 h-2.5 rounded-[1px] bg-blue-800" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default memo(AnalyticsHeatmap);
