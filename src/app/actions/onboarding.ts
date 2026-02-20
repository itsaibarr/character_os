"use server";

import { createClient } from "@/utils/supabase/server";
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

  await supabase
    .from('user')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      archetype: data.archetype,
      stat_weights: weights,
      friction_profile: data.frictionProfile,
      daily_capacity: data.dailyCapacity,
      feedback_pref: data.feedbackPreference,
      main_goal: data.mainGoal,
      onboarding_completed: true,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', user.id);

  await supabase
    .from('user_analytics')
    .insert({
      user_id: user.id,
      focus_areas: data.focusAreas,
      frustrations: [data.frictionProfile],
      focused_hours: data.dailyCapacity,
      motivation_preference: data.feedbackPreference,
      tracking_tools: data.trackingTools,
      acquisition_source: data.acquisitionSource,
      trigger_reason: data.triggerReason,
      initial_goal: data.mainGoal,
    });

  redirect("/dashboard");
}
