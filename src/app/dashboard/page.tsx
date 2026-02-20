import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserStats } from "../actions/tasks";
import StatGrid from "@/components/dashboard/StatGrid";
import AppHeader from "@/components/AppHeader";
import CharacterDisplay from "@/components/dashboard/CharacterDisplay";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const userStats = await getUserStats();

  if (!userStats) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
      <AppHeader userEmail={user.email!} currentPath="/dashboard" />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <section>
          <CharacterDisplay
            characterType={userStats.characterType}
            characterStage={userStats.characterStage}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
            stats={userStats.stats}
          />
        </section>

        <section>
          <StatGrid
            stats={userStats.stats}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
          />
        </section>
      </main>
    </div>
  );
}
