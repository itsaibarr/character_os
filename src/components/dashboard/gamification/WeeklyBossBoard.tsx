"use client";

import { motion } from "motion/react";
import { clsx } from "clsx";
import { Check, Flame, Skull, Target } from "lucide-react";
import type { Boss, BossAttack } from "@/lib/gamification/types";

export type { Boss, BossAttack };

interface WeeklyBossBoardProps {
  boss?: Boss;
  attacks: BossAttack[];
  onAttackToggle?: (attackId: string, completed: boolean) => void;
  onGenerateBoss?: () => void;
  generatingBoss?: boolean;
}

export default function WeeklyBossBoard({
  boss,
  attacks,
  onAttackToggle,
  onGenerateBoss,
  generatingBoss = false,
}: WeeklyBossBoardProps) {
  const hpPercent = boss ? Math.max(0, Math.min(100, (boss.hpCurrent / boss.hpTotal) * 100)) : 0;
  const isDefeated = boss ? boss.hpCurrent <= 0 : false;

  // Empty state — no active boss
  if (!boss) {
    return (
      <div className="w-full border border-border bg-white p-4 rounded-sm">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[10px] font-black text-faint uppercase tracking-widest leading-none flex items-center gap-1.5">
            <Skull size={12} className="text-accent" />
            Weekly Boss
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-4 gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-border flex items-center justify-center">
            <Skull size={14} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-text mb-1">No Active Boss</p>
            <p className="text-[11px] text-muted max-w-[220px] leading-relaxed">
              Link your pending tasks to a weekly boss to track completion as combat.
            </p>
          </div>
          <button
            onClick={onGenerateBoss}
            disabled={generatingBoss || !onGenerateBoss}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-border rounded-sm bg-white hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {generatingBoss ? (
              <>
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Summoning...
              </>
            ) : (
              <>
                <Flame size={12} className="text-accent" />
                Summon Boss
              </>
            )}
          </button>
          {!onGenerateBoss && (
            <p className="text-[10px] text-faint">Add at least 3 pending tasks first.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-border bg-white p-4 rounded-sm">
      <div className="flex flex-col gap-4">
        
        {/* Boss Info */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <h2 className="text-[10px] font-black text-faint uppercase tracking-widest leading-none flex items-center gap-1.5">
              <Skull size={12} className="text-accent" />
              Weekly Boss
            </h2>
            <div className="text-[9px] font-bold text-faint uppercase px-1.5 py-0.5 border border-border rounded-sm">
              Ends {new Date(boss.expiresAt).toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
          </div>
          
          <div className="border border-border bg-slate-50/30 rounded-sm p-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-lg font-bold text-text leading-tight mb-1 relative z-10">{boss.title}</h3>
            <p className="text-[11px] text-muted mb-4 relative z-10 leading-relaxed">{boss.description}</p>
            
            <div className="mt-auto relative z-10">
               <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-black uppercase text-accent tracking-wider flex items-center gap-1">
                    <Flame size={10} /> HP
                  </span>
                  <span className="text-xs font-bold text-text">
                    {boss.hpCurrent} <span className="text-faint font-normal">/ {boss.hpTotal}</span>
                  </span>
               </div>
               {/* Brutalist 2px progress bar */}
               <div className="h-[2px] w-full bg-slate-200 overflow-hidden">
                 <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    className={clsx("h-full", isDefeated ? "bg-emerald-500" : "bg-accent")}
                 />
               </div>
            </div>
          </div>
        </div>

        {/* Task Attacks */}
        <div className="flex flex-col">
          <h3 className="text-[10px] font-black text-faint uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Target size={10} />
            Linked Attacks ({attacks.filter(a => a.completed).length}/{attacks.length})
          </h3>

          <div className="flex flex-col gap-1.5">
            {attacks.map((attack) => (
              <motion.button
                key={attack.id}
                onClick={() => onAttackToggle?.(attack.id, !attack.completed)}
                whileHover={{ scale: 0.995 }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  "flex items-center gap-3 p-2.5 border text-left rounded-sm transition-colors",
                  attack.completed 
                    ? "bg-slate-50 border-transparent opacity-60" 
                    : "bg-white border-border hover:border-slate-300"
                )}
              >
                <div className={clsx(
                  "w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                  attack.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                )}>
                  {attack.completed && <Check size={10} strokeWidth={3} />}
                </div>
                
                <span className={clsx(
                  "flex-1 text-sm font-medium truncate transition-all",
                  attack.completed ? "text-faint line-through decoration-slate-300" : "text-text"
                )}>
                  {attack.title}
                </span>

                <span className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 uppercase tracking-widest",
                  attack.completed ? "text-emerald-600 bg-emerald-50" : "text-accent bg-accent-muted"
                )}>
                  -{attack.damage} HP
                </span>
              </motion.button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
