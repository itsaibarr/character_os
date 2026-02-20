"use server";

import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";

export async function getOnboardingRedirect(): Promise<"/dashboard" | "/onboarding"> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "/onboarding";

  const [dbUser] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  return dbUser?.onboardingCompleted ? "/dashboard" : "/onboarding";
}
