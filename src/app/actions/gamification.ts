"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { generateDailyQuests, generateMentorDialogue } from "@/lib/ai";
import { calculateDifficultyAdjustments } from "@/lib/gamification/math";

import type { Boss, BossAttack, HeatmapDataPoint, EvolutionNode } from "@/lib/gamification/types";
import { determineEvolutionBranch, type EvolutionBranch } from "@/lib/gamification/progression";

// Define strict return types
export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Regenerates daily AI quests for the user.
 * Restricted by strict rate limits (max 5 per day).
 */
export async function refreshDailyQuests(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Enforce AI Rate Limit (max 5 quest rerolls per day)
    await enforceRateLimit(user.id, "ai_quest", 5);

    // 2. Gather User Context
    // Get stats to find the weakest one
    const { data: charData } = await supabase
      .from("characters")
      .select("strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp")
      .eq("user_id", user.id)
      .single();

    let weakestStat = "strength";
    if (charData) {
      const stats = [
        { name: "strength", val: charData.strength_xp },
        { name: "intellect", val: charData.intellect_xp },
        { name: "discipline", val: charData.discipline_xp },
        { name: "charisma", val: charData.charisma_xp },
        { name: "creativity", val: charData.creativity_xp },
        { name: "spirituality", val: charData.spirituality_xp },
      ];
      stats.sort((a, b) => a.val - b.val);
      weakestStat = stats[0].name;
    }

    // Get yesterday's performance logs
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    const { data: logData } = await supabase
      .from("daily_logs")
      .select("completed_tasks, failed_tasks")
      .eq("user_id", user.id)
      .eq("log_date", dateStr)
      .single();

    const completes = logData?.completed_tasks || 0;
    const fails = logData?.failed_tasks || 0;

    // Get backlog size
    const { count: backlogCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .is("due_date", null);

    // 3. Generate Quests
    const quests = await generateDailyQuests(weakestStat, fails, completes, backlogCount || 0);

    // 4. Save to Database
    // First, void any existing pending daily quests 
    // (assuming we flag them in the DB, or we just insert new regular tasks)
    
    const tasksToInsert = quests.map(q => ({
        user_id: user.id,
        title: `[Daily Quest] ${q.title}`,
        description: q.description,
        difficulty: q.reward_multiplier > 1.2 ? "high" : q.reward_multiplier > 1.0 ? "medium" : "low",
        priority: q.quest_type === "urgent" ? "high" : "medium",
        status: "pending"
    }));

    const { error: insertError } = await supabase
        .from("tasks")
        .insert(tasksToInsert);
        
    if (insertError) throw insertError;

    revalidatePath("/dashboard");
    revalidatePath("/tasks");

    return { success: true, data: quests };
  } catch (error: unknown) {
    console.error("[refreshDailyQuests] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to refresh daily quests." };
  }
}

/**
 * Weekly/Nightly CRON job replacement. 
 * Evaluates performance, updates the adaptive difficulty table, and deducts streak shields.
 */
export async function updateDailyAnalytics(userId: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient(); // Service role client would be best here if called from an API route

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateQuery = sevenDaysAgo.toISOString().split("T")[0];

    // 1. Fetch last 7 days Logs
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("log_date, completed_tasks, failed_tasks")
      .eq("user_id", userId)
      .gte("log_date", dateQuery);

    if (logs && logs.length > 0) {
       // Format for the math utility
       const mathLogs = logs.map(l => ({
           log_date: l.log_date,
           completed_count: l.completed_tasks,
           failed_count: l.failed_tasks
       }));

       // 2. Calculate New Difficulty Limits
       const newMultiplier = calculateDifficultyAdjustments(mathLogs);

       // 3. Upsert to difficulty_adjustments
       await supabase.from("difficulty_adjustments").upsert({
           user_id: userId,
           multiplier: newMultiplier,
           last_adjusted: new Date().toISOString()
       }, { onConflict: "user_id" });
    }

    return { success: true };
  } catch(error: unknown) {
    console.error("[updateDailyAnalytics] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

/**
 * Fetches contextual dialogue from the user's NPC Mentor.
 */
export async function getCompanionDialogue(): Promise<ActionResponse<{ text: string }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
    
        if (!user) return { success: false, error: "Unauthorized" };

        const { data: charData } = await supabase
            .from("characters")
            .select("evolution_path")
            .eq("user_id", user.id)
            .single();

        const { data: streakData } = await supabase
            .from("user_streaks")
            .select("current_streak")
            .eq("user_id", user.id)
            .single();

        // Calculate a dummy burnout risk for now based on recent fail/completes
        // In reality, this would query a complex rolling average
        const burnoutRisk = 0.3; 

        const dialogue = await generateMentorDialogue(
            charData?.evolution_path || "novice",
            burnoutRisk,
            streakData?.current_streak || 0
        );

        return { success: true, data: { text: dialogue }};
    } catch(error: unknown) {
        console.error("[getCompanionDialogue] Error:", error);
        return { success: false, error: "Failed to get dialogue" };
    }
}

