"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { classifyTaskStats, extractTasksFromPrompt, TaskInput, TaskAnalysis } from "@/lib/ai";
import { getCharacterType, getCharacterStage } from "@/lib/character";
import { calculateSynergyMultiplier } from "@/lib/gamification/synergy";
import { rollForLootRarity } from "@/lib/gamification/rng";
import { isMilestoneLevel, determineEvolutionBranch } from "@/lib/gamification/progression";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTasks() {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getUserStats() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: userData, error } = await supabase
    .from('user')
    .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, archetype')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error("getUserStats error:", error);
  }

  if (!userData) return null;

  const { strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp } = userData;

  const stats = {
    strength: strength_xp ?? 0,
    intellect: intellect_xp ?? 0,
    discipline: discipline_xp ?? 0,
    charisma: charisma_xp ?? 0,
    creativity: creativity_xp ?? 0,
    spirituality: spirituality_xp ?? 0,
  };

  const totalXP = (strength_xp ?? 0) + (intellect_xp ?? 0) + (discipline_xp ?? 0) + 
                  (charisma_xp ?? 0) + (creativity_xp ?? 0) + (spirituality_xp ?? 0);
  
  const level = Math.floor(totalXP / 60) + 1;
  const xpInCurrentLevel = totalXP % 60;
  const xpProgress = Math.floor((xpInCurrentLevel / 60) * 100);

  return {
    stats,
    level,
    xpProgress,
    characterType: getCharacterType(stats, level),
    characterStage: getCharacterStage(level),
  };
}

export async function getTaskAnalysis(task: TaskInput): Promise<TaskAnalysis> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  return classifyTaskStats(task);
}

export async function createTask(
  content: string,
  options?: {
    description?: string;
    due_date?: string;
    parent_task_id?: string;
    xp_reward?: number;
    priority?: "low" | "medium" | "high";
    difficulty?: "low" | "medium" | "high";
  }
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const analysis = await classifyTaskStats({
    content,
    description: options?.description,
    priority: options?.priority,
    difficulty: options?.difficulty,
  });

  const supabase = await createClient();
  const { data } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority: analysis.priority,
      difficulty: analysis.difficulty,
      status: "todo",
      description: options?.description ?? null,
      due_date: options?.due_date ?? null,
      parent_task_id: options?.parent_task_id ?? null,
      xp_reward: options?.xp_reward ?? null,
      str_weight: analysis.statWeights.str,
      int_weight: analysis.statWeights.int,
      dis_weight: analysis.statWeights.dis,
      cha_weight: analysis.statWeights.cha,
      cre_weight: analysis.statWeights.cre,
      spi_weight: analysis.statWeights.spi,
    })
    .select('id')
    .single();

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  return data?.id ?? null;
}

export async function createTasksFromPrompt(prompt: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const localTime = new Date().toLocaleString("en-US", { timeZoneName: "short" });
  const extractedTasks = await extractTasksFromPrompt(prompt, localTime);

  const supabase = await createClient();
  const createdTaskIds: string[] = [];

  for (const extracted of extractedTasks) {
    // 1. Get stats for this specific extracted task
    const analysis = await classifyTaskStats({
      content: extracted.content,
      description: extracted.description,
      priority: extracted.priority,
      difficulty: extracted.difficulty,
    });

    // 2. Insert the parent task
    const { data: parentTask, error: parentError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        content: extracted.content,
        description: extracted.description ?? null,
        priority: extracted.priority,
        difficulty: extracted.difficulty,
        status: "todo",
        due_date: extracted.due_date ?? null,
        str_weight: analysis.statWeights.str,
        int_weight: analysis.statWeights.int,
        dis_weight: analysis.statWeights.dis,
        cha_weight: analysis.statWeights.cha,
        cre_weight: analysis.statWeights.cre,
        spi_weight: analysis.statWeights.spi,
      })
      .select('id')
      .single();

    if (parentError || !parentTask) {
      console.error("Failed to create extracted task:", parentError);
      continue;
    }

    createdTaskIds.push(parentTask.id);

    // 3. Insert any subtasks
    if (extracted.subtasks && extracted.subtasks.length > 0) {
      for (const subtaskContent of extracted.subtasks) {
        // Simple fallback weights for subtasks, or we could run AI classification again
        // To save time/tokens, we just use a default or keyword fallback for subtasks
        
        await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            content: subtaskContent,
            priority: "medium",
            difficulty: "medium",
            status: "todo",
            parent_task_id: parentTask.id,
            // default weights for subtasks to not inflate XP too much
            str_weight: 0, int_weight: 0, dis_weight: 1, cha_weight: 0, cre_weight: 0, spi_weight: 0
          });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  return createdTaskIds;
}

