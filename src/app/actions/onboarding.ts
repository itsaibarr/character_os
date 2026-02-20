"use server";

import { db } from "@/lib/db";
import { user as userTable, userAnalytics } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(data: {
  focusAreas: string[];
  archetype: string;
  frictionProfile: string;
  dailyCapacity: string;
  feedbackPreference: string;
  trackingTools: string[];
  acquisitionSource: string;
  triggerReason: string;
  mainGoal: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const weights = {
    strength: 1, intellect: 1, discipline: 1,
    charisma: 1, creativity: 1, spirituality: 1
  };

  if (data.archetype === 'Builder') { weights.intellect += 1; weights.creativity += 1; }
  if (data.archetype === 'Athlete') { weights.strength += 2; }
  if (data.archetype === 'Scholar') { weights.intellect += 2; }
  if (data.archetype === 'Leader') { weights.charisma += 1; weights.discipline += 1; }
  if (data.archetype === 'Operator') { weights.discipline += 2; }

  if (data.focusAreas.includes('Health')) weights.strength += 1;
  if (data.focusAreas.includes('Academic')) weights.intellect += 1;
  if (data.focusAreas.includes('Startup')) weights.intellect += 1;
  if (data.focusAreas.includes('Focus')) weights.discipline += 1;
  if (data.focusAreas.includes('Communication')) weights.charisma += 1;
  if (data.focusAreas.includes('Personal Projects')) weights.creativity += 1;

  await db.update(userTable)
    .set({
      archetype: data.archetype,
      statWeights: weights,
      frictionProfile: data.frictionProfile,
      dailyCapacity: data.dailyCapacity,
      feedbackPreference: data.feedbackPreference,
      mainGoal: data.mainGoal,
      onboardingCompleted: true,
      updatedAt: new Date()
    })
    .where(eq(userTable.id, user.id));

  await db.insert(userAnalytics).values({
    userId: user.id,
    focusAreas: data.focusAreas,
    frustrations: [data.frictionProfile],
    focusedHours: data.dailyCapacity,
    motivationPreference: data.feedbackPreference,
    trackingTools: data.trackingTools,
    acquisitionSource: data.acquisitionSource,
    triggerReason: data.triggerReason,
    initialGoal: data.mainGoal,
  });

  redirect("/dashboard");
}
