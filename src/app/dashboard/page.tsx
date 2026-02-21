"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserStats, getTasks, toggleTaskStatus } from "../actions/tasks";
import { CharacterType, CharacterStage } from "@/lib/character";
import StatGrid from "@/components/dashboard/StatGrid";
import AppSidebar from "@/components/AppSidebar";
import CharacterDisplay from "@/components/dashboard/CharacterDisplay";
import DashboardCommandWrapper from "@/components/dashboard/DashboardCommandWrapper";
import TaskStackWrapper from "@/components/dashboard/TaskStackWrapper";

interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

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
  const [tasks, setTasks] = useState<Task[]>([]);
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

      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks as Task[]);
      
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

  const handleToggleTask = async (taskId: string) => {
    await toggleTaskStatus(taskId);
    await refreshStats();
    setTaskRefreshKey(k => k + 1);
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
          <DashboardCommandWrapper onTaskCreated={() => {
            setTaskRefreshKey(k => k + 1);
            refreshStats();
          }} />
        </section>

        <section>
          <StatGrid
            stats={userStats.stats}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text mb-4">Active Commands</h2>
          <TaskStackWrapper 
            refreshKey={taskRefreshKey} 
            onStatusToggled={refreshStats}
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
