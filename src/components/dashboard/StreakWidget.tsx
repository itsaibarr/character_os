"use client";

import { Flame, Shield } from "lucide-react";
import { clsx } from "clsx";
import type { StreakStatus } from "@/lib/gamification/types";

interface StreakWidgetProps {
  status: StreakStatus | null;
}

export default function StreakWidget({ status }: StreakWidgetProps) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white animate-pulse">
        <div className="w-4 h-4 bg-slate-200 rounded" />
        <div className="w-16 h-3 bg-slate-200 rounded" />
      </div>
    );
  }

  const { currentStreak, shieldsAvailable, nextMilestone, daysUntilMilestone } = status;
  const isActive = currentStreak > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-white">
      {/* Streak count */}
      <div className="flex items-center gap-2">
        <Flame
          className={clsx(
            "w-4 h-4",
            isActive ? "text-accent" : "text-slate-300",
          )}
        />
        <span
          className={clsx(
            "text-[15px] font-black tabular-nums",
            isActive ? "text-accent" : "text-slate-400",
          )}
        >
          {currentStreak}
        </span>
        <span className="text-[11px] text-muted font-medium">
          day streak
        </span>
      </div>

      {/* Shields + milestone */}
      <div className="flex items-center gap-2">
        {shieldsAvailable > 0 ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(shieldsAvailable, 5) }).map(
              (_, i) => (
                <Shield
                  key={i}
                  className="w-3.5 h-3.5 text-accent fill-accent-muted"
                />
              ),
            )}
            {shieldsAvailable > 5 && (
              <span className="text-[10px] text-muted">+{shieldsAvailable - 5}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] text-slate-400">No shields</span>
          </div>
        )}

        {nextMilestone && daysUntilMilestone !== null && (
          <>
            <span className="text-[10px] text-slate-200">·</span>
            <span className="text-[10px] text-faint">
              {nextMilestone}d in{" "}
              <span className="font-semibold text-accent">
                {daysUntilMilestone}
              </span>{" "}
              {daysUntilMilestone === 1 ? "day" : "days"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
