"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/gamification/types";
import { ITEM_CATALOG } from "@/lib/gamification/item-catalog";
import {
  isStreakBroken,
  hasCompletedToday,
  calculateStreakMilestone,
  shieldShouldActivate,
  getNextMilestone,
  todayUtc,
  type StreakStatus,
  type MilestoneReward,
} from "@/lib/gamification/streak";


/**
 * Returns the user's current streak status without any side effects.
 */
export async function getStreakStatus(): Promise<ActionResponse<StreakStatus>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: row } = await supabase
      .from("user_streaks")
      .select(
        "current_streak, longest_streak, shields_available, last_completed_date",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const currentStreak = row?.current_streak ?? 0;
    const { milestone, daysUntil } = getNextMilestone(currentStreak);

    const status: StreakStatus = {
      currentStreak,
      longestStreak: row?.longest_streak ?? 0,
      shieldsAvailable: row?.shields_available ?? 0,
      lastCompletedDate: row?.last_completed_date ?? null,
      nextMilestone: milestone,
      daysUntilMilestone: daysUntil,
    };

    return { success: true, data: status };
  } catch (error: unknown) {
    console.error("[getStreakStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get streak",
    };
  }
}

/**
 * Called when a user completes a task. Updates the streak, applies shields if broken,
 * and awards milestone items. Safe to call multiple times per day (idempotent).
 */
export async function checkAndUpdateStreak(): Promise<
  ActionResponse<{ status: StreakStatus; milestone: MilestoneReward | null }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const today = todayUtc();

    const { data: row } = await supabase
      .from("user_streaks")
      .select(
        "current_streak, longest_streak, shields_available, last_completed_date",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const lastDate: string | null = row?.last_completed_date ?? null;
    let currentStreak = row?.current_streak ?? 0;
    const longestStreak = row?.longest_streak ?? 0;
    let shieldsAvailable = row?.shields_available ?? 0;

    // Already updated today — idempotent return
    if (hasCompletedToday(lastDate)) {
      const { milestone: nextM, daysUntil } = getNextMilestone(currentStreak);
      return {
        success: true,
        data: {
          status: {
            currentStreak,
            longestStreak,
            shieldsAvailable,
            lastCompletedDate: lastDate,
            nextMilestone: nextM,
            daysUntilMilestone: daysUntil,
          },
          milestone: null,
        },
      };
    }

    const broken = isStreakBroken(lastDate);

    if (broken && shieldShouldActivate(shieldsAvailable, broken)) {
      // TODO: Multi-day shields (Iron Resolve, Unbreakable Vow) are currently
      // treated as single-day consumables. See item-catalog.ts for effectValue.days semantics.
      shieldsAvailable -= 1;
      currentStreak += 1;
    } else if (broken) {
      // Streak broken, no shield → reset
      currentStreak = 1;
    } else {
      // Consecutive day
      currentStreak += 1;
    }

    const newLongest = Math.max(longestStreak, currentStreak);
    const milestone = calculateStreakMilestone(currentStreak);

    // Award milestone item if applicable
    if (milestone) {
      const catalogEntry = ITEM_CATALOG.find(i => i.id === milestone.itemId);
      if (!catalogEntry) {
        console.warn(`[checkAndUpdateStreak] Unknown milestone itemId: ${milestone.itemId}`);
      } else {
        const { data: itemRow } = await supabase
          .from("items")
          .select("id")
          .eq("name", catalogEntry.name)
          .maybeSingle();

        if (itemRow) {
          // NOTE: This read-then-write has a theoretical race condition under
          // concurrent calls. The inventory table has UNIQUE(user_id, item_id),
          // but a true atomic increment requires a DB-level function. In practice,
          // checkAndUpdateStreak is idempotent (returns early if already updated
          // today), so concurrent execution for the same user is extremely unlikely.
          const { data: existing } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("user_id", user.id)
            .eq("item_id", itemRow.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("inventory")
              .update({ quantity: existing.quantity + 1 })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("inventory")
              .insert({ user_id: user.id, item_id: itemRow.id, quantity: 1 });
          }
        }
      }

      // Award bonus XP evenly across stats
      if (milestone.bonusXp > 0) {
        const perStat = Math.round(milestone.bonusXp / 6);
        const { data: charData } = await supabase
          .from("characters")
          .select("str_xp, int_xp, dis_xp, cha_xp, cre_xp, spi_xp")
          .eq("user_id", user.id)
          .maybeSingle();

        if (charData) {
          await supabase
            .from("characters")
            .update({
              str_xp: (charData.str_xp ?? 0) + perStat,
              int_xp: (charData.int_xp ?? 0) + perStat,
              dis_xp: (charData.dis_xp ?? 0) + perStat,
              cha_xp: (charData.cha_xp ?? 0) + perStat,
              cre_xp: (charData.cre_xp ?? 0) + perStat,
              spi_xp: (charData.spi_xp ?? 0) + perStat,
            })
            .eq("user_id", user.id);
        }
      }
    }

    // Upsert streak row
    await supabase.from("user_streaks").upsert(
      {
        user_id: user.id,
        current_streak: currentStreak,
        longest_streak: newLongest,
        shields_available: shieldsAvailable,
        last_completed_date: today,
      },
      { onConflict: "user_id" },
    );

    revalidatePath("/dashboard");

    const { milestone: nextM, daysUntil } = getNextMilestone(currentStreak);

    return {
      success: true,
      data: {
        status: {
          currentStreak,
          longestStreak: newLongest,
          shieldsAvailable,
          lastCompletedDate: today,
          nextMilestone: nextM,
          daysUntilMilestone: daysUntil,
        },
        milestone,
      },
    };
  } catch (error: unknown) {
    console.error("[checkAndUpdateStreak] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update streak",
    };
  }
}

