"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import AppSidebar from "@/components/AppSidebar";
import InventoryGrid from "@/components/inventory/InventoryGrid";
import { getInventory, useItem } from "@/app/actions/inventory";
import type { InventoryItem } from "@/lib/gamification/types";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInventory = useCallback(async () => {
    const result = await getInventory();
    if (result.success && result.data) {
      setItems(result.data);
    }
  }, []);

  useEffect(() => {
    loadInventory().finally(() => setLoading(false));
  }, [loadInventory]);

  const handleUseItem = async (inventoryId: string) => {
    const result = await useItem(inventoryId);
    if (result.success) {
      toast.success("Item activated — buff applied!");
      await loadInventory();
    } else {
      toast.error(result.error ?? "Failed to use item");
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text">
      <AppSidebar />

      <main className="ml-12 px-6 py-6">
        <div className="max-w-4xl">
          <h1 className="text-[10px] font-black text-faint uppercase tracking-widest mb-4">
            Inventory
          </h1>
          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <InventoryGrid items={items} onUseItem={handleUseItem} />
          )}
        </div>
      </main>
    </div>
  );
}
