"use client";

import DashboardCommand from "@/components/dashboard/DashboardCommand";
import { createTasksFromPrompt } from "@/app/actions/tasks";

interface DashboardCommandWrapperProps {
  onTaskCreated?: () => void;
}

export default function DashboardCommandWrapper({ onTaskCreated }: DashboardCommandWrapperProps) {
  const handleCreateTask = async (input: string) => {
    const taskIds = await createTasksFromPrompt(input);
    if (taskIds && taskIds.length > 0) {
      console.log("Tasks created successfully:", taskIds);
      // Trigger refresh callback if provided
      if (onTaskCreated) {
        onTaskCreated();
      }
    }
  };

  return <DashboardCommand onTaskCreated={handleCreateTask} />;
}
