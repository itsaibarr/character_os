"use client";

import { clsx } from "clsx";
import { Sparkles, Shield, ArrowUpCircle, RotateCcw, Zap } from "lucide-react";
import type { InventoryItem, ItemRarity, ItemEffectType } from "@/lib/gamification/types";

interface ItemCardProps {
  item: InventoryItem;
  onUse?: (itemId: string) => void;
}

const RARITY_STYLES: Record<ItemRarity, { border: string; bg: string; text: string; label: string }> = {
  common:   { border: "border-l-slate-300",   bg: "bg-white",     text: "text-slate-500",   label: "Common" },
  uncommon: { border: "border-l-emerald-400", bg: "bg-white",     text: "text-emerald-600", label: "Uncommon" },
  rare:     { border: "border-l-blue-400",    bg: "bg-white",     text: "text-blue-600",    label: "Rare" },
  mythic:   { border: "border-l-accent",  bg: "bg-slate-950", text: "text-accent",  label: "Mythic" },
};

const EFFECT_ICONS: Partial<Record<ItemEffectType, typeof Sparkles>> = {
  xp_boost: ArrowUpCircle,
  xp_boost_all: ArrowUpCircle,
  xp_boost_stat: ArrowUpCircle,
  streak_shield: Shield,
  evolution_catalyst: Sparkles,
  stat_reset: RotateCcw,
  temp_buff: Zap,
  title: Sparkles,
  permanent_boost: ArrowUpCircle,
  permanent_stat: ArrowUpCircle,
  cosmetic: Sparkles,
};

export default function ItemCard({ item, onUse }: ItemCardProps) {
  const style = RARITY_STYLES[item.rarity];
  const Icon = EFFECT_ICONS[item.effectType] ?? Sparkles;
  const isMythic = item.rarity === "mythic";

  return (
    <div
      className={clsx(
        "border border-border border-l-2 rounded-sm p-3 flex flex-col gap-2 transition-colors",
        style.border,
        style.bg,
        isMythic && "border-border/20"
      )}
    >
      {/* Header: icon + rarity label + quantity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className={style.text} />
          <span className={clsx("text-[9px] font-black uppercase tracking-widest", style.text)}>
            {style.label}
          </span>
        </div>
        {item.quantity > 1 && (
          <span
            className={clsx(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
              isMythic ? "bg-white/10 text-white" : "bg-slate-100 text-text"
            )}
          >
            ×{item.quantity}
          </span>
        )}
      </div>

      {/* Name + description */}
      <div>
        <h3
          className={clsx(
            "text-sm font-bold leading-tight mb-0.5",
            isMythic ? "text-white" : "text-text"
          )}
        >
          {item.name}
        </h3>
        <p
          className={clsx(
            "text-[11px] leading-relaxed line-clamp-2",
            isMythic ? "text-slate-400" : "text-muted"
          )}
        >
          {item.description}
        </p>
      </div>

      {/* Use button — only for consumables */}
      {item.consumable && onUse && (
        <button
          onClick={() => onUse(item.id)}
          className={clsx(
            "mt-auto self-start px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-colors",
            isMythic
              ? "border-accent/40 text-accent hover:bg-accent/10"
              : "border-border text-text hover:border-slate-400 hover:bg-slate-50"
          )}
        >
          Use
        </button>
      )}
    </div>
  );
}
