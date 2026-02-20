# AI Stat Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect OpenRouter to task creation so the AI assigns XP weights to each of the 6 character stats, and completing a task awards multi-stat XP based on those weights.

**Architecture:** `classifyTaskStats()` in `src/lib/ai.ts` calls OpenRouter via `generateObject` (Vercel AI SDK) on task creation. Weights are stored in 6 new `tasks` columns. `toggleTaskStatus` reads stored weights on completion and updates all non-zero stats in the `user` table. A 3-second timeout with keyword-based fallback ensures no task creation is blocked by AI latency. `TaskStack` displays non-zero stat badges on each card.

**Tech Stack:** Next.js 15 App Router, Supabase JS client, `ai` v6 (`generateObject`), `@ai-sdk/openai` (OpenRouter), `zod` v4, Framer Motion

---

## Column name reference

**`user` table** (XP columns are snake_case):
| Column | Type |
|---|---|
| `strength_xp` | integer |
| `intellect_xp` | integer |
| `discipline_xp` | integer |
| `charisma_xp` | integer |
| `creativity_xp` | integer |
| `spirituality_xp` | integer |
| `updatedAt` | timestamp (camelCase — legacy Better Auth) |

**`tasks` table** (all snake_case):
| Column | Type |
|---|---|
| `str_weight` | smallint (new) |
| `int_weight` | smallint (new) |
| `dis_weight` | smallint (new) |
| `cha_weight` | smallint (new) |
| `cre_weight` | smallint (new) |
| `spi_weight` | smallint (new) |

**`logs` table** (relevant existing columns):
| Column | Notes |
|---|---|
| `discipline_gain` | integer — only stat gain column that exists; set to dis contribution |
| `content` | text — use to describe all stat gains |

---

## Task 1: Add weight columns to tasks table

**Files:**
- No local file — run SQL directly in Supabase dashboard

**Step 1: Open Supabase SQL editor**

In your Supabase project, go to **SQL Editor** and run:

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS str_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS int_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dis_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cha_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cre_weight smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spi_weight smallint DEFAULT 0;
```

**Step 2: Verify**

In the Supabase Table Editor, open the `tasks` table. Confirm the 6 new columns appear with default `0`.

**Step 3: No commit needed**

Schema changes are in Supabase, not in a local migration file.

---

## Task 2: Add `classifyTaskStats()` to `src/lib/ai.ts`

**Files:**
- Modify: `src/lib/ai.ts`

**Context:** `ai.ts` currently only exports `openrouter` and `aiModel`. `generateObject` from the `ai` package takes `{ model, schema, prompt }` and returns `{ object }`. Zod v4 schema is defined with `z.object({ ... })`.

**Step 1: Replace the full file**

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const aiModel = openrouter(process.env.OPENROUTER_MODEL || "upstage/solar-pro-3:free");

const statWeightsSchema = z.object({
  str: z.number().int().min(0).max(5),
  int: z.number().int().min(0).max(5),
  dis: z.number().int().min(0).max(5),
  cha: z.number().int().min(0).max(5),
  cre: z.number().int().min(0).max(5),
  spi: z.number().int().min(0).max(5),
});

export type StatWeights = z.infer<typeof statWeightsSchema>;

export async function classifyTaskStats(content: string): Promise<StatWeights> {
  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: statWeightsSchema,
      prompt: `You are an RPG stat classifier for a productivity app.
Given a task description, assign XP weights (0-5) to each stat:
- str (Strength): physical effort, health, exercise, sports
- int (Intellect): learning, research, reading, coding, problem-solving
- dis (Discipline): admin, deadlines, consistency, repetitive-but-necessary work
- cha (Charisma): communication, writing, networking, sales, teaching, presenting
- cre (Creativity): design, art, building, brainstorming, music, storytelling
- spi (Spirituality): reflection, mindfulness, journaling, rest, meditation

Task: "${content}"`,
      maxRetries: 0,
    });
    return object;
  } catch {
    // Fallback: keyword-based classification
    const lower = content.toLowerCase();
    return {
      str: /gym|workout|run|exercise|train|lift|sport/.test(lower) ? 3 : 0,
      int: /learn|study|read|research|code|debug|design|solve|course/.test(lower) ? 3 : 0,
      dis: /urgent|asap|deadline|meeting|review|report|admin|email/.test(lower) ? 3 : 1,
      cha: /call|email|write|present|meet|pitch|network|post/.test(lower) ? 2 : 0,
      cre: /design|build|create|draw|music|art|idea|brainstorm/.test(lower) ? 3 : 0,
      spi: /meditat|journal|reflect|rest|breathe|mindful/.test(lower) ? 3 : 0,
    };
  }
}
```

