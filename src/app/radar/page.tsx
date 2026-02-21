import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserStats } from "@/app/actions/tasks";
import AppSidebar from "@/components/AppSidebar";
import RadarPageChart from "@/components/radar/RadarPageChart";

const STAT_DEFS = [
  { key: 'strength'     as const, label: 'Strength',     color: '#ef4444', dotBg: 'bg-red-500'     },
  { key: 'intellect'    as const, label: 'Intellect',    color: '#3b82f6', dotBg: 'bg-blue-500'    },
  { key: 'discipline'   as const, label: 'Discipline',   color: '#f59e0b', dotBg: 'bg-amber-500'   },
  { key: 'charisma'     as const, label: 'Charisma',     color: '#a855f7', dotBg: 'bg-purple-500'  },
  { key: 'creativity'   as const, label: 'Creativity',   color: '#10b981', dotBg: 'bg-emerald-500' },
  { key: 'spirituality' as const, label: 'Spirituality', color: '#6366f1', dotBg: 'bg-indigo-500'  },
];

export default async function RadarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const userStats = await getUserStats();
  if (!userStats) redirect("/onboarding");

  const { stats } = userStats;
  const statRows = STAT_DEFS.map(def => ({
    ...def,
    xp:    stats[def.key],
    level: Math.floor(stats[def.key] / 10) + 1,
  }));
  const normalizedValues = STAT_DEFS.map(def => Math.min(stats[def.key], 100) / 100);

  return (
    <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted">
      <AppSidebar userEmail={user.email!} />
      <main className="ml-12 max-w-2xl mx-auto px-8 py-10">
        <div className="mb-8">
          <div className="text-[10px] font-black text-faint uppercase tracking-widest mb-1">Stat Analysis</div>
          <h1 className="text-2xl font-black tracking-tight text-text">Radar</h1>
        </div>
        <div className="flex justify-center mb-8">
          <RadarPageChart values={normalizedValues} />
        </div>
        <div className="border-t border-border pt-6">
          <div className="grid grid-cols-4 pb-2 border-b border-border-faint">
            {['Stat', 'XP', 'Level', 'Progress'].map(h => (
              <span key={h} className={`text-[10px] font-black text-faint uppercase tracking-widest ${h !== 'Stat' ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>
          {statRows.map((row, i) => (
            <div key={row.key} className={`grid grid-cols-4 items-center py-3 ${i < statRows.length - 1 ? 'border-b border-border-faint' : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${row.dotBg}`} />
                <span className="text-sm font-semibold text-text">{row.label}</span>
              </div>
              <span className="text-sm font-black text-text text-right">{row.xp}</span>
              <span className="text-sm font-medium text-muted text-right">Lv.{row.level}</span>
              <div className="flex justify-end">
                <div className="w-20 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${row.dotBg} opacity-70`} style={{ width: `${(row.xp % 10) * 10}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
