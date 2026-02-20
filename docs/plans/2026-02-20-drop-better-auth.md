# Drop Better Auth — Commit to Supabase Auth

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Better Auth entirely and consolidate all authentication on Supabase Auth, eliminating the dual-auth conflict that causes user sync fragility, double latency, and architectural confusion.

**Architecture:** Supabase Auth handles all authentication (Google OAuth + email/password). A Supabase DB trigger syncs `auth.users` → `public.user` on every signup so Drizzle queries always find a user row. All server actions use only `supabase.auth.getUser()`. Better Auth tables (`session`, `account`, `verification`) are dropped from the schema and DB.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (`@supabase/ssr`), Drizzle ORM (`drizzle-orm/postgres-js`), `postgres` driver

---

## Pre-flight: Credentials to Rotate

**Before touching code:** Several debug scripts committed to the repo contain hardcoded DB credentials. Rotate the Supabase DB password via the Supabase dashboard before proceeding. The files with exposed credentials are:
- `test-db.mjs:5`
- `test-db-fixed.mjs:5`
- `src/scripts/test-connection.ts:3-4`
- `src/scripts/test-url-parsing.ts:3`

---

## Task 1: Add the Supabase user-sync trigger

**This must be done in Supabase before any code changes** — otherwise existing auth users won't have rows in `public.user` and Drizzle queries will return empty.

**Files:** None in the codebase — run SQL in Supabase Dashboard → SQL Editor

**Step 1: Open Supabase Dashboard → SQL Editor and run this SQL**

```sql
-- Function: auto-sync new Supabase Auth users into public.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user (id, email, name, "emailVerified", "createdAt", "updatedAt")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE((new.email_confirmed_at IS NOT NULL), false),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after every new user in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Step 2: Verify the trigger was created**

In Supabase Dashboard → Database → Functions, confirm `handle_new_user` exists.

**Step 3: Backfill any existing Supabase Auth users who lack a public.user row**

```sql
INSERT INTO public.user (id, email, name, "emailVerified", "createdAt", "updatedAt")
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE((email_confirmed_at IS NOT NULL), false),
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

---

## Task 2: Remove Better Auth from schema.ts

**Files:**
- Modify: `src/db/schema.ts`

The `session`, `account`, and `verification` tables exist only for Better Auth. The app tables (`user`, `user_analytics`, `logs`, `skills`, `tasks`) stay.

**Step 1: Edit `src/db/schema.ts` — remove the three Better Auth tables**

Delete the `session`, `account`, and `verification` table definitions (lines 45–72). The file should now only contain: `user`, `userAnalytics`, `logs`, `skills`, `tasks`.

Final file:

```typescript
import { pgTable, text, timestamp, integer, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  archetype: text("archetype").default("Initiate"),
  statWeights: jsonb("stat_weights").default({}),
  frictionProfile: text("friction_profile"),
  dailyCapacity: text("daily_capacity"),
  feedbackPreference: text("feedback_pref"),
  mainGoal: text("main_goal"),
  strengthXp: integer("strength_xp").default(0),
  intellectXp: integer("intellect_xp").default(0),
  disciplineXp: integer("discipline_xp").default(0),
  charismaXp: integer("charisma_xp").default(0),
  creativityXp: integer("creativity_xp").default(0),
  spiritualityXp: integer("spirituality_xp").default(0),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const userAnalytics = pgTable("user_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  focusAreas: jsonb("focus_areas").default([]),
  frustrations: jsonb("frustrations").default([]),
  focusedHours: text("focused_hours"),
  motivationPreference: text("motivation_preference"),
  trackingTools: jsonb("tracking_tools").default([]),
  acquisitionSource: text("acquisition_source"),
  triggerReason: text("trigger_reason"),
  initialGoal: text("initial_goal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  content: text("content").notNull(),
  activityType: text("activity_type"),
  difficulty: text("difficulty"),
  strengthGain: integer("strength_gain").default(0),
  intellectGain: integer("intellect_gain").default(0),
  disciplineGain: integer("discipline_gain").default(0),
  charismaGain: integer("charisma_gain").default(0),
  creativityGain: integer("creativity_gain").default(0),
  spiritualityGain: integer("spirituality_gain").default(0),
  integrityCheckNeeded: boolean("integrity_check_needed").default(false),
  integrityVerified: boolean("integrity_verified").default(false),
  evidenceUrl: text("evidence_url"),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  lastPracticedAt: timestamp("last_practiced_at"),
  decayRate: integer("decay_rate").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  content: text("content").notNull(),
  status: text("status").default("todo").notNull(),
  priority: text("priority").default("medium"),
  difficulty: text("difficulty").default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 2: Generate the drop migration**

```bash
npx drizzle-kit generate
```

Expected: A new `.sql` file in `drizzle/` that drops `session`, `account`, `verification` tables and their FKs. Also expected: adds the `tasks` table if it wasn't in the DB yet (it's in schema but missing from the initial migration).

**Step 3: Apply the migration to Supabase**

```bash
npx drizzle-kit migrate
```

Expected: Success. The three Better Auth tables are dropped. The `tasks` table is created if it didn't exist.

**Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: remove better-auth tables from schema, add tasks table migration"
```

