"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import TaskStack from "@/components/dashboard/TaskStack";
import TaskDetail from "@/components/tasks/TaskDetail";
import LevelUpModal, { LevelUpData } from "@/components/dashboard/LevelUpModal";
import { getTasks, toggleTaskStatus } from "@/app/actions/tasks";
import { toast } from "sonner";

interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  parent_task_id: string | null;
  due_date: string | null;
  description: string | null;
  xp_reward: number | null;
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

interface TaskStackWrapperProps {
  refreshKey?: number;
  onStatusToggled?: () => void | Promise<void>;
}

export default function TaskStackWrapper({ refreshKey, onStatusToggled }: TaskStackWrapperProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  async function reloadTasks() {
    const data = await getTasks();
    setAllTasks(data as Task[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadTasks().then(() => setLoading(false));
  }, [refreshKey]);

  const handleToggleStatus = useCallback(async (taskId: string) => {
    const result = await toggleTaskStatus(taskId);
    await reloadTasks();
    
    if (result && result.gains) {
      // filter out stats with 0 gain and format them
      const gainedStats = Object.entries(result.gains)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => `+${value} ${key.replace('_xp', '').toUpperCase()}`)
        .join(', ');

      if (gainedStats) {
        toast.success(gainedStats, {
          description: "Task completed",
          icon: "✨",
        });
      }
      
      if (result.levelUp) {
        setLevelUpData(result.levelUp);
      }
    }
    
    if (onStatusToggled) await onStatusToggled();
  }, [onStatusToggled]);

  const handleClose = useCallback(async () => {
    setSelectedTaskId(null);
    await reloadTasks();
    if (onStatusToggled) await onStatusToggled();
  }, [onStatusToggled]);

  const activeTasks = useMemo(() => allTasks.filter(t => t.status === "todo" || t.status === "in-progress"), [allTasks]);
  const selectedTask = useMemo(() => selectedTaskId ? (allTasks.find(t => t.id === selectedTaskId) ?? null) : null, [allTasks, selectedTaskId]);
  const selectedSubtasks = useMemo(() => selectedTaskId
    ? allTasks.filter(t => t.parent_task_id === selectedTaskId)
    : [], [allTasks, selectedTaskId]);

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <TaskStack
        tasks={activeTasks}
        allTasks={allTasks}
        onToggleStatus={handleToggleStatus}
        onSelectTask={setSelectedTaskId}
      />
      <AnimatePresence>
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            subtasks={selectedSubtasks}
            onClose={handleClose}
            onDeleted={handleClose}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </AnimatePresence>

      <LevelUpModal 
        data={levelUpData} 
        onClose={() => setLevelUpData(null)} 
      />
    </>
  );
}
