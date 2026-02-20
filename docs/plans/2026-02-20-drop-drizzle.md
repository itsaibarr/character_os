# Drop Drizzle — Full Supabase Client

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Drizzle ORM entirely and replace all DB queries with the Supabase JS client, using generated TypeScript types.

**Architecture:** The existing `createClient()` from `utils/supabase/server.ts` (already used in every server action for auth) is reused for data queries — no new abstractions. Drizzle packages (`drizzle-orm`, `drizzle-kit`, `postgres`, `pg`), config, schema, and migrations are deleted. All query callsites are rewritten to `supabase.from('table')` PostgREST syntax.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, `@supabase/supabase-js`

---

## Column name cheat-sheet

The `user` table was created by Better Auth — its timestamp and boolean columns are **camelCase** in the DB. All other tables use snake_case. Use these exact names in Supabase queries:

**`user` table** (mixed case — inherited from Better Auth):
| Drizzle field | DB column |
|---|---|
| `emailVerified` | `emailVerified` |
| `createdAt` | `createdAt` |
| `updatedAt` | `updatedAt` |
| `statWeights` | `stat_weights` |
| `frictionProfile` | `friction_profile` |
| `dailyCapacity` | `daily_capacity` |
| `feedbackPreference` | `feedback_pref` |
| `mainGoal` | `main_goal` |
| `strengthXp` | `strength_xp` |
| `intellectXp` | `intellect_xp` |
| `disciplineXp` | `discipline_xp` |
| `charismaXp` | `charisma_xp` |
| `creativityXp` | `creativity_xp` |
| `spiritualityXp` | `spirituality_xp` |
| `onboardingCompleted` | `onboarding_completed` |

**All other tables** (`tasks`, `logs`, `user_analytics`): fully snake_case — `user_id`, `created_at`, `updated_at`, `completed_at`, `due_date`, `activity_type`, `discipline_gain`, `focus_areas`, etc.

---

## Task 1: Clean up stale worktree and branch

The `feature/drop-better-auth` work is already fully merged into `main`. The worktree and branch are dead weight.

**Files:** none

**Step 1: Remove the worktree**

```bash
git worktree remove .worktrees/drop-better-auth
```

Expected: directory `.worktrees/drop-better-auth` is gone, no error.

**Step 2: Delete the branch**

```bash
git branch -d feature/drop-better-auth
```

Expected: `Deleted branch feature/drop-better-auth`. The `-d` (lowercase) flag fails safely if the branch isn't fully merged — if it errors, run `git log --oneline feature/drop-better-auth ^main` to investigate before forcing.

**Step 3: Verify**

```bash
git worktree list
git branch
```

Expected: only `main` worktree, only `main` branch locally.

**Step 4: Commit**

Nothing to commit — this was only worktree/branch cleanup. No commit needed.

---

## Task 2: Generate Supabase TypeScript types

**Files:**
- Create: `src/types/supabase.ts`

**Step 1: Get your Supabase project ID**

From `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`: it looks like `https://abcdefghij.supabase.co` — the project ID is `abcdefghij`.

**Step 2: Generate types**

```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> --schema public > src/types/supabase.ts
```

If the Supabase CLI isn't installed: `npm install -g supabase` first, then `supabase login`.

Expected: `src/types/supabase.ts` is created with a `Database` export containing all your table types.

**Step 3: Verify the key types exist**

Open `src/types/supabase.ts` and confirm these paths exist:
- `Database['public']['Tables']['user']['Row']`
- `Database['public']['Tables']['tasks']['Row']`
- `Database['public']['Tables']['logs']['Insert']`
- `Database['public']['Tables']['user_analytics']['Insert']`

**Step 4: Commit**

```bash
git add src/types/supabase.ts
git commit -m "chore: add supabase generated typescript types"
```

---

## Task 3: Rewrite `src/app/actions/auth.ts`

**Files:**
- Modify: `src/app/actions/auth.ts`

**Step 1: Replace the file contents**

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";

export async function getOnboardingRedirect(): Promise<"/dashboard" | "/onboarding"> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "/onboarding";

  const { data: userData } = await supabase
    .from('user')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  return userData?.onboarding_completed ? "/dashboard" : "/onboarding";
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `src/app/actions/auth.ts`. (Other files may still error — that's fine, they're fixed in later tasks.)

**Step 3: Commit**

```bash
git add src/app/actions/auth.ts
git commit -m "feat: migrate auth action to supabase client"
```

---

## Task 4: Rewrite `src/app/actions/onboarding.ts`

**Files:**
- Modify: `src/app/actions/onboarding.ts`

