"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { generateDailyQuests, generateMentorDialogue } from "@/lib/ai";
import { calculateDifficultyAdjustments } from "@/lib/gamification/math";

import type { Boss, BossAttack } from "@/components/dashboard/gamification/WeeklyBossBoard";

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
      .single();

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