---

## Task 3: Delete Better Auth server and client files

**Files to delete:**
- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/app/api/auth/[...all]/route.ts`

**Step 1: Delete the files**

```bash
rm src/lib/auth.ts
rm src/lib/auth-client.ts
rm src/app/api/auth/\[...all\]/route.ts
```

Also delete the debug scripts with exposed credentials:

```bash
rm test-db.mjs
rm test-db-fixed.mjs
rm src/scripts/test-connection.ts
rm src/scripts/test-url-parsing.ts
rm src/scripts/test-url-parsing-2.ts
rm src/scripts/sanity.ts
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete better-auth files and diagnostic scripts with exposed credentials"
```

---

## Task 4: Simplify server actions — remove Better Auth session checks

**Files:**
- Modify: `src/app/actions/onboarding.ts`
- Modify: `src/app/actions/tasks.ts`
- Modify: `src/app/actions/auth.ts`

All three files currently call both `supabase.auth.getUser()` AND `auth.api.getSession()`. Remove the Better Auth half from each.

**Step 1: Rewrite `src/app/actions/auth.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";

export async function getOnboardingRedirect(): Promise<"/dashboard" | "/onboarding"> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "/onboarding";

  const [dbUser] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  return dbUser?.onboardingCompleted ? "/dashboard" : "/onboarding";
}
```

**Step 2: Rewrite `src/app/actions/onboarding.ts`**

Remove the Better Auth `getSession` call, remove the manual user-sync block (the DB trigger now handles that), simplify to Supabase only:

```typescript
"use server";

import { db } from "@/lib/db";
import { user as userTable, userAnalytics } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(data: {
  focusAreas: string[];
  archetype: string;
  frictionProfile: string;
  dailyCapacity: string;
  feedbackPreference: string;
  trackingTools: string[];
  acquisitionSource: string;
  triggerReason: string;
  mainGoal: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const weights = {
    strength: 1, intellect: 1, discipline: 1,
    charisma: 1, creativity: 1, spirituality: 1
  };

  if (data.archetype === 'Builder') { weights.intellect += 1; weights.creativity += 1; }
  if (data.archetype === 'Athlete') { weights.strength += 2; }
  if (data.archetype === 'Scholar') { weights.intellect += 2; }
  if (data.archetype === 'Leader') { weights.charisma += 1; weights.discipline += 1; }
  if (data.archetype === 'Operator') { weights.discipline += 2; }

  if (data.focusAreas.includes('Health')) weights.strength += 1;
  if (data.focusAreas.includes('Academic')) weights.intellect += 1;
  if (data.focusAreas.includes('Startup')) weights.intellect += 1;
  if (data.focusAreas.includes('Focus')) weights.discipline += 1;
  if (data.focusAreas.includes('Communication')) weights.charisma += 1;
  if (data.focusAreas.includes('Personal Projects')) weights.creativity += 1;

  await db.update(userTable)
    .set({
      archetype: data.archetype,
      statWeights: weights,
      frictionProfile: data.frictionProfile,
      dailyCapacity: data.dailyCapacity,
      feedbackPreference: data.feedbackPreference,
      mainGoal: data.mainGoal,
      onboardingCompleted: true,
      updatedAt: new Date()
    })
    .where(eq(userTable.id, user.id));

  await db.insert(userAnalytics).values({
    userId: user.id,
    focusAreas: data.focusAreas,
    frustrations: [data.frictionProfile],
    focusedHours: data.dailyCapacity,
    motivationPreference: data.feedbackPreference,
    trackingTools: data.trackingTools,
    acquisitionSource: data.acquisitionSource,
    triggerReason: data.triggerReason,
    initialGoal: data.mainGoal,
  });

  redirect("/dashboard");
}
```

**Step 3: Rewrite `src/app/actions/tasks.ts`**

Remove Better Auth session calls from all four functions — `getTasks`, `getUserStats`, `createTask`, `toggleTaskStatus`. Pattern: replace the dual-auth block with just `supabase.auth.getUser()`.

```typescript
"use server";

import { db } from "@/lib/db";
import { tasks as tasksTable, logs as logsTable, user as userTable } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTasks() {
  const user = await getUser();
  if (!user) return [];

  try {
    return await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.userId, user.id))
      .orderBy(desc(tasksTable.createdAt));
  } catch (error: any) {
    console.error("Drizzle Select Error in getTasks:", error);
    if (error.cause) console.error("Underlying Cause:", error.cause);
    throw error;
  }
}

