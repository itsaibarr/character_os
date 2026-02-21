"use client";

import { Package } from "lucide-react";
import type { InventoryItem, ItemRarity } from "@/lib/gamification/types";
import ItemCard from "./ItemCard";

interface InventoryGridProps {
  items: InventoryItem[];
  onUseItem?: (itemId: string) => void;
}

const RARITY_ORDER: ItemRarity[] = ["mythic", "rare", "uncommon", "common"];

const RARITY_LABELS: Record<ItemRarity, string> = {
  mythic: "Mythic",
  rare: "Rare",
  uncommon: "Uncommon",
  common: "Common",
};

export default function InventoryGrid({ items, onUseItem }: InventoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="border border-border bg-white rounded-sm p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-border flex items-center justify-center">
          <Package size={14} className="text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-text mb-1">No Items Yet</p>
          <p className="text-[11px] text-muted max-w-[240px] leading-relaxed">
            Complete tasks and defeat bosses to earn loot drops.
          </p>
        </div>
      </div>
    );
  }

  const grouped = RARITY_ORDER.reduce<Record<string, InventoryItem[]>>(
    (acc, rarity) => {
      const filtered = items.filter((item) => item.rarity === rarity);
      if (filtered.length > 0) acc[rarity] = filtered;
      return acc;
    },
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([rarity, groupItems]) => (
        <section key={rarity}>
          <h3 className="text-[10px] font-black text-faint uppercase tracking-widest mb-2">
            {RARITY_LABELS[rarity as ItemRarity]} — {groupItems.length}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {groupItems.map((item) => (
              <ItemCard key={item.id} item={item} onUse={onUseItem} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
