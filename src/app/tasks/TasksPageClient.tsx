"use client";

import { useState, useOptimistic, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Inbox, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import TaskList from "@/components/tasks/TaskList";
import TaskDetail from "@/components/tasks/TaskDetail";
import LevelUpModal, { LevelUpData } from "@/components/dashboard/LevelUpModal";
import LootDropAlert, { type LootItem } from "@/components/dashboard/gamification/LootDropAlert";
import { getUserStats } from "@/app/actions/tasks";
import type { UserStats } from "@/lib/gamification/synergy";
import ParseTextButton from "@/components/tasks/ParseTextButton";

interface Task {
  id: string;
  content: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  due_date: string | null;
  parent_task_id: string | null;
  xp_reward: number | null;
  str_weight?: number | null;
  int_weight?: number | null;
  dis_weight?: number | null;
  cha_weight?: number | null;
  cre_weight?: number | null;
  spi_weight?: number | null;
}

interface ToggleResult {
  gains: Record<string, number> | null;
  levelUp: LevelUpData | null;
  lootDrop?: { itemId: string; itemName: string; rarity: string; description: string } | null;
  bossReward?: { bonusXp: number; lootDrop: { itemId: string; itemName: string; rarity: string; description: string } | null } | null;
  synergyMultiplier?: number;
  buffMultiplier?: number;
}

interface TasksPageClientProps {
  initialTasks: Task[];
  onToggleStatus: (taskId: string) => Promise<ToggleResult | void>;
}

type FilterMode = "inbox" | "today" | "completed";

function formatXpToast(
  gains: Record<string, number>,
  synergyMultiplier?: number,
  buffMultiplier?: number,
): { title: string; description: string } {
  const parts = Object.entries(gains)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => `+${value} ${key.replace('_xp', '').toUpperCase()}`);

  const modifiers: string[] = [];
  if (synergyMultiplier && synergyMultiplier > 1) {
    modifiers.push(`⚡${synergyMultiplier}x synergy`);
  }
  if (buffMultiplier && buffMultiplier > 1) {
    modifiers.push(`🧪${buffMultiplier}x buff`);
  }

  const description = modifiers.length > 0
    ? `Task completed · ${modifiers.join(' · ')}`
    : "Task completed";

  return { title: parts.join(', '), description };
}

