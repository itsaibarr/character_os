"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { Sparkles, Shield, ArrowUpCircle, X } from "lucide-react";

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

export interface LootItem {
  id: string;
  name: string;
  rarity: Rarity;
  effectType: "xp_boost" | "streak_shield" | "evolution_catalyst" | "skin" | "temp_buff";
}

interface LootDropAlertProps {
  item: LootItem | null;
  onDismiss: () => void;
}

const RARITY_STYLES: Record<Rarity, { border: string, bg: string, text: string, label: string }> = {
  common:   { border: "border-slate-300", bg: "bg-slate-50", text: "text-slate-600", label: "Common" },
  uncommon: { border: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", label: "Uncommon" },
  rare:     { border: "border-blue-400", bg: "bg-blue-50", text: "text-blue-700", label: "Rare" },
  mythic:   { border: "border-accent", bg: "bg-slate-900", text: "text-accent", label: "Mythic!" },
};

const EFFECT_ICONS = {
  xp_boost: ArrowUpCircle,
  streak_shield: Shield,
  evolution_catalyst: Sparkles,
  skin: Sparkles,
  temp_buff: ArrowUpCircle,
};

export default function LootDropAlert({ item, onDismiss }: LootDropAlertProps) {
  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [item, onDismiss]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-100 w-full max-w-sm px-4"
        >
          <div className={clsx(
            "p-3 rounded-[2px] border-l-4 border-y border-r shadow-2xl flex items-start gap-4 cursor-pointer",
            RARITY_STYLES[item.rarity].bg,
            RARITY_STYLES[item.rarity].border
          )} onClick={onDismiss}>
            
            <div className={clsx("mt-0.5 shrink-0", RARITY_STYLES[item.rarity].text)}>
              {(() => {
                const Icon = EFFECT_ICONS[item.effectType];
                return <Icon size={20} strokeWidth={2.5} />;
              })()}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className={clsx(
                "text-[9px] font-black uppercase tracking-widest leading-none mb-1.5",
                RARITY_STYLES[item.rarity].text
              )}>
                {RARITY_STYLES[item.rarity].label} Loot
              </h4>
              <p className={clsx(
                "text-sm font-bold truncate",
                item.rarity === 'mythic' ? "text-white" : "text-text"
              )}>
                {item.name}
              </p>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="text-faint hover:text-text transition-colors opacity-50 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