/**
 * Spawns a weekly boss for the user and links 3-7 pending tasks as "attacks".
 */
export async function generateWeeklyBoss(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Get up to 7 pending tasks without a boss_id
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, priority")
      .eq("user_id", user.id)
      .eq("status", "todo")
      .is("boss_id", null)
      .limit(7);

    if (!tasks || tasks.length < 3) {
      return { success: false, error: "Not enough pending tasks to form a boss (need at least 3)." };
    }

    const computeDamage = (priority: string) =>
      priority === "high" ? 30 : priority === "medium" ? 20 : 10;

    const totalHp = tasks.reduce((sum, t) => sum + computeDamage(t.priority), 0);

    // 2. Spawn the Boss
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay())); // next Sunday

    const { data: boss, error: bossError } = await supabase
      .from("bosses")
      .insert({
        user_id: user.id,
        title: "The Procrastination Behemoth",
        description: "A manifestation of your delayed tasks. Defeat it before Sunday.",
        hp_total: totalHp,
        hp_current: totalHp,
        expires_at: nextSunday.toISOString(),
      })
      .select("id")
      .single();

    if (bossError || !boss) throw bossError;

    // 3. Link Tasks
    const taskIds = tasks.map(t => t.id);
    await supabase
      .from("tasks")
      .update({ boss_id: boss.id })
      .in("id", taskIds);

    revalidatePath("/dashboard");
    revalidatePath("/tasks");

    return { success: true };
  } catch (error: unknown) {
    console.error("[generateWeeklyBoss] Error:", error);
    return { success: false, error: "Failed to generate boss" };
  }
}

/**
 * Consumes a streak shield to prevent streak loss.
 */
export async function consumeStreakShield(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: streak } = await supabase
      .from("user_streaks")
      .select("shields_available")
      .eq("user_id", user.id)
      .single();

    if (!streak || streak.shields_available <= 0) {
      return { success: false, error: "No shields available." };
    }

    await supabase
      .from("user_streaks")
      .update({ shields_available: streak.shields_available - 1 })
      .eq("user_id", user.id);

    // Simulate saving the streak today (so the cron doesn't reset it)
    await supabase
      .from("daily_logs")
      .upsert({
        user_id: user.id,
        log_date: new Date().toISOString().split("T")[0],
        completed_count: 1 // Artificial completion to keep streak alive
      }, { onConflict: "user_id, log_date" });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: unknown) {
    console.error("[consumeStreakShield] Error:", error);
    return { success: false, error: "Failed to consume shield" };
  }
}

/**
 * Gets aggregated analytics for a guild (collective PvE task completion over 7 days).
 */
export async function getGuildAnalytics(guildId: string): Promise<ActionResponse<{ total_tasks: number }>> {
  try {
    const supabase = await createClient();

    // Get members
    const { data: members } = await supabase
      .from("guild_members")
      .select("user_id")
      .eq("guild_id", guildId);

    if (!members || members.length === 0) {
      return { success: true, data: { total_tasks: 0 } };
    }

    const memberIds = members.map(m => m.user_id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateQuery = sevenDaysAgo.toISOString().split("T")[0];

    // Sum completed tasks for all members in the last 7 days
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("completed_count")
      .in("user_id", memberIds)
      .gte("log_date", dateQuery);

    let totalTasks = 0;
    if (logs) {
      totalTasks = logs.reduce((sum, log) => sum + log.completed_count, 0);
    }

    return { success: true, data: { total_tasks: totalTasks } };
  } catch (error: unknown) {
    console.error("[getGuildAnalytics] Error:", error);
    return { success: false, error: "Failed to get guild analytics" };
  }
}

/**
 * Fetches the user's current active weekly boss and its linked task attacks.
 * Returns null if no active boss exists.
 */
export async function getActiveWeeklyBoss(): Promise<{
  boss: Boss;
  attacks: BossAttack[];
} | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch the active boss
    const { data: bossRow } = await supabase
      .from('bosses')
      .select('id, title, description, hp_total, hp_current, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!bossRow) return null;

    // Fetch linked tasks (attacks)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, content, priority, status')
      .eq('boss_id', bossRow.id)
      .eq('user_id', user.id);

    if (!tasks) return null;

    const computeDamage = (priority: string) =>
      priority === 'high' ? 30 : priority === 'medium' ? 20 : 10;

    const attacks: BossAttack[] = tasks.map(t => ({
      id: t.id,
      title: t.content,
      damage: computeDamage(t.priority),
      completed: t.status === 'completed',
    }));

    const boss: Boss = {
      id: bossRow.id,
      title: bossRow.title,
      description: bossRow.description ?? '',
      hpTotal: bossRow.hp_total,
      hpCurrent: bossRow.hp_current,
      expiresAt: bossRow.expires_at,
    };

    return { boss, attacks };
  } catch (error) {
    console.error('[getActiveWeeklyBoss] Error:', error);
    return null;
  }
}

