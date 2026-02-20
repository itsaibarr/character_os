"use client";

import DashboardCommand from "@/components/dashboard/DashboardCommand";
import { createTask } from "@/app/actions/tasks";

export default function DashboardCommandWrapper() {
  const handleCreateTask = async (input: string) => {
    const taskId = await createTask(input);
    if (taskId) {
      console.log("Task created successfully:", taskId);
    }
  };

  return <DashboardCommand onTaskCreated={handleCreateTask} />;
}
