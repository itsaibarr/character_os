"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Flame,
  LayoutGrid,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import type { AnalyticsInsights, AttributeDrift, StreakStatus } from "@/lib/gamification/types";
import { STAT_LABELS } from "@/lib/gamification/types";

interface InsightsPanelProps {
  insights: AnalyticsInsights | null;
  streakStatus: StreakStatus | null;
}

const STORAGE_KEY = "insights-panel-collapsed";

export default function InsightsPanel({
  insights,
  streakStatus,
}: InsightsPanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "false";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const warningCount = getWarningCount(insights, streakStatus);

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-faint">
            Insights
          </span>
          {collapsed && warningCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/20">
              {warningCount}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted" />
        )}
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="insights-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border/60">
              {!insights ? (
                <InsightRow icon={null} color="text-faint" label="Loading insights..." />
              ) : (
                <InsightRows insights={insights} streakStatus={streakStatus} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsightRows({
  insights,
  streakStatus,
}: {
  insights: AnalyticsInsights;
  streakStatus: StreakStatus | null;
}) {
  const rows: React.ReactNode[] = [];

  // 1. Attribute drift (max 2 rows)
  const topDrifts = insights.attributeDrift.slice(0, 2);
  for (const drift of topDrifts) {
    rows.push(
      <DriftRow key={`drift-${drift.attribute}`} drift={drift} />,
    );
  }

  // 2. Streak row
  if (streakStatus !== null) {
    rows.push(
      <InsightRow
        key="streak"
        icon={<Flame className="w-3.5 h-3.5" />}
        color={
          streakStatus.currentStreak > 0
            ? "text-emerald-600"
            : "text-slate-400"
        }
        label={
          streakStatus.currentStreak > 0
            ? `${streakStatus.currentStreak}-day streak active${
                streakStatus.shieldsAvailable > 0
                  ? " · " + streakStatus.shieldsAvailable + " shield" + (streakStatus.shieldsAvailable !== 1 ? "s" : "")
                  : ""
              }`
            : "No active streak"
        }
      />,
    );
  }

  // 3. Category distribution (top 2)
  if (insights.categoryDistribution.length > 0) {
    const top = insights.categoryDistribution.slice(0, 2);
    const label = top.map((c) => `${c.category} ${c.pct}%`).join(" · ");
    rows.push(
      <InsightRow
        key="category"
        icon={<LayoutGrid className="w-3.5 h-3.5" />}
        color="text-faint"
        label={label}
      />,
    );
  }

  // 4. Burnout warning (only if score > 0.75)
  if (insights.burnoutScore > 0.75) {
    rows.push(
      <InsightRow
        key="burnout"
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        color="text-red-500"
        label={`Task load ${insights.burnoutMultiplier}x normal — consider a rest day`}
      />,
    );
  }

  if (rows.length === 0) {
    rows.push(
      <InsightRow
        key="empty"
        icon={null}
        color="text-faint"
        label="No insights yet — complete tasks to see patterns"
      />,
    );
  }

  // Max 5 rows total
  const visibleRows = rows.slice(0, 5);

  return (
    <>
      {visibleRows}
      <div className="px-4 py-2">
        <a
          href="/analytics"
          className="text-[11px] text-muted hover:text-accent transition-colors font-medium"
        >
          View full analytics →
        </a>
      </div>
    </>
  );
}

function DriftRow({ drift }: { drift: AttributeDrift }) {
  const isRising = drift.direction === "rising";
  return (
    <InsightRow
      icon={
        isRising ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )
      }
      color="text-accent"
      label={`${STAT_LABELS[drift.attribute]} ${isRising ? "rising" : "lagging"} (${isRising ? "+" : "-"}${drift.deltaPct}%)`}
    />
  );
}

function InsightRow({
  icon,
  color,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2">
      {icon ? (
        <span className={clsx("shrink-0", color)}>{icon}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className={clsx("text-[12px] font-medium", color)}>{label}</span>
    </div>
  );
}

function getWarningCount(
  insights: AnalyticsInsights | null,
  streakStatus: StreakStatus | null,
): number {
  if (!insights) return 0;
  let count = 0;
  count += Math.min(insights.attributeDrift.length, 2);
  if (insights.burnoutScore > 0.75) count += 1;
  if (streakStatus && streakStatus.currentStreak === 0) count += 1;
  return count;
}
