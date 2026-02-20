import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTasks, getUserStats, createTask, toggleTaskStatus } from "../actions/tasks";
import DashboardCommand from "@/components/dashboard/DashboardCommand";
import TaskStack from "@/components/dashboard/TaskStack";
import StatGrid from "@/components/dashboard/StatGrid";
import { LogOut } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const tasks = await getTasks() as any[];
  const userStats = await getUserStats();

  if (!userStats) redirect("/onboarding");

  const handleTaskCreated = async (content: string) => {
    "use server";
    await createTask(content);
  };

  const handleToggleTask = async (taskId: string) => {
    "use server";
    await toggleTaskStatus(taskId);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45" />
            </div>
            <span className="font-black tracking-tighter text-xl">CH_OS</span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Operative</span>
              <span className="text-sm font-bold text-slate-900">{user.email}</span>
            </div>
            <form action="/auth/sign-out" method="post">
              <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        <section>
          <StatGrid
            stats={userStats.stats}
            level={userStats.level}
            xpProgress={userStats.xpProgress}
          />
        </section>
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">What is the focus today?</h2>
            <p className="text-slate-400 font-medium">Input your intent. AI will decompose and scale.</p>
          </div>
          <DashboardCommand onTaskCreated={handleTaskCreated} />
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Task Stack</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tasks.filter(t => t.status !== 'completed').length} Pending</span>
          </div>
          <TaskStack tasks={tasks} onToggleStatus={handleToggleTask} />
        </section>
      </main>
    </div>
  );
}
