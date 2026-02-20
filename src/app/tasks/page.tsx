import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTasks, toggleTaskStatus } from "../actions/tasks";
import TasksPageClient from "./TasksPageClient";
import AppHeader from "@/components/AppHeader";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const allTasks = await getTasks() as any[];

  const handleToggleTask = async (taskId: string) => {
    "use server";
    await toggleTaskStatus(taskId);
  };

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 flex flex-col overflow-hidden">
      <AppHeader userEmail={user.email ?? ""} currentPath="/tasks" />
      <div className="flex-1 overflow-hidden">
        <TasksPageClient initialTasks={allTasks} onToggleStatus={handleToggleTask} />
      </div>
    </div>
  );
}