/**
 * Fetches completed task counts per day for the consistency heatmap.
 */
export async function getHeatmapData(days = 90): Promise<HeatmapDataPoint[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const startStr = startDate.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('log_date, completed_count')
      .eq('user_id', user.id)
      .gte('log_date', startStr)
      .order('log_date', { ascending: true });

    if (!logs) return [];

    return logs.map(l => ({
      date: l.log_date,
      count: l.completed_count,
    }));
  } catch (error) {
    console.error('[getHeatmapData] Error:', error);
    return [];
  }
}

type BranchMeta = { name: string; levelReq: number; condition: string };

const BRANCH_META: Record<EvolutionBranch, BranchMeta> = {
  novice:   { name: 'Novice',   levelReq: 1,  condition: 'Begin your journey' },
  beast:    { name: 'Beast',    levelReq: 5,  condition: 'STR Dominant (>40%)' },
  mystic:   { name: 'Mystic',   levelReq: 5,  condition: 'CRE + CHA Dominant (>50%)' },
  techno:   { name: 'Techno',   levelReq: 5,  condition: 'INT + DIS Dominant (>50%)' },
  diplomat: { name: 'Diplomat', levelReq: 10, condition: 'CHA + DIS Dominant (>50%)' },
  monk:     { name: 'Monk',     levelReq: 10, condition: 'SPI + DIS Dominant (>50%)' },
  polymath: { name: 'Polymath', levelReq: 20, condition: 'Balanced across all stats' },
};

// What the user could evolve into next, based on current branch.
// novice and polymath are omitted: novice is handled dynamically, polymath is the terminal branch.
const NEXT_BRANCH: Partial<Record<EvolutionBranch, EvolutionBranch>> = {
  beast:    'polymath',
  mystic:   'polymath',
  techno:   'polymath',
  diplomat: 'polymath',
  monk:     'polymath',
};

/**
 * Returns ordered evolution nodes for display in the EvolutionTree component.
 */
export async function getEvolutionStatus(): Promise<{ nodes: EvolutionNode[] }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { nodes: [] };

    const { data: userData } = await supabase
      .from('user')
      .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
      .eq('id', user.id)
      .single();

    if (!userData) return { nodes: [] };

    const stats = {
      strength_xp:     userData.strength_xp     ?? 0,
      intellect_xp:    userData.intellect_xp     ?? 0,
      discipline_xp:   userData.discipline_xp    ?? 0,
      charisma_xp:     userData.charisma_xp      ?? 0,
      creativity_xp:   userData.creativity_xp    ?? 0,
      spirituality_xp: userData.spirituality_xp  ?? 0,
    };

    const totalXp = Object.values(stats).reduce((s, v) => s + v, 0);
    const level = Math.floor(totalXp / 60) + 1;

    const currentBranch: EvolutionBranch = totalXp === 0 ? 'novice' : determineEvolutionBranch(stats, level);

    const nodes: EvolutionNode[] = [];

    // Node 1: always Novice as origin
    nodes.push({
      id: 'novice',
      ...BRANCH_META.novice,
      isUnlocked: true,
      isActive: currentBranch === 'novice',
    });

    // Node 2: current active branch (if not novice)
    if (currentBranch !== 'novice') {
      const meta = BRANCH_META[currentBranch];
      nodes.push({
        id: currentBranch,
        ...meta,
        isUnlocked: true,
        isActive: true,
      });
    }

    // Node 3: next possible evolution
    if (currentBranch === 'novice') {
      // Show a generic "your path unlocks at level 5" node — stat bias is unknowable at zero XP
      nodes.push({
        id: 'path',
        name: 'Your Path',
        levelReq: 5,
        condition: 'Determined by dominant stat at Level 5',
        isUnlocked: false,
        isActive: false,
      });
    } else {
      const nextBranchKey = NEXT_BRANCH[currentBranch];
      if (nextBranchKey) {
        const nextMeta = BRANCH_META[nextBranchKey];
        nodes.push({
          id: nextBranchKey,
          ...nextMeta,
          isUnlocked: level >= nextMeta.levelReq,
          isActive: false,
        });
      }
      // polymath users have no "next" node — they have reached the terminal branch
    }

    return { nodes };
  } catch (error) {
    console.error('[getEvolutionStatus] Error:', error);
    return { nodes: [] };
  }
}

