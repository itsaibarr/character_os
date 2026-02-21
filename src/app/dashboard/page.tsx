import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserStats } from "../actions/tasks";
import StatGrid from "@/components/dashboard/StatGrid";
import AppSidebar from "@/components/AppSidebar";
import CharacterDisplay from "@/components/dashboard/CharacterDisplay";
import DashboardCommandWrapper from "@/components/dashboard/DashboardCommandWrapper";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const userStats = await getUserStats();

  if (!userStats) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted">
      <AppSidebar userEmail={user.email!} />

      <main className="ml-12 max-w-4xl mx-auto px-8 py-10 space-y-8">
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
          <DashboardCommandWrapper />
        </section>

        <section>
          <StatGrid
            stats={userStats.stats}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
          />
        </section>

        <section className="flex items-center justify-center space-x-4 pt-4">
          <Link
            href="/tasks"
            className="px-4 py-2 text-sm font-medium text-accent bg-white border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
          >
            View All Tasks
          </Link>
          <Link
            href="/radar"
            className="px-4 py-2 text-sm font-medium text-accent bg-white border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
          >
            View Full Radar
          </Link>
        </section>
      </main>
    </div>
  );
}
