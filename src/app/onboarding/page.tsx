import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
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
  
  // Optional: Check if already onboarded and redirect to dashboard
  /*
  const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
  });
  if (user?.onboardingCompleted) {
      redirect("/dashboard");
  }
  */

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center py-12">
      <OnboardingForm />
    </div>
  );
}
