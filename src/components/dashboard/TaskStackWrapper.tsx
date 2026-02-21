"use client";

import { useState, useEffect } from "react";
import TaskStack from "@/components/dashboard/TaskStack";
import { getTasks, toggleTaskStatus } from "@/app/actions/tasks";

interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  parent_task_id?: string | null;
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

interface TaskStackWrapperProps {
  refreshKey?: number;
  onStatusToggled?: () => void;
}

export default function TaskStackWrapper({ refreshKey, onStatusToggled }: TaskStackWrapperProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      const data = await getTasks();
      setAllTasks(data as Task[]);
      setLoading(false);
    }
    loadTasks();
  }, [refreshKey]);

  const handleToggleStatus = async (taskId: string) => {
    await toggleTaskStatus(taskId);
    const data = await getTasks();
    setAllTasks(data as Task[]);

    if (onStatusToggled) {
      onStatusToggled();
    }
  };

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTasks = allTasks.filter(t => t.status === "todo" || t.status === "in-progress");

  return <TaskStack tasks={activeTasks} allTasks={allTasks} onToggleStatus={handleToggleStatus} />;
}