**Step 2: Manual smoke test**

Start the dev server (`npm run dev`) and open the dashboard. Submit a task like "Write a research paper on neural networks". Check the Supabase `tasks` table row — `int_weight` should be 3–5, `dis_weight` 1–3.

**Step 3: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: add classifyTaskStats with generateObject and keyword fallback"
```

---

## Task 3: Update `createTask` to call AI and store weights

**Files:**
- Modify: `src/app/actions/tasks.ts`

**Context:** `createTask` currently does inline keyword matching for `priority` and `difficulty`, then inserts the task. Replace the keyword parsing for difficulty with the AI call. Keep priority detection as-is (it's independent).

**Step 1: Update `createTask` in `src/app/actions/tasks.ts`**

Replace the entire `createTask` function (lines 55–78):

```typescript
export async function createTask(content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  let priority: "low" | "medium" | "high" = "medium";
  let difficulty: "low" | "medium" | "high" = "medium";

  if (content.toLowerCase().includes("urgent") || content.toLowerCase().includes("asap")) priority = "high";
  if (content.toLowerCase().includes("easy") || content.toLowerCase().includes("quick")) difficulty = "low";
  if (content.toLowerCase().includes("hard") || content.toLowerCase().includes("complex")) difficulty = "high";

  const weights = await classifyTaskStats(content);

  const supabase = await createClient();
  await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority,
      difficulty,
      status: "todo",
      str_weight: weights.str,
      int_weight: weights.int,
      dis_weight: weights.dis,
      cha_weight: weights.cha,
      cre_weight: weights.cre,
      spi_weight: weights.spi,
    });

  revalidatePath("/dashboard");
}
```

Also add the import at the top of the file (after the existing imports):

```typescript
import { classifyTaskStats } from "@/lib/ai";
```

**Step 2: Manual smoke test**

Submit a task from the dashboard. In the Supabase Table Editor, open `tasks` — verify the new row has non-zero weight columns that match the task content.

**Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: store AI stat weights on task creation"
```

---

## Task 4: Update `toggleTaskStatus` to award multi-stat XP

**Files:**
- Modify: `src/app/actions/tasks.ts`

**Context:** Current `toggleTaskStatus` selects only `discipline_xp`, awards a flat XP to that one stat, and inserts one log row. Replace with: read all 6 XP columns, calculate gains from the stored task weights × difficulty multiplier, update all non-zero stats in a single `.update()` call.

**Difficulty multiplier:** `low = 1`, `medium = 2`, `high = 3`.

**Step 1: Replace the completion block inside `toggleTaskStatus`**

Find the block that starts `if (newStatus === "completed")` and replace it entirely:

```typescript
  if (newStatus === "completed") {
    const difficultyMultiplier = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;

    const gains = {
      strength_xp:    (task.str_weight ?? 0) * difficultyMultiplier,
      intellect_xp:   (task.int_weight ?? 0) * difficultyMultiplier,
      discipline_xp:  (task.dis_weight ?? 0) * difficultyMultiplier,
      charisma_xp:    (task.cha_weight ?? 0) * difficultyMultiplier,
      creativity_xp:  (task.cre_weight ?? 0) * difficultyMultiplier,
      spirituality_xp:(task.spi_weight ?? 0) * difficultyMultiplier,
    };

    // Ensure at least 1 discipline XP so completing always rewards something
    if (Object.values(gains).every(v => v === 0)) {
      gains.discipline_xp = 1;
    }

    const { data: userData } = await supabase
      .from('user')
      .select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp')
      .eq('id', user.id)
      .single();

    if (userData) {
      await supabase
        .from('user')
        .update({
          strength_xp:    (userData.strength_xp    ?? 0) + gains.strength_xp,
          intellect_xp:   (userData.intellect_xp   ?? 0) + gains.intellect_xp,
          discipline_xp:  (userData.discipline_xp  ?? 0) + gains.discipline_xp,
          charisma_xp:    (userData.charisma_xp    ?? 0) + gains.charisma_xp,
          creativity_xp:  (userData.creativity_xp  ?? 0) + gains.creativity_xp,
          spirituality_xp:(userData.spirituality_xp ?? 0) + gains.spirituality_xp,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    const gainsSummary = Object.entries(gains)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `+${v} ${k.replace('_xp', '')}`)
      .join(', ');

    await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        content: `Completed task: ${task.content} (${gainsSummary})`,
        activity_type: "Task",
        difficulty: task.difficulty,
        discipline_gain: gains.discipline_xp,
      });
  }
```

**Step 2: Manual smoke test**

