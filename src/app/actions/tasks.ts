"use server";

import { db } from "@/lib/db";
import { tasks as tasksTable, logs as logsTable, user as userTable } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTasks() {
  const user = await getUser();
  if (!user) return [];

  try {
    return await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.userId, user.id))
      .orderBy(desc(tasksTable.createdAt));
  } catch (error: any) {
    console.error("Drizzle Select Error in getTasks:", error);
    if (error.cause) console.error("Underlying Cause:", error.cause);
    throw error;
  }
}

export async function getUserStats() {
  const user = await getUser();
  if (!user) return null;

  const [userData] = await db.select()
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  if (!userData) return null;

  return {
    stats: {
      strength: userData.strengthXp || 0,
      intellect: userData.intellectXp || 0,
      discipline: userData.disciplineXp || 0,
      charisma: userData.charismaXp || 0,
      creativity: userData.creativityXp || 0,
      spirituality: userData.spiritualityXp || 0,
    },
    level: Math.floor((userData.strengthXp! + userData.intellectXp! + userData.disciplineXp! + userData.charismaXp! + userData.creativityXp! + userData.spiritualityXp!) / 60) + 1,
    xpProgress: Math.min(100, (userData.strengthXp! % 10 + userData.intellectXp! % 10 + userData.disciplineXp! % 10) * 3)
  };
}

export async function createTask(content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  let priority: "low" | "medium" | "high" = "medium";
  let difficulty: "low" | "medium" | "high" = "medium";

  if (content.toLowerCase().includes("urgent") || content.toLowerCase().includes("asap")) priority = "high";
  if (content.toLowerCase().includes("easy") || content.toLowerCase().includes("quick")) difficulty = "low";
  if (content.toLowerCase().includes("hard") || content.toLowerCase().includes("complex")) difficulty = "high";

  await db.insert(tasksTable).values({
    userId: user.id,
    content,
    priority,
    difficulty,
    status: "todo",
  });

  revalidatePath("/dashboard");
}

export async function toggleTaskStatus(taskId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const [task] = await db.select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, user.id)))
    .limit(1);

  if (!task) throw new Error("Task not found");

  const newStatus = task.status === "completed" ? "todo" : "completed";

  await db.update(tasksTable)
    .set({
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date() : null,
      updatedAt: new Date()
    })
    .where(eq(tasksTable.id, taskId));

  if (newStatus === "completed") {
    const xpAmount = task.difficulty === "high" ? 5 : (task.difficulty === "medium" ? 3 : 1);

    const [userData] = await db.select()
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1);

    if (userData) {
      await db.update(userTable)
        .set({
          disciplineXp: (userData.disciplineXp || 0) + xpAmount,
          updatedAt: new Date()
        })
        .where(eq(userTable.id, user.id));
    }

    await db.insert(logsTable).values({
      userId: user.id,
      content: `Completed task: ${task.content}`,
      activityType: "Task",
      difficulty: task.difficulty,
      disciplineGain: xpAmount,
    });
  }

  revalidatePath("/dashboard");
}
