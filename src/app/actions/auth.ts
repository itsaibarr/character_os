"use server";

import { createClient } from "@/utils/supabase/server";

export async function getOnboardingRedirect(): Promise<"/dashboard" | "/onboarding"> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "/onboarding";

  const { data: userData } = await supabase
    .from('user')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  return userData?.onboarding_completed ? "/dashboard" : "/onboarding";
}