1. Create a task like "Read 2 chapters of a book"
2. Complete it (click the checkbox)
3. Open Supabase `user` table — `intellect_xp` and `discipline_xp` should both increase
4. Open `logs` table — new row with gain summary in `content`
5. Refresh dashboard — StatGrid numbers should update

**Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: award multi-stat XP on task completion using stored weights"
```

---

## Task 5: Show stat badges on TaskStack cards

**Files:**
- Modify: `src/components/dashboard/TaskStack.tsx`

**Context:** Each task card shows priority and difficulty. Add a row of stat badges below those tags for non-zero weights. Badge format: a 3-letter abbreviation + filled dots (e.g. `INT ●●●●`). Only show stats with weight > 0. If all weights are 0 (tasks created before this feature), show nothing.

**Step 1: Add a `StatBadge` helper and update the task card**

Replace the full file:

```typescript
"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, Clock, AlertCircle, MoreHorizontal, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

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

interface TaskStackProps {
  tasks: Task[];
  onToggleStatus: (id: string) => void;
}

const STAT_LABELS: { key: keyof Task; label: string; color: string }[] = [
  { key: "str_weight", label: "STR", color: "text-red-500" },
  { key: "int_weight", label: "INT", color: "text-blue-500" },
  { key: "dis_weight", label: "DIS", color: "text-amber-500" },
  { key: "cha_weight", label: "CHA", color: "text-purple-500" },
  { key: "cre_weight", label: "CRE", color: "text-emerald-500" },
  { key: "spi_weight", label: "SPI", color: "text-indigo-500" },
];

function StatBadges({ task }: { task: Task }) {
  const active = STAT_LABELS.filter(s => (task[s.key] as number ?? 0) > 0);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
      {active.map(({ key, label, color }) => {
        const weight = task[key] as number;
        return (
          <span key={key} className={clsx("flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider", color)}>
            {label}
            <span className="ml-0.5 opacity-60">
              {"●".repeat(weight)}{"○".repeat(5 - weight)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function TaskStack({ tasks, onToggleStatus }: TaskStackProps) {
  return (
    <div className="w-full space-y-2">
      <AnimatePresence initial={false}>
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -20 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={clsx(
              "group relative flex items-center bg-white border rounded-xl p-4 transition-all",
              "hover:shadow-md hover:border-slate-300",
              task.status === "completed" ? "bg-slate-50 border-slate-100 opacity-60" : "border-slate-200"
            )}
          >
            {/* Completion Radio-ish Button */}
            <button
              onClick={() => onToggleStatus(task.id)}
              className={clsx(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                task.status === "completed"
                  ? "bg-green-500 border-green-500"
                  : "border-slate-200 group-hover:border-slate-400"
              )}
            >
              {task.status === "completed" && <Check className="w-4 h-4 text-white" />}
            </button>

            {/* Task Content */}
            <div className="flex-1 ml-4 overflow-hidden">
              <span className={clsx(
                "block text-[15px] font-semibold tracking-tight transition-all truncate",
                task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"
              )}>
                {task.content}
              </span>

              <div className="flex items-center space-x-3 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span className={clsx(
                    "flex items-center",
                    task.priority === "high" && "text-amber-500"
                )}>
                    {task.priority === "high" && <AlertCircle className="w-3 h-3 mr-1" />}
                    {task.priority} Prio
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span>{task.difficulty} Effort</span>
              </div>

              <StatBadges task={task} />
            </div>

            {/* Actions / Detail Arrow */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {tasks.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
          <Clock className="w-8 h-8 mb-3 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest opacity-40">No commands in stack</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Manual smoke test**

1. Create a new task (e.g. "Design the new landing page layout")
2. It should appear in the TaskStack with `CRE ●●●●●` and `INT ●●` badges
3. Old tasks (no weights) show no badges — that's correct

**Step 3: Commit**

```bash
git add src/components/dashboard/TaskStack.tsx
git commit -m "feat: show AI stat weight badges on task cards"
```

---

## Done

All 4 code tasks complete. The full loop now works:

1. User types a task → AI analyzes content → weights stored in DB
2. User completes task → weights × difficulty multiplier → all affected stats gain XP
3. StatGrid updates immediately (Next.js `revalidatePath`)
4. Task card shows which stats were targeted

**Next features to consider (from PLAN-character-os.md):**
- Radar chart visualization (Phase 4) — StatGrid hexagon chart
- XP feedback animation — floating `+XP` numbers on task completion
- Cyberpunk/Zen theming — archetype-based dashboard theme
- Integrity Engine (Phase 5) — reflection prompt for high-value tasks
