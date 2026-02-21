"use server";

import { createClient } from "@/utils/supabase/server";
import { ITEM_CATALOG } from "@/lib/gamification/item-catalog";
import { activateBuff, fetchActiveBuffs, cleanExpiredBuffs } from "@/lib/gamification/buffs";
import type { ActionResponse } from "@/lib/gamification/types";
import type { InventoryItem, ActiveBuff } from "@/lib/gamification/types";

/**
 * Fetches the user's inventory with item metadata from the catalog.
 */
export async function getInventory(): Promise<ActionResponse<InventoryItem[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: rows, error } = await supabase
      .from("inventory")
      .select("id, item_id, quantity")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: false });

    if (error) throw error;

    const items: InventoryItem[] = (rows ?? []).map(row => {
      const catalogItem = ITEM_CATALOG.find(c => c.id === row.item_id);
      return {
        id: row.id,
        itemId: row.item_id,
        name: catalogItem?.name ?? "Unknown Item",
        description: catalogItem?.description ?? "",
        rarity: (catalogItem?.rarity ?? "common") as InventoryItem["rarity"],
        effectType: (catalogItem?.effectType ?? "cosmetic") as InventoryItem["effectType"],
        quantity: row.quantity,
        consumable: catalogItem?.consumable ?? false,
      };
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("[getInventory] Error:", error);
    return { success: false, error: "Failed to fetch inventory" };
  }
}

/**
 * Uses a consumable item: decrements quantity (or removes if qty=1),
 * then activates the corresponding buff if applicable.
 */
export async function useItem(inventoryId: string): Promise<ActionResponse<{ activated: boolean }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Verify ownership
    const { data: invRow, error: fetchError } = await supabase
      .from("inventory")
      .select("id, item_id, quantity")
      .eq("id", inventoryId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !invRow) {
      return { success: false, error: "Item not found in inventory" };
    }

    // 2. Find catalog entry
    const catalogItem = ITEM_CATALOG.find(c => c.id === invRow.item_id);
    if (!catalogItem) {
      return { success: false, error: "Unknown item type" };
    }

    if (!catalogItem.consumable) {
      return { success: false, error: "This item cannot be consumed" };
    }

    // 3. Decrement or remove
    if (invRow.quantity > 1) {
      await supabase
        .from("inventory")
        .update({ quantity: invRow.quantity - 1 })
        .eq("id", invRow.id);
    } else {
      await supabase
        .from("inventory")
        .delete()
        .eq("id", invRow.id);
    }

    // 4. Activate buff based on effect type
    let activated = false;
    const { effectType, effectValue } = catalogItem;

    if (effectType === "xp_boost_all" || effectType === "xp_boost_stat") {
      const result = await activateBuff(
        supabase,
        user.id,
        invRow.item_id,
        effectType,
        effectValue,
      );
      activated = result.success;
    } else if (effectType === "streak_shield") {
      // Add shields to user_streaks
      const { data: streak } = await supabase
        .from("user_streaks")
        .select("shields_available")
        .eq("user_id", user.id)
        .single();

      const currentShields = streak?.shields_available ?? 0;
      const shieldsToAdd = effectValue.amount ?? 1;

      await supabase
        .from("user_streaks")
        .upsert({
          user_id: user.id,
          shields_available: currentShields + shieldsToAdd,
        }, { onConflict: "user_id" });

      activated = true;
    } else if (effectType === "permanent_stat") {
      // Polymath Tome: +5 XP to all stats
      const amount = effectValue.amount ?? 5;
      const { data: userData } = await supabase
        .from("user")
        .select("strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp")
        .eq("id", user.id)
        .single();

      if (userData) {
        await supabase
          .from("user")
          .update({
            strength_xp: (userData.strength_xp ?? 0) + amount,
            intellect_xp: (userData.intellect_xp ?? 0) + amount,
            discipline_xp: (userData.discipline_xp ?? 0) + amount,
            charisma_xp: (userData.charisma_xp ?? 0) + amount,
            creativity_xp: (userData.creativity_xp ?? 0) + amount,
            spirituality_xp: (userData.spirituality_xp ?? 0) + amount,
          })
          .eq("id", user.id);
        activated = true;
      }
    }
    // evolution_catalyst, stat_reset, cosmetic — no immediate server-side effect
    // Agent 3 / frontend will handle these interaction flows

    return { success: true, data: { activated } };
  } catch (error) {
    console.error("[useItem] Error:", error);
    return { success: false, error: "Failed to use item" };
  }
}

/**
 * Returns all active (non-expired) buffs for the current user.
 * Also cleans up expired buffs opportunistically.
 */
export async function getActiveBuffs(): Promise<ActionResponse<ActiveBuff[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Opportunistic cleanup
    await cleanExpiredBuffs(supabase, user.id);

    const rows = await fetchActiveBuffs(supabase, user.id);

    const buffs: ActiveBuff[] = rows.map(row => {
      const catalogItem = ITEM_CATALOG.find(c => c.id === row.item_id);
      const expiresAt = new Date(row.expires_at);
      const remainingMs = expiresAt.getTime() - Date.now();
      const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60_000));

      return {
        id: row.id,
        name: catalogItem?.name ?? "Unknown Buff",
        effectType: row.effect_type,
        effectValue: (row.effect_value as { multiplier?: number })?.multiplier ?? 1.0,
        expiresAt: row.expires_at,
        remainingMinutes,
      };
    });

    return { success: true, data: buffs };
  } catch (error) {
    console.error("[getActiveBuffs] Error:", error);
    return { success: false, error: "Failed to fetch active buffs" };
  }
}
