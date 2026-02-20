"use client";

import { motion } from "motion/react";
import { Dumbbell, Brain, Focus, MessageCircle, PenTool, Sparkles } from "lucide-react";
import { clsx } from "clsx";

interface Stat {
  name: string;
  value: number;
  icon: any;
  color: string;
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

export default function StatGrid({ stats, level, xpProgress }: StatGridProps) {
  const statList: Stat[] = [
    { name: "Strength", value: stats.strength, icon: Dumbbell, color: "text-red-500" },
    { name: "Intellect", value: stats.intellect, icon: Brain, color: "text-blue-500" },
    { name: "Discipline", value: stats.discipline, icon: Focus, color: "text-amber-500" },
    { name: "Charisma", value: stats.charisma, icon: MessageCircle, color: "text-purple-500" },
    { name: "Creativity", value: stats.creativity, icon: PenTool, color: "text-emerald-500" },
    { name: "Spirituality", value: stats.spirituality, icon: Sparkles, color: "text-indigo-500" },
  ];

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
            {/* Tiny Progress Bar */}
            <div className="mt-2 h-1 bg-slate-50 rounded-full overflow-hidden">
                <div 
                    className={clsx("h-full rounded-full opacity-30", stat.color.replace('text-', 'bg-'))}
                    style={{ width: `${stat.value % 10 * 10}%` }}
                />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
