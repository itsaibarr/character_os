"use client";

import { motion } from "motion/react";
import { clsx } from "clsx";
import { Check, Flame, Skull, Target } from "lucide-react";

export interface Boss {
  id: string;
  title: string;
  description: string;
  hpTotal: number;
  hpCurrent: number;
  expiresAt: string;
}

export interface BossAttack {
  id: string;
  title: string;
  damage: number;
  completed: boolean;
}

interface WeeklyBossBoardProps {
  boss: Boss;
  attacks: BossAttack[];
  onAttackToggle?: (attackId: string, completed: boolean) => void;
}

export default function WeeklyBossBoard({ boss, attacks, onAttackToggle }: WeeklyBossBoardProps) {
  const hpPercent = Math.max(0, Math.min(100, (boss.hpCurrent / boss.hpTotal) * 100));
  const isDefeated = boss.hpCurrent <= 0;

  return (
    <div className="w-full border border-border bg-slate-50/50 p-4 rounded-sm">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Extreme Asymmetry: Boss Avatar and Stats take up ~30% width */}
        <div className="md:w-1/3 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-black text-text uppercase tracking-widest leading-none flex items-center gap-2">
              <Skull size={14} className="text-orange-500" />
              Weekly Boss
            </h2>
            <div className="text-[10px] font-bold text-faint uppercase px-1.5 py-0.5 border border-border rounded-sm">
              Ends {new Date(boss.expiresAt).toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
          </div>
          
          <div className="flex-1 border border-border bg-white rounded-sm p-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-orange-50/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-lg font-bold text-text leading-tight mb-1 relative z-10">{boss.title}</h3>
            <p className="text-[11px] text-muted mb-4 relative z-10 leading-relaxed">{boss.description}</p>
            
            <div className="mt-auto relative z-10">
               <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider flex items-center gap-1">
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
                    className={clsx("h-full", isDefeated ? "bg-emerald-500" : "bg-orange-500")}
                 />
               </div>
            </div>
          </div>
        </div>

        {/* Vertical Stack: Task Attacks */}
        <div className="md:w-2/3 flex flex-col">
          <h3 className="text-[10px] font-black text-faint uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Target size={12} />
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
                  attack.completed ? "text-emerald-600 bg-emerald-50" : "text-orange-600 bg-orange-50"
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
