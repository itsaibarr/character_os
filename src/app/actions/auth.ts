"use server";

import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function getOnboardingRedirect(): Promise<"/dashboard" | "/onboarding"> {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  const betterSession = await auth.api.getSession({ headers: await headers() });

  const userId = supabaseUser?.id || betterSession?.user?.id;
  if (!userId) return "/onboarding";

  const [dbUser] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return dbUser?.onboardingCompleted ? "/dashboard" : "/onboarding";
}
