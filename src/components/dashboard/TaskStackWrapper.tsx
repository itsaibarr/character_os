"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import TaskStack from "@/components/dashboard/TaskStack";
import TaskDetail from "@/components/tasks/TaskDetail";
import { getTasks, toggleTaskStatus } from "@/app/actions/tasks";

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

  async function reloadTasks() {
    const data = await getTasks();
    setAllTasks(data as Task[]);
  }

  useEffect(() => {
    reloadTasks().then(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleToggleStatus = async (taskId: string) => {
    await toggleTaskStatus(taskId);
    await reloadTasks();
    if (onStatusToggled) await onStatusToggled();
  };

  const handleClose = async () => {
    setSelectedTaskId(null);
    await reloadTasks();
    if (onStatusToggled) await onStatusToggled();
  };

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTasks = allTasks.filter(t => t.status === "todo" || t.status === "in-progress");
  const selectedTask = selectedTaskId ? (allTasks.find(t => t.id === selectedTaskId) ?? null) : null;
  const selectedSubtasks = selectedTaskId
    ? allTasks.filter(t => t.parent_task_id === selectedTaskId)
    : [];

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
    </>
  );
}