export async function getUserStats() {
  const user = await getUser();
  if (!user) return null;

  const [userData] = await db.select()
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  if (!userData) return null;

  return {
    stats: {
      strength: userData.strengthXp || 0,
      intellect: userData.intellectXp || 0,
      discipline: userData.disciplineXp || 0,
      charisma: userData.charismaXp || 0,
      creativity: userData.creativityXp || 0,
      spirituality: userData.spiritualityXp || 0,
    },
    level: Math.floor((userData.strengthXp! + userData.intellectXp! + userData.disciplineXp! + userData.charismaXp! + userData.creativityXp! + userData.spiritualityXp!) / 60) + 1,
    xpProgress: Math.min(100, (userData.strengthXp! % 10 + userData.intellectXp! % 10 + userData.disciplineXp! % 10) * 3)
  };
}

export async function createTask(content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  let priority: "low" | "medium" | "high" = "medium";
  let difficulty: "low" | "medium" | "high" = "medium";

  if (content.toLowerCase().includes("urgent") || content.toLowerCase().includes("asap")) priority = "high";
  if (content.toLowerCase().includes("easy") || content.toLowerCase().includes("quick")) difficulty = "low";
  if (content.toLowerCase().includes("hard") || content.toLowerCase().includes("complex")) difficulty = "high";

  await db.insert(tasksTable).values({
    userId: user.id,
    content,
    priority,
    difficulty,
    status: "todo",
  });

  revalidatePath("/dashboard");
}

export async function toggleTaskStatus(taskId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const [task] = await db.select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, user.id)))
    .limit(1);

  if (!task) throw new Error("Task not found");

  const newStatus = task.status === "completed" ? "todo" : "completed";

  await db.update(tasksTable)
    .set({
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date() : null,
      updatedAt: new Date()
    })
    .where(eq(tasksTable.id, taskId));

  if (newStatus === "completed") {
    const xpAmount = task.difficulty === "high" ? 5 : (task.difficulty === "medium" ? 3 : 1);

    const [userData] = await db.select()
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1);

    if (userData) {
      await db.update(userTable)
        .set({
          disciplineXp: (userData.disciplineXp || 0) + xpAmount,
          updatedAt: new Date()
        })
        .where(eq(userTable.id, user.id));
    }

    await db.insert(logsTable).values({
      userId: user.id,
      content: `Completed task: ${task.content}`,
      activityType: "Task",
      difficulty: task.difficulty,
      disciplineGain: xpAmount,
    });
  }

  revalidatePath("/dashboard");
}
```

**Step 4: Commit**

```bash
git add src/app/actions/
git commit -m "feat: simplify server actions to use only Supabase Auth"
```

---

## Task 5: Simplify page-level auth guards

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/onboarding/page.tsx`

