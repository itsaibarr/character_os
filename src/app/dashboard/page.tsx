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

// Gamification Components
import WeeklyBossBoard from "@/components/dashboard/gamification/WeeklyBossBoard";
import AnalyticsHeatmap from "@/components/dashboard/gamification/AnalyticsHeatmap";
import EvolutionTree from "@/components/dashboard/gamification/EvolutionTree";
import LootDropAlert, { LootItem } from "@/components/dashboard/gamification/LootDropAlert";
import NPCChatWidget from "@/components/dashboard/gamification/NPCChatWidget";

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

  const [bossExpiresAt, setBossExpiresAt] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBossExpiresAt(new Date(Date.now() + 86400000 * 3).toISOString());
  }, []);

  // Mock states for Gamification UI
  const [heatmapData, setHeatmapData] = useState<{date: string, count: number}[]>([]);
  const [lootItem, setLootItem] = useState<LootItem | null>(null);
  const [bossAttacks, setBossAttacks] = useState([
    { id: "1", title: "Complete Physics Homework", damage: 15, completed: true },
    { id: "2", title: "Workout for 45 mins", damage: 20, completed: false },
    { id: "3", title: "Read 20 pages", damage: 10, completed: false }
  ]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string, sender: "user"|"npc", text: string, timestamp: string, isQuestAssigned?: boolean }>>([
    { id: "1", sender: "npc", text: "I noticed your Discipline is lagging this week. Let's fix that.", timestamp: "10:24 AM" },
    { id: "2", sender: "npc", text: "Complete 3 tasks consecutively.", timestamp: "10:25 AM", isQuestAssigned: true }
  ]);

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

      // Trigger a mock loot drop after 3 seconds for demo purposes
      setTimeout(() => {
        setLootItem({
          id: "mock_1",
          name: "Scroll of the Scholar",
          rarity: "rare",
          effectType: "xp_boost"
        });
      }, 3000);

      const mockHeatmap = Array.from({ length: 90 }).map((_, i) => ({
        date: new Date(Date.now() - (89 - i) * 86400000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 8)
      }));
      setHeatmapData(mockHeatmap);
    }

    loadData();
  }, []);

  const refreshStats = async () => {
    const stats = await getUserStats();
    if (stats) {
      setUserStats(stats);
    }
  };

  const handleBossAttackToggle = (id: string, completed: boolean) => {
    setBossAttacks(prev => prev.map(a => a.id === id ? { ...a, completed } : a));
  };

  const handleSendMessage = (text: string) => {
    setChatMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), sender: "user", text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    ]);
  };

  // Mock data for Evolution Tree
  const evolutionNodes = [
    { id: "e1", name: "Novice", levelReq: 1, condition: "Start Journey", isUnlocked: true, isActive: false },
    { id: "e2", name: "Scholar", levelReq: 15, condition: "INT Dominant (>40%)", isUnlocked: true, isActive: true },
    { id: "e3", name: "Inventor", levelReq: 30, condition: "INT + CRE Combo", isUnlocked: false, isActive: false }
  ];
  
  const currentBossHp = 100 - bossAttacks.reduce((acc, a) => acc + (a.completed ? a.damage : 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="animate-pulse text-faint text-sm font-medium">Loading...</div>
      </div>
    );
  }

  if (!userStats) return null;

  return (
    <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted pb-20">
      <AppSidebar userEmail={userEmail} />

      {/* Global Loot Drop Alert */}
      <LootDropAlert item={lootItem} onDismiss={() => setLootItem(null)} />

      {/* NPC Chat Widget */}
      <NPCChatWidget 
        npcName="Aura" 
        moodScore={85} 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
      />

      <main className="ml-12 px-8 py-10 flex flex-col gap-10">
        
        {/* TOP ROW: Character + Core Tasks */}
        <div className="flex gap-10 items-start">
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
                className="px-4 py-2 text-sm font-medium text-accent bg-white border border-accent rounded-sm hover:bg-accent hover:text-white transition-colors"
              >
                View All Tasks
              </Link>
              <Link
                href="/radar"
                className="px-4 py-2 text-sm font-medium text-accent bg-white border border-accent rounded-sm hover:bg-accent hover:text-white transition-colors"
              >
                View Full Radar
              </Link>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col max-h-[600px]">
            <h2 className="text-xs font-black text-faint uppercase tracking-widest mb-3 shrink-0">Active Commands</h2>
            <div className="flex-1 overflow-y-auto">
              <TaskStackWrapper
                refreshKey={taskRefreshKey}
                onStatusToggled={refreshStats}
              />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border my-2" />

        {/* BOTTOM ROW: Gamification Mechanics Elements */}
        <div>
           <h2 className="text-sm font-black text-text uppercase tracking-widest leading-none mb-6">
             Gamification Hub (Mock Data)
           </h2>
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              <div className="flex flex-col gap-8">
                {/* 1. Weekly Boss Board */}
                <WeeklyBossBoard 
                  boss={{
                    id: "boss_1",
                    title: "The Procrastination Behemoth",
                    description: "A manifestation of delayed physics homework and skipped gym sessions.",
                    hpTotal: 100,
                    hpCurrent: currentBossHp,
                    expiresAt: bossExpiresAt
                  }}
                  attacks={bossAttacks}
                  onAttackToggle={handleBossAttackToggle}
                />
                
                {/* 2. Evolution Tree */}
                <EvolutionTree nodes={evolutionNodes} />
              </div>

              <div className="flex flex-col gap-8">
                {/* 3. Analytics Heatmap */}
                <AnalyticsHeatmap data={heatmapData} days={90} />
              </div>

           </div>
        </div>

      </main>
    </div>
  );
}