export async function updateTask(
  taskId: string,
  fields: {
    content?: string;
    description?: string | null;
    due_date?: string | null;
    priority?: "low" | "medium" | "high";
    difficulty?: "low" | "medium" | "high";
    xp_reward?: number | null;
  }
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createSubtask(parentId: string, content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: parent } = await supabase
    .from('tasks')
    .select('id, parent_task_id')
    .eq('id', parentId)
    .eq('user_id', user.id)
    .single();

  if (!parent) throw new Error("Parent task not found");
  if (parent.parent_task_id !== null) throw new Error("Cannot create subtask of a subtask");

  const analysis = await classifyTaskStats({ content });

  const { data } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority: "medium",
      difficulty: "medium",
      status: "todo",
      parent_task_id: parentId,
      str_weight: analysis.statWeights.str,
      int_weight: analysis.statWeights.int,
      dis_weight: analysis.statWeights.dis,
      cha_weight: analysis.statWeights.cha,
      cre_weight: analysis.statWeights.cre,
      spi_weight: analysis.statWeights.spi,
    })
    .select('id')
    .single();

  revalidatePath("/tasks");
  return data?.id ?? null;
}

export async function toggleTaskStatus(taskId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single();

  if (!task) throw new Error("Task not found");

  const newStatus = task.status === "completed" ? "todo" : "completed";

  const now = new Date().toISOString();

  await supabase
    .from('tasks')
    .update({
      status: newStatus,
      completed_at: newStatus === "completed" ? now : null,
      updated_at: now,
    })
    .eq('id', taskId);

  // Auto-complete all incomplete subtasks when a parent is completed
  if (newStatus === "completed" && !task.parent_task_id) {
    await supabase
      .from('tasks')
      .update({ status: "completed", completed_at: now, updated_at: now })
      .eq('parent_task_id', taskId)
      .eq('user_id', user.id)
      .neq('status', 'completed');
  }

  if (newStatus === "completed") {
    // 1. Fetch User Data First for Synergy and Difficulty bounds
    const { data: userData, error } = await supabase
      .from('user')
      .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, archetype')
      .eq('id', user.id)
      .single();
        
    const { data: diffData } = await supabase
      .from('difficulty_adjustments')
      .select('base_multiplier')
      .eq('user_id', user.id)
      .single();

    const userMultiplierBounds = diffData?.base_multiplier || 1.0;

    const statsObj = {
      strength_xp: userData?.strength_xp ?? 0,
      intellect_xp: userData?.intellect_xp ?? 0,
      discipline_xp: userData?.discipline_xp ?? 0,
      charisma_xp: userData?.charisma_xp ?? 0,
      creativity_xp: userData?.creativity_xp ?? 0,
      spirituality_xp: userData?.spirituality_xp ?? 0,
    };

    const weightsObj = {
      str_weight: task.str_weight ?? 0,
      int_weight: task.int_weight ?? 0,
      dis_weight: task.dis_weight ?? 0,
      cha_weight: task.cha_weight ?? 0,
      cre_weight: task.cre_weight ?? 0,
      spi_weight: task.spi_weight ?? 0,
    };

    // 2. XP Formula
    const baseDifficultyMult = task.difficulty === "high" ? 2 : task.difficulty === "medium" ? 1.5 : 1;
    const synergyMult = calculateSynergyMultiplier(weightsObj, statsObj);
    const difficultyMultiplier = baseDifficultyMult * userMultiplierBounds * synergyMult;

    const gains: Record<string, number> = {
      strength_xp: 0, intellect_xp: 0, discipline_xp: 0,
      charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0,
    };

    if (task.xp_reward != null) {
      // Awarded XP directly if provided - distribute proportionally to weights
      const totalWeight = (task.str_weight ?? 0) + (task.int_weight ?? 0) + (task.dis_weight ?? 0) +
                          (task.cha_weight ?? 0) + (task.cre_weight ?? 0) + (task.spi_weight ?? 0);
      
      const awardedXP = task.xp_reward * difficultyMultiplier;

      if (totalWeight > 0) {
        gains.strength_xp = Math.round((task.str_weight ?? 0) / totalWeight * awardedXP);
        gains.intellect_xp = Math.round((task.int_weight ?? 0) / totalWeight * awardedXP);
        gains.discipline_xp = Math.round((task.dis_weight ?? 0) / totalWeight * awardedXP);
        gains.charisma_xp = Math.round((task.cha_weight ?? 0) / totalWeight * awardedXP);
        gains.creativity_xp = Math.round((task.cre_weight ?? 0) / totalWeight * awardedXP);
        gains.spirituality_xp = Math.round((task.spi_weight ?? 0) / totalWeight * awardedXP);
      } else {
        // Default to discipline if no weights
        gains.discipline_xp = awardedXP;
      }
    } else {
      // calculated from stat weights * difficulty multiplier
      gains.strength_xp = Math.round((task.str_weight ?? 0) * difficultyMultiplier);
      gains.intellect_xp = Math.round((task.int_weight ?? 0) * difficultyMultiplier);
      gains.discipline_xp = Math.round((task.dis_weight ?? 0) * difficultyMultiplier);
      gains.charisma_xp = Math.round((task.cha_weight ?? 0) * difficultyMultiplier);
      gains.creativity_xp = Math.round((task.cre_weight ?? 0) * difficultyMultiplier);
      gains.spirituality_xp = Math.round((task.spi_weight ?? 0) * difficultyMultiplier);
    }

    // Ensure at least 1 discipline XP if all gains are 0
    if (Object.values(gains).every(v => v === 0)) {
      gains.discipline_xp = 1 * Math.max(1, Math.round(difficultyMultiplier));
    }
      
    if (error) {
      console.error("toggleTaskStatus stat fetch error:", error);
    }

    if (userData) {
      const getLevel = (xp: number) => Math.floor(xp / 60) + 1;
      
      const oldXp = (userData.strength_xp ?? 0) + (userData.intellect_xp ?? 0) + (userData.discipline_xp ?? 0) + 
                    (userData.charisma_xp ?? 0) + (userData.creativity_xp ?? 0) + (userData.spirituality_xp ?? 0);
      const oldLevel = getLevel(oldXp);

      const newStats = {
        strength_xp:    (userData.strength_xp    ?? 0) + gains.strength_xp,
        intellect_xp:   (userData.intellect_xp   ?? 0) + gains.intellect_xp,
        discipline_xp:  (userData.discipline_xp  ?? 0) + gains.discipline_xp,
        charisma_xp:    (userData.charisma_xp    ?? 0) + gains.charisma_xp,
        creativity_xp:  (userData.creativity_xp  ?? 0) + gains.creativity_xp,
        spirituality_xp:(userData.spirituality_xp ?? 0) + gains.spirituality_xp,
      };

      const newXp = newStats.strength_xp + newStats.intellect_xp + newStats.discipline_xp + 
                    newStats.charisma_xp + newStats.creativity_xp + newStats.spirituality_xp;
      const newLevel = getLevel(newXp);

      // Check for character type change at milestone levels (5, 10, 20...)
      let newArchetype = userData.archetype;
      
      if (isMilestoneLevel(newLevel)) {
        const statsObj = {
          strength_xp: newStats.strength_xp,
          intellect_xp: newStats.intellect_xp,
          discipline_xp: newStats.discipline_xp,
          charisma_xp: newStats.charisma_xp,
          creativity_xp: newStats.creativity_xp,
          spirituality_xp: newStats.spirituality_xp,
        };
        const branch = determineEvolutionBranch(statsObj);
        // Only evolve if the branch logic returns a distinct class, or just assign it
        // We fallback to standard getCharacterType if it's 'polymath' or 'novice' to keep existing logic
        if (branch !== 'polymath' && branch !== 'novice') {
            newArchetype = branch;
        } else {
            newArchetype = getCharacterType({
              strength: newStats.strength_xp,
              intellect: newStats.intellect_xp,
              discipline: newStats.discipline_xp,
              charisma: newStats.charisma_xp,
              creativity: newStats.creativity_xp,
              spirituality: newStats.spirituality_xp,
            }, newLevel);
        }
      } else if (newLevel >= 5 && userData.archetype === 'novice') {
        const statsObj = {
          strength: newStats.strength_xp,
          intellect: newStats.intellect_xp,
          discipline: newStats.discipline_xp,
          charisma: newStats.charisma_xp,
          creativity: newStats.creativity_xp,
          spirituality: newStats.spirituality_xp,
        };
        newArchetype = getCharacterType(statsObj, newLevel);
      }

      const { error: updateError } = await supabase
        .from('user')
        .update({
          ...newStats,
          archetype: newArchetype,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error("toggleTaskStatus user update error:", updateError);
      }

      // Log events
      const gainsSummary = Object.entries(gains)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `+${v} ${k.replace('_xp', '')}`)
        .join(', ');

      await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          content: `Completed task: ${task.content} (${gainsSummary})`,
          activity_type: "Task",
          difficulty: task.difficulty,
          discipline_gain: gains.discipline_xp,
        });

      if (newLevel > oldLevel) {
        await supabase
          .from('logs')
          .insert({
            user_id: user.id,
            content: `LEVEL UP! You reached Level ${newLevel}.`,
            activity_type: "System",
          });
      }

      // 3. RNG Loot Roll
      let lootMessage = "";
      const isBossTask = task.boss_id !== null && task.boss_id !== undefined;
      const lootRoll = rollForLootRarity(isBossTask ? 2.0 : 1.0);
      
      if (lootRoll !== 'none') {
          lootMessage = ` Found Loot: ${lootRoll.toUpperCase()} drop!`;
          // Future phase: insert physical item row to `inventory`
          // e.g. await supabase.from('inventory').insert({...});
      }

      if (lootMessage !== "") {
          await supabase
            .from('logs')
            .insert({
              user_id: user.id,
              content: lootMessage.trim(),
              activity_type: "System",
            });
      }

      // 4. Boss Logic (Optional Phase 2)
      if (isBossTask) {
        const taskDamage = task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10;
        const { data: bossRow } = await supabase
          .from('bosses')
          .select('hp_current, hp_total, status')
          .eq('id', task.boss_id)
          .single();
        if (bossRow && bossRow.hp_current > 0) {
          const newHp = Math.max(0, bossRow.hp_current - taskDamage);
          const newStatus = newHp === 0 ? 'defeated' : bossRow.status;
          await supabase
            .from('bosses')
            .update({ hp_current: newHp, status: newStatus })
            .eq('id', task.boss_id);
          if (newHp === 0) {
            await supabase.from('logs').insert({
              user_id: user.id,
              content: `Boss Defeated! All linked tasks complete.`,
              activity_type: 'System',
            });
          }
        }
      }

      if (newArchetype !== userData.archetype) {
        await supabase
          .from('logs')
          .insert({
            user_id: user.id,
            content: `CHARACTER EVOLUTION! You are now a ${newArchetype.toUpperCase()}.`,
            activity_type: "System",
          });
      }
      
      let levelUp = null;
      if (newLevel > oldLevel || newArchetype !== userData.archetype) {
        levelUp = {
          oldLevel,
          newLevel,
          oldArchetype: userData.archetype,
          newArchetype,
          isEvolution: newArchetype !== userData.archetype,
        };
      }
      
      revalidatePath("/dashboard");
      revalidatePath("/tasks");
      
      return { gains, levelUp };
    }
    
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    
    return { gains, levelUp: null };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { gains: null, levelUp: null };
}
