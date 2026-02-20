"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { classifyTaskStats } from "@/lib/ai";
import { getCharacterType, getCharacterStage } from "@/lib/character";

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
  const { data: userData } = await supabase
    .from('user')
    .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
    .eq('id', user.id)
    .single();

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

  const level = Math.floor((
    (strength_xp ?? 0) + 
    (intellect_xp ?? 0) + 
    (discipline_xp ?? 0) + 
    (charisma_xp ?? 0) + 
    (creativity_xp ?? 0) + 
    (spirituality_xp ?? 0)
  ) / 60) + 1;

  return {
    stats,
    level,
    xpProgress: Math.min(
      100,
      ((strength_xp ?? 0) % 10 + (intellect_xp ?? 0) % 10 + (discipline_xp ?? 0) % 10) * 3
    ),
    characterType: getCharacterType(stats, level),
    characterStage: getCharacterStage(level),
  };
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

  let priority: "low" | "medium" | "high" = options?.priority ?? "medium";
  let difficulty: "low" | "medium" | "high" = options?.difficulty ?? "medium";

  if (!options?.priority) {
    if (content.toLowerCase().includes("urgent") || content.toLowerCase().includes("asap")) priority = "high";
  }
  if (!options?.difficulty) {
    if (content.toLowerCase().includes("easy") || content.toLowerCase().includes("quick")) difficulty = "low";
    if (content.toLowerCase().includes("hard") || content.toLowerCase().includes("complex")) difficulty = "high";
  }

  const weights = await classifyTaskStats(content);

  const supabase = await createClient();
  const { data } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority,
      difficulty,
      status: "todo",
      description: options?.description ?? null,
      due_date: options?.due_date ?? null,
      parent_task_id: options?.parent_task_id ?? null,
      xp_reward: options?.xp_reward ?? null,
      str_weight: weights.str,
      int_weight: weights.int,
      dis_weight: weights.dis,
      cha_weight: weights.cha,
      cre_weight: weights.cre,
      spi_weight: weights.spi,
    })
    .select('id')
    .single();

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  return data?.id ?? null;
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

  const weights = await classifyTaskStats(content);

  const { data } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority: "medium",
      difficulty: "medium",
      status: "todo",
      parent_task_id: parentId,
      str_weight: weights.str,
      int_weight: weights.int,
      dis_weight: weights.dis,
      cha_weight: weights.cha,
      cre_weight: weights.cre,
      spi_weight: weights.spi,
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

  await supabase
    .from('tasks')
    .update({
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (newStatus === "completed") {
    const difficultyMultiplier = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;

    let gains: Record<string, number>;

    if (task.xp_reward != null) {
      gains = {
        strength_xp: 0, intellect_xp: 0, discipline_xp: task.xp_reward,
        charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0,
      };
    } else {
      gains = {
        strength_xp:    (task.str_weight ?? 0) * difficultyMultiplier,
        intellect_xp:   (task.int_weight ?? 0) * difficultyMultiplier,
        discipline_xp:  (task.dis_weight ?? 0) * difficultyMultiplier,
        charisma_xp:    (task.cha_weight ?? 0) * difficultyMultiplier,
        creativity_xp:  (task.cre_weight ?? 0) * difficultyMultiplier,
        spirituality_xp:(task.spi_weight ?? 0) * difficultyMultiplier,
      };
    }

    if (Object.values(gains).every(v => v === 0)) {
      gains.discipline_xp = 1;
    }

    const { data: userData } = await supabase
      .from('user')
      .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
      .eq('id', user.id)
      .single();

    if (userData) {
      await supabase
        .from('user')
        .update({
          strength_xp:    (userData.strength_xp    ?? 0) + gains.strength_xp,
          intellect_xp:   (userData.intellect_xp   ?? 0) + gains.intellect_xp,
          discipline_xp:  (userData.discipline_xp  ?? 0) + gains.discipline_xp,
          charisma_xp:    (userData.charisma_xp    ?? 0) + gains.charisma_xp,
          creativity_xp:  (userData.creativity_xp  ?? 0) + gains.creativity_xp,
          spirituality_xp:(userData.spirituality_xp ?? 0) + gains.spirituality_xp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

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
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}
