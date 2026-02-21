import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTasks, toggleTaskStatus } from "../actions/tasks";
import TasksPageClient from "./TasksPageClient";
import AppSidebar from "@/components/AppSidebar";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const allTasks = await getTasks();

  const handleToggleTask = async (taskId: string) => {
    "use server";
    return await toggleTaskStatus(taskId);
  };

  return (
    <div className="h-screen bg-canvas text-text selection:bg-accent-muted overflow-hidden">
      <AppSidebar userEmail={user.email ?? ""} />
      <div className="ml-12 h-full overflow-hidden">
        <TasksPageClient initialTasks={allTasks} onToggleStatus={handleToggleTask} />
      </div>
    </div>
  );
}
