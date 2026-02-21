"use client";

import { memo } from "react";

import { motion } from "motion/react";
import { clsx } from "clsx";
import { GitMerge } from "lucide-react";

export interface EvolutionNode {
  id: string;
  name: string;
  levelReq: number;
  condition: string;
  isUnlocked: boolean;
  isActive: boolean;
}

interface EvolutionTreeProps {
  nodes: EvolutionNode[];
}

function EvolutionTree({ nodes }: EvolutionTreeProps) {
  // Very simplified dense tree viewer. 
  // Renders vertically, cascading the tree paths using pure CSS borders.

  return (
    <div className="w-full border border-border bg-white p-4 rounded-sm overflow-x-auto">
      <div className="flex items-center gap-2 mb-6">
        <GitMerge size={14} className="text-slate-400" />
        <h3 className="text-[10px] font-black text-faint uppercase tracking-widest">
          Evolution Pathways
        </h3>
      </div>

      <div className="flex flex-col gap-6 ml-2 border-l-2 border-slate-100 pl-6 relative">
        {nodes.map((node) => (
          <div key={node.id} className="relative group">
            {/* Connector Line */}
            <div className="absolute w-6 h-[2px] bg-slate-100 -left-6 top-4" />
            
            {/* Active Node Indicator Ring */}
            {node.isActive && (
              <motion.div 
                layoutId="activeEvolution"
                className="absolute w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-white -left-[29px] top-[11px] z-10"
              />
            )}
            
            {!node.isActive && (
              <div className={clsx(
                "absolute w-1.5 h-1.5 rounded-full -left-[27px] top-[13px] z-10",
                node.isUnlocked ? "bg-slate-400" : "bg-slate-200"
              )} />
            )}

            <div className={clsx(
              "p-3 border rounded-sm w-[240px] transition-all",
              node.isActive 
                ? "border-slate-900 bg-slate-50" 
                : node.isUnlocked 
                  ? "border-border hover:border-slate-400 bg-white" 
                  : "border-transparent bg-slate-50/50 opacity-50"
            )}>
              <div className="flex justify-between items-start mb-1">
                <span className={clsx(
                  "text-xs font-black uppercase tracking-wider",
                  node.isActive ? "text-slate-900" : "text-text"
                )}>
                  {node.name}
                </span>
                <span className="text-[9px] font-bold text-faint px-1.5 py-0.5 border rounded-[2px]">
                  Lv.{node.levelReq}
                </span>
              </div>
              <p className="text-[10px] text-muted font-medium mt-2 leading-tight">
                {node.condition}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(EvolutionTree);
