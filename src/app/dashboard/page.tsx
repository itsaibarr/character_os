"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserStats } from "../actions/tasks";
import { CharacterType, CharacterStage } from "@/lib/character";
import StatGrid from "@/components/dashboard/StatGrid";
import AppSidebar from "@/components/AppSidebar";
import CharacterDisplay from "@/components/dashboard/CharacterDisplay";
import DashboardCommandWrapper from "@/components/dashboard/DashboardCommandWrapper";
import TaskStackWrapper from "@/components/dashboard/TaskStackWrapper";


interface UserStats {
  stats: {
    strength: number;
    intellect: number;
    discipline: number;
    charisma: number;
    creativity: number;
    spirituality: number;
  };
  level: number;
  xpProgress: number;
  characterType: CharacterType;
  characterStage: CharacterStage;
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        redirect("/sign-in");
        return;
      }

      setUserEmail(user.email || "");

      const stats = await getUserStats();
      if (!stats) {
        redirect("/onboarding");
        return;
      }
      setUserStats(stats);

      setLoading(false);
    }

    loadData();
  }, []);

  const refreshStats = async () => {
    const stats = await getUserStats();
    if (stats) {
      setUserStats(stats);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas ml-12 flex items-center justify-center">
        <div className="animate-pulse text-faint text-sm font-medium">Loading...</div>
      </div>
    );
  }

  if (!userStats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted">
      <AppSidebar userEmail={userEmail} />

      <main className="ml-12 px-8 py-10 h-screen flex flex-col">
        {/* Two-column layout — fills the full screen width */}
        <div className="flex gap-10 items-start flex-1 min-h-0">
          {/* Left: character banner + command + stat grid + nav — fixed width */}
          <div className="w-[540px] shrink-0 flex flex-col gap-8">
            <CharacterDisplay
              characterType={userStats.characterType}
              characterStage={userStats.characterStage}
              level={userStats.level}
              xpProgress={userStats.xpProgress}
              stats={userStats.stats}
            />
            <DashboardCommandWrapper onTaskCreated={() => {
              setTaskRefreshKey(k => k + 1);
              refreshStats();
            }} />
            <StatGrid
              stats={userStats.stats}
              level={userStats.level}
              xpProgress={userStats.xpProgress}
            />
            <div className="flex items-center space-x-4">
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
            </div>
          </div>

          {/* Right: active commands — fills all remaining width, scrolls independently */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 h-full">
            <h2 className="text-xs font-black text-faint uppercase tracking-widest mb-3 shrink-0">Active Commands</h2>
            <div className="flex-1 overflow-y-auto">
              <TaskStackWrapper
                refreshKey={taskRefreshKey}
                onStatusToggled={refreshStats}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