**Step 1: Rewrite `src/app/page.tsx`**

```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/home/HeroSection";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <HeroSection />;
}
```

**Step 2: Rewrite `src/app/dashboard/page.tsx`**

Remove the Better Auth session check and the `betterSession` fallback. The user email comes only from `supabase.auth.getUser()`.

```typescript
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
```

**Step 3: Rewrite `src/app/onboarding/page.tsx`**

```typescript
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [dbUser] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  if (dbUser?.onboardingCompleted) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center py-12">
      <OnboardingForm />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/dashboard/page.tsx src/app/onboarding/page.tsx
git commit -m "feat: simplify page auth guards to use only Supabase Auth"
```

---

## Task 6: Replace Better Auth sign-in/sign-up with Supabase Auth

**Files:**
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`

The sign-in page currently uses `authClient.signIn.email()` for email/password. Replace with `supabase.auth.signInWithPassword()`. The sign-up page uses `authClient.signUp.email()`. Replace with `supabase.auth.signUp()`.

**Step 1: Rewrite `src/app/(auth)/sign-in/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { getOnboardingRedirect } from "@/app/actions/auth"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const signIn = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }
    const destination = await getOnboardingRedirect()
    router.push(destination)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-6 md:p-8 bg-white rounded-xl border border-slate-200 shadow-xl space-y-6"
      >
        <h1 className="text-2xl font-bold text-center text-slate-900">Sign In to CharacterOS</h1>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              })
            }}
            className="w-full bg-white text-slate-700 border border-slate-300 font-medium py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={signIn}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-slate-500">
            <Link href="/sign-up" className="text-primary hover:underline font-medium">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
```

**Step 2: Rewrite `src/app/(auth)/sign-up/page.tsx`**

Note: Supabase email signup sends a confirmation email. After `signUp()`, the user is NOT immediately authenticated — they must confirm their email. Redirect to a confirmation notice page (or `/sign-in` with a message). For Google OAuth, the redirect to `/auth/callback` handles everything.

```typescript
"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"

export default function SignUp() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  const signUp = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-xl text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
          <p className="text-slate-500">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <Link href="/sign-in" className="text-primary hover:underline font-medium text-sm">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-6 md:p-8 bg-white rounded-xl border border-slate-200 shadow-xl space-y-6"
      >
        <h1 className="text-2xl font-bold text-center text-slate-900">Join CharacterOS</h1>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              })
            }}
            className="w-full bg-white text-slate-700 border border-slate-300 font-medium py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={signUp}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          <p className="text-center text-sm text-slate-500">
            <Link href="/sign-in" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: replace better-auth email sign-in/up with supabase auth"
```

---

## Task 7: Remove better-auth from package.json

**Files:**
- Modify: `package.json`

**Step 1: Uninstall better-auth**

```bash
npm uninstall better-auth
```

Expected: `better-auth` removed from `node_modules` and `package.json`. Verify no remaining imports by running:

```bash
grep -r "better-auth" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output (zero matches).

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove better-auth dependency"
```

---

## Task 8: Update .env.example

**Files:**
- Modify: `.env.example`

Remove `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Update `DATABASE_URL` to use port `6543` (transaction pooler, consistent with `prepare: false` in `db.ts`).

```
# CharacterOS Environment Example
# Copy this to .env.local and fill in your values

# Supabase
DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Google OAuth (configured in Supabase Dashboard → Auth → Providers → Google)
# No client ID/secret needed here — handled by Supabase
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: update env example — remove better-auth vars, clarify pooler URL"
```

---

## Task 9: Verify build passes

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors. If there are errors, they will be import errors from deleted files — fix any remaining references.

**Step 2: Run dev server and manually test**

```bash
npm run dev
```

Test flows:
1. Visit `/` — should show landing page when logged out
2. Sign in with Google → should land on `/onboarding` (new user) or `/dashboard` (returning user)
3. Sign up with email/password → should show "Check your email" confirmation screen
4. Sign in with email/password → should land on `/dashboard` or `/onboarding`
5. Sign out → should redirect to `/`

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete migration from better-auth to supabase auth"
```
