import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  // Check Supabase Session
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Check Better Auth Session
  const betterSession = await auth.api.getSession({
    headers: await headers()
  });

  if (!supabaseUser && !betterSession) {
    redirect("/sign-in");
  }
  
  const userId = supabaseUser?.id || betterSession?.user?.id;
  if (userId) {
    const [dbUser] = await db
      .select({ onboardingCompleted: userTable.onboardingCompleted })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    if (dbUser?.onboardingCompleted) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center py-12">
      <OnboardingForm />
    </div>
  );
}
