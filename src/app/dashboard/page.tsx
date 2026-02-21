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

import GamificationHub from "@/components/dashboard/GamificationHub";

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
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="animate-pulse text-faint text-sm font-medium">Loading...</div>
      </div>
    );
  }

  if (!userStats) return null;

  return (
    <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted">
      <AppSidebar userEmail={userEmail} />

      <main className="ml-12 px-6 py-6 h-screen overflow-hidden">
        <div className="flex gap-6 items-start h-full">

          {/* LEFT: Character + Command + Stats */}
          <div className="w-[400px] shrink-0 flex flex-col gap-4 overflow-y-auto h-full pb-6">
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
            <div className="flex items-center gap-3">
              <Link
                href="/tasks"
                className="px-3 py-1.5 text-xs font-bold text-accent bg-white border border-accent rounded-sm hover:bg-accent hover:text-white transition-colors"
              >
                View All Tasks
              </Link>
              <Link
                href="/radar"
                className="px-3 py-1.5 text-xs font-bold text-accent bg-white border border-accent rounded-sm hover:bg-accent hover:text-white transition-colors"
              >
                View Full Radar
              </Link>
            </div>
          </div>

          {/* CENTER: Active Tasks */}
          <div className="flex-1 min-w-0 flex flex-col h-full pb-6">
            <h2 className="text-[10px] font-black text-faint uppercase tracking-widest mb-3 shrink-0">Active Commands</h2>
            <div className="flex-1 overflow-y-auto">
              <TaskStackWrapper
                refreshKey={taskRefreshKey}
                onStatusToggled={refreshStats}
              />
            </div>
          </div>

          {/* RIGHT: Gamification */}
          <div className="w-[320px] shrink-0 h-full overflow-y-auto pb-6">
            <GamificationHub onStatChange={refreshStats} />
          </div>

        </div>
      </main>
    </div>
  );
}