export default function TasksPageClient({ initialTasks, onToggleStatus }: TasksPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const selectedTaskId = searchParams.get("selected");
  const urlFilter = (searchParams.get("filter") as FilterMode) || "inbox";

  const [filter, setFilter] = useState<FilterMode>(urlFilter);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  const [lootDrop, setLootDrop] = useState<LootItem | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Fetch user stats for synergy badge calculation
  useEffect(() => {
    getUserStats().then((data) => {
      if (data) {
        setUserStats({
          strength_xp: data.stats.strength,
          intellect_xp: data.stats.intellect,
          discipline_xp: data.stats.discipline,
          charisma_xp: data.stats.charisma,
          creativity_xp: data.stats.creativity,
          spirituality_xp: data.stats.spirituality,
        });
      }
    });
  }, []);

  // Sync state to URL without navigation jumps
  useEffect(() => {
    if (filter !== urlFilter) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("filter", filter);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [filter, urlFilter, pathname, router, searchParams]);

  const setSelectedTaskId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("selected", id);
    else params.delete("selected");
    params.set("filter", filter); // preserve filter
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [, startTransition] = useTransition();

  const [optimisticTasks, addOptimistic] = useOptimistic(
    initialTasks,
    (current: Task[], taskId: string) =>
      current.map(t => t.id === taskId ? { ...t, status: t.status === "completed" ? "todo" : "completed" } : t)
  );

  const handleToggle = (taskId: string) => {
    startTransition(async () => {
      addOptimistic(taskId);
      const result = await onToggleStatus(taskId);
      
      if (result && result.gains) {
        const gainedStats = Object.entries(result.gains).filter(([, v]) => v > 0);

        if (gainedStats.length > 0) {
          const { title, description } = formatXpToast(
            result.gains,
            result.synergyMultiplier,
            result.buffMultiplier,
          );
          toast.success(title, { description, icon: "✨" });
        }

        // Show loot drop alert
        const drop = result.lootDrop ?? result.bossReward?.lootDrop;
        if (drop) {
          setLootDrop({
            id: drop.itemId,
            name: drop.itemName,
            rarity: drop.rarity as LootItem["rarity"],
            effectType: "xp_boost",
          });
        }
      }
      
      if (result && result.levelUp) {
        setLevelUpData(result.levelUp);
      }

      // Refresh user stats after XP change for synergy recalculation
      getUserStats().then((data) => {
        if (data) {
          setUserStats({
            strength_xp: data.stats.strength,
            intellect_xp: data.stats.intellect,
            discipline_xp: data.stats.discipline,
            charisma_xp: data.stats.charisma,
            creativity_xp: data.stats.creativity,
            spirituality_xp: data.stats.spirituality,
          });
        }
      });
    });
  };

  const selectedTask = optimisticTasks.find(t => t.id === selectedTaskId) ?? null;
  const selectedSubtasks = selectedTask ? optimisticTasks.filter(t => t.parent_task_id === selectedTask.id) : [];

  const inboxCount = optimisticTasks.filter(t => !t.parent_task_id && t.status !== "completed").length;
  
  const todayCount = optimisticTasks.filter(t => {
    if (t.parent_task_id || t.status === "completed" || !t.due_date) return false;
    const due = new Date(t.due_date);
    const today = new Date();
    return due.setHours(0,0,0,0) <= today.setHours(0,0,0,0);
  }).length;

  const filters = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: inboxCount, color: "text-blue-500" },
    { id: "today", label: "Today", icon: Calendar, count: todayCount, color: "text-amber-500" },
    { id: "completed", label: "Completed", icon: CheckCircle2, count: null, color: "text-emerald-500" },
  ] as const;

  const filteredTasks = optimisticTasks.filter(task => {
    if (filter === "inbox") {
      return !task.parent_task_id && task.status !== "completed";
    } else if (filter === "today") {
      if (task.parent_task_id || task.status === "completed" || !task.due_date) return false;
      const due = new Date(task.due_date);
      const today = new Date();
      return due.setHours(0,0,0,0) <= today.setHours(0,0,0,0);
    } else if (filter === "completed") {
      return task.status === "completed";
    }
    return true;
  });

  return (
    <div className="flex-1 h-full w-full overflow-hidden bg-canvas">
      <div className="max-w-7xl mx-auto h-full flex relative">
        {/* Sidebar */}
        <div className="w-[220px] shrink-0 flex flex-col py-10 pr-6">
          <nav className="space-y-0.5">
            {filters.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all relative group",
                    active
                      ? "text-accent"
                      : "text-muted hover:bg-slate-100/80 hover:text-text"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="active-task-filter"
                      className="absolute inset-0 bg-accent-muted/60 border border-accent/15 rounded-lg"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <f.icon className={clsx("w-4 h-4", active ? f.color : "text-slate-400 group-hover:text-slate-600")} />
                    <span>{f.label}</span>
                  </div>
                  {f.count !== null && (
                    <span className={clsx(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full relative z-10 transition-colors",
                      active ? "bg-accent-muted text-accent" : "bg-slate-100 text-muted group-hover:bg-slate-200"
                    )}>
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-10 py-10">
              <header className="mb-10 flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tight text-text capitalize">
                  {filter}
                </h1>
                <ParseTextButton onTasksAdded={() => router.refresh()} />
              </header>

              <TaskList 
                tasks={filteredTasks} 
                filter={filter}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onToggleStatus={handleToggle}
                userStats={userStats}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetail
            task={selectedTask}
            subtasks={selectedSubtasks}
            onClose={() => setSelectedTaskId(null)}
            onDeleted={() => setSelectedTaskId(null)}
            onToggleStatus={handleToggle}
          />
        )}
      </AnimatePresence>

      <LevelUpModal 
        data={levelUpData} 
        onClose={() => setLevelUpData(null)} 
      />

      <LootDropAlert
        item={lootDrop}
        onDismiss={() => setLootDrop(null)}
      />
    </div>
  );
}