**Step 1: Replace the file contents**

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";
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

  await supabase
    .from('user')
    .update({
      archetype: data.archetype,
      stat_weights: weights,
      friction_profile: data.frictionProfile,
      daily_capacity: data.dailyCapacity,
      feedback_pref: data.feedbackPreference,
      main_goal: data.mainGoal,
      onboarding_completed: true,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', user.id);

  await supabase
    .from('user_analytics')
    .insert({
      user_id: user.id,
      focus_areas: data.focusAreas,
      frustrations: [data.frictionProfile],
      focused_hours: data.dailyCapacity,
      motivation_preference: data.feedbackPreference,
      tracking_tools: data.trackingTools,
      acquisition_source: data.acquisitionSource,
      trigger_reason: data.triggerReason,
      initial_goal: data.mainGoal,
    });

  redirect("/dashboard");
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `src/app/actions/onboarding.ts`.

**Step 3: Commit**

```bash
git add src/app/actions/onboarding.ts
git commit -m "feat: migrate onboarding action to supabase client"
```

---

## Task 5: Rewrite `src/app/actions/tasks.ts`

**Files:**
- Modify: `src/app/actions/tasks.ts`

**Step 1: Replace the file contents**

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTasks() {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getUserStats() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: userData } = await supabase
    .from('user')
    .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
    .eq('id', user.id)
    .single();

  if (!userData) return null;

  const { strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp } = userData;

  return {
    stats: {
      strength: strength_xp ?? 0,
      intellect: intellect_xp ?? 0,
      discipline: discipline_xp ?? 0,
      charisma: charisma_xp ?? 0,
      creativity: creativity_xp ?? 0,
      spirituality: spirituality_xp ?? 0,
    },
    level: Math.floor(((strength_xp ?? 0) + (intellect_xp ?? 0) + (discipline_xp ?? 0) + (charisma_xp ?? 0) + (creativity_xp ?? 0) + (spirituality_xp ?? 0)) / 60) + 1,
    xpProgress: Math.min(100, ((strength_xp ?? 0) % 10 + (intellect_xp ?? 0) % 10 + (discipline_xp ?? 0) % 10) * 3),
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

  const supabase = await createClient();
  await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
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

  const supabase = await createClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single();

  if (!task) throw new Error("Task not found");

  const newStatus = task.status === "completed" ? "todo" : "completed";

  await supabase
    .from('tasks')
    .update({
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (newStatus === "completed") {
    const xpAmount = task.difficulty === "high" ? 5 : task.difficulty === "medium" ? 3 : 1;

    const { data: userData } = await supabase
      .from('user')
      .select('discipline_xp')
      .eq('id', user.id)
      .single();

    if (userData) {
      await supabase
        .from('user')
        .update({
          discipline_xp: (userData.discipline_xp ?? 0) + xpAmount,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        content: `Completed task: ${task.content}`,
        activity_type: "Task",
        difficulty: task.difficulty,
        discipline_gain: xpAmount,
      });
  }

  revalidatePath("/dashboard");
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `src/app/actions/tasks.ts`.

**Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: migrate tasks actions to supabase client"
```

---

## Task 6: Rewrite `src/app/onboarding/page.tsx`

**Files:**
- Modify: `src/app/onboarding/page.tsx`

**Step 1: Replace the Drizzle imports and query**

The page currently does:
```ts
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
// ...
const [dbUser] = await db.select(...).from(userTable).where(...).limit(1);
```

Replace with:
```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: dbUser } = await supabase
    .from('user')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (dbUser?.onboarding_completed) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center py-12">
      <OnboardingForm />
    </div>
  );
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no remaining errors that reference `@/lib/db` or `@/db/schema`.

**Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: migrate onboarding page to supabase client"
```

---

## Task 7: Delete Drizzle files and packages

**Files:**
- Delete: `src/lib/db.ts`
- Delete: `src/db/schema.ts`
- Delete: `drizzle.config.ts`
- Delete: `drizzle/` (entire directory)
- Modify: `package.json`

**Step 1: Confirm no remaining Drizzle imports**

```bash
grep -r "drizzle\|@/lib/db\|@/db/schema" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero output. If any matches appear, fix them before continuing.

**Step 2: Delete Drizzle source files**

```bash
rm src/lib/db.ts src/db/schema.ts drizzle.config.ts
rm -rf drizzle/
```

**Step 3: Remove packages**

```bash
npm uninstall drizzle-orm drizzle-kit postgres pg
```

Expected: packages removed from `node_modules` and `package.json`. The remaining deps should be `@supabase/ssr`, `@supabase/supabase-js`, `@ai-sdk/openai`, `ai`, `clsx`, `framer-motion`, `motion`, `lucide-react`, `next`, `openai`, `react`, `react-dom`, `tailwind-merge`, `zod`.

**Step 4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: clean — zero errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete drizzle orm, config, migrations, and packages"
```

---

## Task 8: Verify build

**Step 1: Run Next.js build**

```bash
npm run build 2>&1 | tail -30
```

Expected: successful build with no TypeScript errors. Warnings about `any` types are acceptable.

**Step 2: Smoke-test dev server**

```bash
npm run dev
```

Test these flows manually:
1. `/` — shows landing page when logged out
2. Sign in with Google → lands on `/dashboard` (returning user) or `/onboarding` (new user)
3. Sign in with email/password → lands on `/dashboard`
4. Dashboard loads tasks and stats
5. Create a task — appears in list
6. Toggle task complete — XP increments on stat grid
7. Sign out → back to `/`

**Step 3: Commit (only if any fixups were needed)**

```bash
git add -A
git commit -m "fix: post-drizzle-removal cleanup"
```