/**
 * Awards rewards when a boss is defeated: bonus XP + guaranteed rare+ loot.
 * Called from toggleTaskStatus when boss HP reaches 0.
 */
export async function awardBossDefeatRewards(
  userId: string,
  bossId: string,
): Promise<{ bonusXp: number; lootDrop: { itemId: string; itemName: string; rarity: string; description: string } | null }> {
  const supabase = await createClient();

  // 1. Sum total damage from all linked tasks to calculate bonus XP
  const { data: linkedTasks } = await supabase
    .from('tasks')
    .select('priority')
    .eq('boss_id', bossId)
    .eq('user_id', userId);

  const computeDamage = (priority: string) =>
    priority === 'high' ? 30 : priority === 'medium' ? 20 : 10;

  const totalDamage = (linkedTasks ?? []).reduce((sum, t) => sum + computeDamage(t.priority), 0);
  const bonusXp = Math.round(totalDamage * 0.5);

  // 2. Award bonus XP evenly across all stats
  if (bonusXp > 0) {
    const perStat = Math.round(bonusXp / 6);

    const { data: userData } = await supabase
      .from('user')
      .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
      .eq('id', userId)
      .single();

    if (userData) {
      await supabase
        .from('user')
        .update({
          strength_xp: (userData.strength_xp ?? 0) + perStat,
          intellect_xp: (userData.intellect_xp ?? 0) + perStat,
          discipline_xp: (userData.discipline_xp ?? 0) + perStat,
          charisma_xp: (userData.charisma_xp ?? 0) + perStat,
          creativity_xp: (userData.creativity_xp ?? 0) + perStat,
          spirituality_xp: (userData.spirituality_xp ?? 0) + perStat,
        })
        .eq('id', userId);
    }

    await supabase.from('logs').insert({
      user_id: userId,
      content: `Boss Defeat Bonus: +${bonusXp} XP (${perStat} per stat)`,
      activity_type: 'System',
    });
  }

  // 3. Guaranteed rare+ loot drop (5.0x multiplier heavily biases toward rare/mythic)
  const { rollForLootRarity } = await import('@/lib/gamification/rng');
  const { getRandomItemByRarity } = await import('@/lib/gamification/item-catalog');

  let guaranteedRarity = rollForLootRarity(5.0);
  // Floor at 'rare' — boss drops are always rare or better
  if (guaranteedRarity === 'none' || guaranteedRarity === 'common' || guaranteedRarity === 'uncommon') {
    guaranteedRarity = 'rare';
  }

  const droppedItem = getRandomItemByRarity(guaranteedRarity);
  let lootDrop = null;

  if (droppedItem) {
    // Upsert to inventory
    const { data: existing } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('item_id', droppedItem.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('inventory')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('inventory')
        .insert({
          user_id: userId,
          item_id: droppedItem.id,
          quantity: 1,
        });
    }

    lootDrop = {
      itemId: droppedItem.id,
      itemName: droppedItem.name,
      rarity: droppedItem.rarity,
      description: droppedItem.description,
    };

    await supabase.from('logs').insert({
      user_id: userId,
      content: `Boss Loot: ${droppedItem.name} (${droppedItem.rarity.toUpperCase()})`,
      activity_type: 'System',
    });
  }

  return { bonusXp, lootDrop };
}

/**
 * Marks expired active bosses as 'escaped'.
 * Should be called on dashboard load or via cron.
 */
export async function checkExpiredBosses(): Promise<ActionResponse<{ expiredCount: number }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date().toISOString();

    const { data: expired, error } = await supabase
      .from('bosses')
      .update({ status: 'escaped' })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lt('expires_at', now)
      .select('id');

    if (error) throw error;

    const expiredCount = expired?.length ?? 0;

    if (expiredCount > 0) {
      await supabase.from('logs').insert({
        user_id: user.id,
        content: `${expiredCount} boss${expiredCount > 1 ? 'es' : ''} escaped! Time ran out.`,
        activity_type: 'System',
      });
    }

    return { success: true, data: { expiredCount } };
  } catch (error) {
    console.error('[checkExpiredBosses] Error:', error);
    return { success: false, error: "Failed to check expired bosses" };
  }
}

/**
 * Fetches the last 5 past bosses (defeated or escaped) for the boss history panel.
 */
export async function getBossHistory(): Promise<import("@/lib/gamification/types").BossHistoryEntry[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: bosses } = await supabase
      .from('bosses')
      .select('id, title, status, updated_at')
      .eq('user_id', user.id)
      .in('status', ['defeated', 'escaped'])
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!bosses) return [];

    return bosses.map(b => ({
      id: b.id,
      title: b.title,
      outcome: b.status as 'defeated' | 'escaped',
      completedAt: b.updated_at,
    }));
  } catch (error) {
    console.error('[getBossHistory] Error:', error);
    return [];
  }
}
