import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [dbUser] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  if (dbUser?.onboardingCompleted) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center py-12">
      <OnboardingForm />
    </div>
  );
}
