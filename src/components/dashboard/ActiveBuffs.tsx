"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Zap, Shield, ArrowUpCircle, Sparkles } from "lucide-react";
import type { ActiveBuff } from "@/lib/gamification/types";

interface ActiveBuffsProps {
  buffs: ActiveBuff[];
}

const EFFECT_ICONS: Record<string, typeof Zap> = {
  xp_boost: ArrowUpCircle,
  temp_buff: Zap,
  streak_shield: Shield,
  evolution_catalyst: Sparkles,
};

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ActiveBuffs({ buffs }: ActiveBuffsProps) {
  const [, setTick] = useState(0);

  // Re-render every 60s to update countdowns
  useEffect(() => {
    if (buffs.length === 0) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60_000);

    return () => clearInterval(interval);
  }, [buffs.length]);

  const activeBuffs = buffs.filter(
    (b) => new Date(b.expiresAt).getTime() > Date.now()
  );

  if (activeBuffs.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="text-[10px] font-black text-faint uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Zap size={10} />
        Active Buffs
      </h2>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {activeBuffs.map((buff) => {
          const Icon = EFFECT_ICONS[buff.effectType] ?? Zap;
          const timeLeft = formatTimeRemaining(buff.expiresAt);
          const isExpiring = timeLeft.endsWith("m") && !timeLeft.includes("h");

          return (
            <div
              key={buff.id}
              className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-sm border shrink-0 transition-colors",
                isExpiring
                  ? "border-accent/40 bg-accent-muted"
                  : "border-border bg-white"
              )}
            >
              <Icon
                size={10}
                className={clsx(
                  "text-accent"
                )}
              />
              <span
                className={clsx(
                  "text-[10px] font-bold whitespace-nowrap",
                  "text-text"
                )}
              >
                {buff.name}
              </span>
              <span
                className={clsx(
                  "text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                  isExpiring ? "text-accent" : "text-faint"
                )}
              >
                {timeLeft}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
