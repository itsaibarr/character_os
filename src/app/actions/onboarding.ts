"use server";

import { db } from "@/lib/db";
import { user as userTable, userAnalytics } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
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
  const reqHeaders = await headers();
  
  // Try Supabase Auth
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();
  
  // Try Better Auth
  const betterSession = await auth.api.getSession({
      headers: reqHeaders
  });

  const activeUser = supabaseUser || betterSession?.user;

  if (!activeUser) {
    throw new Error("Unauthorized");
  }

  const userId = activeUser.id;

  // Ensure user exists in our DB table if it's a Supabase user
  if (supabaseUser) {
    const [existingUser] = await db.select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

    if (!existingUser) {
        await db.insert(userTable).values({
            id: userId,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata.full_name || supabaseUser.email!.split('@')[0],
            emailVerified: !!supabaseUser.email_confirmed_at,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
  }
  
  // Calculate initial stat weights based on focus and archetype
  const weights = {
      strength: 1,
      intellect: 1,
      discipline: 1,
      charisma: 1,
      creativity: 1,
      spirituality: 1
  };
  
  // Archetype base modifiers
  if (data.archetype === 'Builder') { weights.intellect += 1; weights.creativity += 1; }
  if (data.archetype === 'Athlete') { weights.strength += 2; }
  if (data.archetype === 'Scholar') { weights.intellect += 2; }
  if (data.archetype === 'Leader') { weights.charisma += 1; weights.discipline += 1; }
  if (data.archetype === 'Operator') { weights.discipline += 2; }

  // Focus area modifiers
  if (data.focusAreas.includes('Health')) weights.strength += 1;
  if (data.focusAreas.includes('Academic')) weights.intellect += 1;
  if (data.focusAreas.includes('Startup')) weights.intellect += 1;
  if (data.focusAreas.includes('Focus')) weights.discipline += 1;
  if (data.focusAreas.includes('Communication')) weights.charisma += 1;
  if (data.focusAreas.includes('Personal Projects')) weights.creativity += 1;
  
  // Update User Profile
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
    .where(eq(userTable.id, userId));

  // Save Analytics Data
  await db.insert(userAnalytics).values({
    userId: userId,
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
