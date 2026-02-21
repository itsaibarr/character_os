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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      const data = await getTasks();
      // Filter to only show todo and in-progress tasks
      const filtered = data.filter((t: Task) => t.status === "todo" || t.status === "in-progress");
      setTasks(filtered as Task[]);
      setLoading(false);
    }
    loadTasks();
  }, [refreshKey]);

  const handleToggleStatus = async (taskId: string) => {
    await toggleTaskStatus(taskId);
    // Reload tasks after toggling
    const data = await getTasks();
    const filtered = data.filter((t: Task) => t.status === "todo" || t.status === "in-progress");
    setTasks(filtered as Task[]);
    
    // Notify parent to refresh stats
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

  return <TaskStack tasks={tasks} onToggleStatus={handleToggleStatus} />;
}
