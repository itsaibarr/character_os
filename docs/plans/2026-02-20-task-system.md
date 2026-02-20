# Task System Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add description, due dates, subtasks, and XP display to tasks. Build the /tasks page with list + sidebar layout and manual task creation drawer.

**Architecture:** New Supabase columns, updated server actions, 3 new components (TaskList, TaskDetail, NewTaskSheet), new /tasks page route.

**Tech Stack:** Next.js 15 App Router, Supabase JS, TypeScript, Tailwind CSS v4, Framer Motion

---

## Codebase Notes

- Framer Motion: `import { motion, AnimatePresence } from "motion/react"` (NOT `framer-motion`)
- CSS variables: `--color-primary`, `--color-primary-ring`, `--color-primary-hover` — use `bg-primary`, `text-primary`, `border-primary` in Tailwind v4
- `clsx` for conditional classes. No Shadcn, no Radix.
- Every mutating server action calls `revalidatePath("/tasks")` and `revalidatePath("/dashboard")`
- `"use server"` at top of actions files, `"use client"` at top of interactive components

---

## Task 1: DB Migration — Add 5 columns to `tasks`

**Files:** None in codebase — run SQL in Supabase Dashboard SQL Editor.

**Step 1: Run this SQL in Supabase Dashboard → SQL Editor**

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS due_date           timestamptz,
  ADD COLUMN IF NOT EXISTS parent_task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS xp_reward          smallint,
  ADD COLUMN IF NOT EXISTS gcal_event_id      text;
```

**Step 2: Verify in Table Editor**

Open Supabase Dashboard → Table Editor → `tasks`. Confirm the 5 new columns appear.

**Step 3: Verify cascade FK**

```sql
SELECT tc.constraint_name, kcu.column_name, rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'tasks' AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'parent_task_id';
```

Expected: one row with `delete_rule = 'CASCADE'`.

---

## Task 2: Update server actions in `src/app/actions/tasks.ts`

**Files:**
- Modify: `src/app/actions/tasks.ts`

**Step 1: Replace the full file**

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { classifyTaskStats } from "@/lib/ai";

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

export async function createTask(
  content: string,
  options?: {
    description?: string;
    due_date?: string;
    parent_task_id?: string;
    xp_reward?: number;
    priority?: "low" | "medium" | "high";
    difficulty?: "low" | "medium" | "high";
  }
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  let priority: "low" | "medium" | "high" = options?.priority ?? "medium";
  let difficulty: "low" | "medium" | "high" = options?.difficulty ?? "medium";

  if (!options?.priority) {
    if (content.toLowerCase().includes("urgent") || content.toLowerCase().includes("asap")) priority = "high";
  }
  if (!options?.difficulty) {
    if (content.toLowerCase().includes("easy") || content.toLowerCase().includes("quick")) difficulty = "low";
    if (content.toLowerCase().includes("hard") || content.toLowerCase().includes("complex")) difficulty = "high";
  }

  const weights = await classifyTaskStats(content);

  const supabase = await createClient();
  const { data } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority,
      difficulty,
      status: "todo",
      description: options?.description ?? null,
      due_date: options?.due_date ?? null,
      parent_task_id: options?.parent_task_id ?? null,
      xp_reward: options?.xp_reward ?? null,
      str_weight: weights.str,
      int_weight: weights.int,
      dis_weight: weights.dis,
      cha_weight: weights.cha,
      cre_weight: weights.cre,
      spi_weight: weights.spi,
    })
    .select('id')
    .single();

  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  return data?.id ?? null;
}

export async function updateTask(
  taskId: string,
  fields: {
    content?: string;
    description?: string | null;
    due_date?: string | null;
    priority?: "low" | "medium" | "high";
    difficulty?: "low" | "medium" | "high";
    xp_reward?: number | null;
  }
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createSubtask(parentId: string, content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: parent } = await supabase
    .from('tasks')
    .select('id, parent_task_id')
    .eq('id', parentId)
    .eq('user_id', user.id)
    .single();

  if (!parent) throw new Error("Parent task not found");
  if (parent.parent_task_id !== null) throw new Error("Cannot create subtask of a subtask");

  const weights = await classifyTaskStats(content);

  const { data } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      content,
      priority: "medium",
      difficulty: "medium",
      status: "todo",
      parent_task_id: parentId,
      str_weight: weights.str,
      int_weight: weights.int,
      dis_weight: weights.dis,
      cha_weight: weights.cha,
      cre_weight: weights.cre,
      spi_weight: weights.spi,
    })
    .select('id')
    .single();

  revalidatePath("/tasks");
  return data?.id ?? null;
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
    const difficultyMultiplier = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;

    let gains: Record<string, number>;

    if (task.xp_reward != null) {
      gains = {
        strength_xp: 0, intellect_xp: 0, discipline_xp: task.xp_reward,
        charisma_xp: 0, creativity_xp: 0, spirituality_xp: 0,
      };
    } else {
      gains = {
        strength_xp:    (task.str_weight ?? 0) * difficultyMultiplier,
        intellect_xp:   (task.int_weight ?? 0) * difficultyMultiplier,
        discipline_xp:  (task.dis_weight ?? 0) * difficultyMultiplier,
        charisma_xp:    (task.cha_weight ?? 0) * difficultyMultiplier,
        creativity_xp:  (task.cre_weight ?? 0) * difficultyMultiplier,
        spirituality_xp:(task.spi_weight ?? 0) * difficultyMultiplier,
      };
    }

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

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}
```

**Step 2: Verify**

```bash
npm run dev
```

Open `/dashboard` — task creation still works. No TypeScript errors in terminal.

**Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "feat: add updateTask, deleteTask, createSubtask actions; extend createTask with new fields"
```

---

## Task 3: Create `src/components/tasks/NewTaskSheet.tsx`

**Files:**
- Create: `src/components/tasks/NewTaskSheet.tsx`

**Step 1: Create the directory and file**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createTask } from "@/app/actions/tasks";

interface Task {
  id: string;
  content: string;
  parent_task_id: string | null;
}

interface NewTaskSheetProps {
  open: boolean;
  onClose: () => void;
  topLevelTasks: Task[];
  onCreated?: (taskId: string) => void;
}

export default function NewTaskSheet({ open, onClose, topLevelTasks, onCreated }: NewTaskSheetProps) {
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [difficulty, setDifficulty] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setContent(""); setDescription(""); setPriority("medium"); setDifficulty("medium");
      setDueDate(""); setParentTaskId(""); setError(null);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const newId = await createTask(content.trim(), {
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        parent_task_id: parentTaskId || undefined,
        priority,
        difficulty,
      });
      onCreated?.(newId ?? "");
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SELECT_BASE = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all appearance-none";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">New Task</div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">Create Task</h2>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional context, notes, or steps..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as any)} className={SELECT_BASE}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className={SELECT_BASE}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all"
                />
              </div>

              {topLevelTasks.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Parent Task <span className="normal-case font-medium text-slate-400">(makes this a subtask)</span>
                  </label>
                  <select value={parentTaskId} onChange={e => setParentTaskId(e.target.value)} className={SELECT_BASE}>
                    <option value="">None (top-level task)</option>
                    {topLevelTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.content.length > 50 ? t.content.slice(0, 50) + "…" : t.content}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
              <p className="text-[11px] text-slate-400 font-medium">Stat weights will be classified by AI after creation.</p>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all",
                  content.trim() && !isSubmitting
                    ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-[var(--color-primary-hover)] active:scale-95"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isSubmitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/tasks/NewTaskSheet.tsx
git commit -m "feat: add NewTaskSheet slide-in drawer for manual task creation"
```

---

## Task 4: Create `src/components/tasks/TaskList.tsx`

**Files:**
- Create: `src/components/tasks/TaskList.tsx`

**Step 1: Create the file**

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Plus, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import NewTaskSheet from "./NewTaskSheet";

interface Task {
  id: string;
  content: string;
  status: string;
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  due_date: string | null;
  parent_task_id: string | null;
  str_weight?: number | null;
  int_weight?: number | null;
  dis_weight?: number | null;
  cha_weight?: number | null;
  cre_weight?: number | null;
  spi_weight?: number | null;
}

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onTaskCreated: (taskId: string) => void;
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
  const active = STAT_LABELS.filter(s => ((task[s.key] as number) ?? 0) > 0);
  if (active.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {active.map(({ key, label, color }) => {
        const weight = task[key] as number;
        return (
          <span key={key} className={clsx("flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider", color)}>
            {label} <span className="ml-0.5 opacity-60">{"●".repeat(weight)}{"○".repeat(5 - weight)}</span>
          </span>
        );
      })}
    </div>
  );
}

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

type FilterMode = "active" | "all" | "completed";

export default function TaskList({ tasks, selectedTaskId, onSelectTask, onToggleStatus, onTaskCreated }: TaskListProps) {
  const [filter, setFilter] = useState<FilterMode>("active");
  const [sheetOpen, setSheetOpen] = useState(false);

  const topLevelTasks = tasks.filter(t => t.parent_task_id === null);
  const subtasksByParent = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.parent_task_id) {
      if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
      acc[t.parent_task_id].push(t);
    }
    return acc;
  }, {});

  const filteredTopLevel = topLevelTasks.filter(t => {
    if (filter === "active") return t.status !== "completed";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-3.5 h-3.5" /> New Task
        </button>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {(["active", "all", "completed"] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all capitalize",
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        <AnimatePresence initial={false}>
          {filteredTopLevel.map((task, index) => {
            const subtasks = subtasksByParent[task.id] ?? [];
            const due = formatDueDate(task.due_date);
            const overdue = task.due_date ? new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
            const isSelected = selectedTaskId === task.id;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
              >
                <div
                  onClick={() => onSelectTask(task.id)}
                  className={clsx(
                    "group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all border",
                    isSelected ? "bg-primary/5 border-primary/20" : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm",
                    task.status === "completed" && "opacity-50"
                  )}
                >
                  <button
                    onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
                    className={clsx(
                      "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                      task.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400"
                    )}
                  >
                    {task.status === "completed" && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={clsx("block text-sm font-semibold text-slate-900 truncate", task.status === "completed" && "line-through text-slate-400")}>
                      {task.content}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.priority === "high" && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                          <AlertCircle className="w-2.5 h-2.5" /> High
                        </span>
                      )}
                      {due && <span className={clsx("text-[9px] font-bold uppercase tracking-wider", overdue ? "text-red-500" : "text-slate-400")}>{due}</span>}
                      {subtasks.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {subtasks.filter(s => s.status === "completed").length}/{subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                    <StatBadges task={task} />
                  </div>
                  <ChevronRight className={clsx("w-3.5 h-3.5 shrink-0 mt-1 transition-colors", isSelected ? "text-primary" : "text-slate-200 group-hover:text-slate-400")} />
                </div>

                {subtasks.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => onSelectTask(sub.id)}
                    className={clsx(
                      "group flex items-center gap-3 pl-8 pr-3 py-2 ml-2 rounded-lg cursor-pointer transition-all border-l-2",
                      selectedTaskId === sub.id ? "border-l-primary/40 bg-primary/5" : "border-l-slate-100 hover:border-l-slate-300 hover:bg-slate-50",
                      sub.status === "completed" && "opacity-50"
                    )}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); onToggleStatus(sub.id); }}
                      className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all", sub.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400")}
                    >
                      {sub.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className={clsx("flex-1 text-xs font-medium text-slate-700 truncate", sub.status === "completed" && "line-through text-slate-400")}>
                      {sub.content}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-200 group-hover:text-slate-400 shrink-0 transition-colors" />
                  </div>
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredTopLevel.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
            <Clock className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">
              {filter === "completed" ? "No completed tasks" : "No active tasks"}
            </p>
          </div>
        )}
      </div>

      <NewTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        topLevelTasks={topLevelTasks}
        onCreated={id => { setSheetOpen(false); if (id) onTaskCreated(id); }}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/tasks/TaskList.tsx
git commit -m "feat: add TaskList component with filter toggle and subtask rows"
```

---

## Task 5: Create `src/components/tasks/TaskDetail.tsx`

**Files:**
- Create: `src/components/tasks/TaskDetail.tsx`

**Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "motion/react";
import { Check, Trash2, Plus, Loader2, AlertCircle, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { updateTask, deleteTask, createSubtask } from "@/app/actions/tasks";

interface Task {
  id: string;
  content: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  due_date: string | null;
  parent_task_id: string | null;
  xp_reward: number | null;
  str_weight?: number | null;
  int_weight?: number | null;
  dis_weight?: number | null;
  cha_weight?: number | null;
  cre_weight?: number | null;
  spi_weight?: number | null;
}

interface TaskDetailProps {
  task: Task | null;
  subtasks: Task[];
  onDeleted: () => void;
  onToggleStatus: (id: string) => void;
}

const STAT_LABELS: { key: keyof Task; label: string; color: string; bgColor: string }[] = [
  { key: "str_weight", label: "STR", color: "text-red-500",     bgColor: "bg-red-50" },
  { key: "int_weight", label: "INT", color: "text-blue-500",    bgColor: "bg-blue-50" },
  { key: "dis_weight", label: "DIS", color: "text-amber-500",   bgColor: "bg-amber-50" },
  { key: "cha_weight", label: "CHA", color: "text-purple-500",  bgColor: "bg-purple-50" },
  { key: "cre_weight", label: "CRE", color: "text-emerald-500", bgColor: "bg-emerald-50" },
  { key: "spi_weight", label: "SPI", color: "text-indigo-500",  bgColor: "bg-indigo-50" },
];

function computeXpPreview(task: Task) {
  if (task.xp_reward != null) return `+${task.xp_reward} DIS (manual override)`;
  const mult = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;
  const breakdown = STAT_LABELS
    .map(s => ({ label: s.label, xp: ((task[s.key] as number) ?? 0) * mult }))
    .filter(x => x.xp > 0)
    .map(x => `+${x.xp} ${x.label}`)
    .join("  ");
  return breakdown || "No stat weights yet";
}

export default function TaskDetail({ task, subtasks, onDeleted, onToggleStatus }: TaskDetailProps) {
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [difficulty, setDifficulty] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [xpReward, setXpReward] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [newSubtaskContent, setNewSubtaskContent] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.content);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDifficulty(task.difficulty);
    setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
    setXpReward(task.xp_reward != null ? String(task.xp_reward) : "");
    setEditingTitle(false);
    setShowDeleteConfirm(false);
    setAddingSubtask(false);
    setNewSubtaskContent("");
  }, [task?.id]);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 px-8">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
          <Check className="w-7 h-7 opacity-30" />
        </div>
        <p className="text-sm font-bold text-slate-400 text-center">Select a task to view details</p>
        <p className="text-xs text-slate-300 text-center mt-1">Click any task in the list</p>
      </div>
    );
  }

  const saveTitle = () => {
    if (title.trim() === task.content) { setEditingTitle(false); return; }
    setSavingField("title");
    startTransition(async () => { await updateTask(task.id, { content: title.trim() }); setSavingField(null); setEditingTitle(false); });
  };

  const saveDescription = () => {
    const trimmed = description.trim();
    if (trimmed === (task.description ?? "")) return;
    setSavingField("description");
    startTransition(async () => { await updateTask(task.id, { description: trimmed || null }); setSavingField(null); });
  };

  const SELECT_BASE = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all appearance-none";
  const activeStatBadges = STAT_LABELS.filter(s => ((task[s.key] as number) ?? 0) > 0);

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full overflow-y-auto px-6 py-6 space-y-6"
    >
      {/* Title */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleStatus(task.id)}
          className={clsx("mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all", task.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 hover:border-slate-400")}
        >
          {task.status === "completed" && <Check className="w-4 h-4 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(task.content); setEditingTitle(false); } }}
              className="w-full text-lg font-black tracking-tight text-slate-900 bg-transparent border-b-2 border-primary outline-none pb-0.5"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className={clsx("text-lg font-black tracking-tight cursor-text hover:text-primary transition-colors", task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900")}
            >
              {task.content}
              {savingField === "title" && <Loader2 className="inline w-3.5 h-3.5 ml-2 animate-spin text-slate-400" />}
            </h2>
          )}
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Click title to edit</div>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Add notes, context, or steps..."
          rows={3}
          className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:bg-white transition-all resize-none"
        />
        {savingField === "description" && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
      </div>

      {/* Priority + Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
          <select value={priority} onChange={e => { const v = e.target.value as any; setPriority(v); startTransition(async () => updateTask(task.id, { priority: v })); }} className={SELECT_BASE}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Difficulty</label>
          <select value={difficulty} onChange={e => { const v = e.target.value as any; setDifficulty(v); startTransition(async () => updateTask(task.id, { difficulty: v })); }} className={SELECT_BASE}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Due Date */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" />Due Date</label>
        <input
          type="date" value={dueDate}
          onChange={e => { setDueDate(e.target.value); startTransition(async () => updateTask(task.id, { due_date: e.target.value || null })); }}
          className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:bg-white transition-all"
        />
      </div>

      <div className="border-t border-slate-100" />

      {/* Subtasks */}
      {task.parent_task_id === null && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtasks ({subtasks.length})</label>
          {subtasks.length > 0 && (
            <div className="space-y-1">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-50 group">
                  <button
                    onClick={() => onToggleStatus(sub.id)}
                    className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all", sub.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400")}
                  >
                    {sub.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className={clsx("text-sm font-medium flex-1", sub.status === "completed" ? "text-slate-400 line-through" : "text-slate-700")}>{sub.content}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text" value={newSubtaskContent}
              onChange={e => setNewSubtaskContent(e.target.value)}
              onKeyDown={async e => { if (e.key === "Enter" && newSubtaskContent.trim()) { setAddingSubtask(true); await createSubtask(task.id, newSubtaskContent.trim()); setNewSubtaskContent(""); setAddingSubtask(false); } }}
              placeholder="Add a subtask..."
              className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:bg-white transition-all"
            />
            <button
              onClick={async () => { if (!newSubtaskContent.trim()) return; setAddingSubtask(true); await createSubtask(task.id, newSubtaskContent.trim()); setNewSubtaskContent(""); setAddingSubtask(false); }}
              disabled={!newSubtaskContent.trim() || addingSubtask}
              className={clsx("p-2 rounded-lg transition-all", newSubtaskContent.trim() ? "bg-primary text-white hover:bg-[var(--color-primary-hover)]" : "bg-slate-100 text-slate-300 cursor-not-allowed")}
            >
              {addingSubtask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100" />

      {/* XP */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">XP Reward Override <span className="normal-case font-medium">(optional)</span></label>
        <input
          type="number" min={0} max={999} value={xpReward}
          onChange={e => setXpReward(e.target.value)}
          onBlur={() => { const parsed = xpReward.trim() === "" ? null : parseInt(xpReward, 10); if (!isNaN(parsed as number) || parsed === null) startTransition(async () => updateTask(task.id, { xp_reward: parsed })); }}
          placeholder="Leave blank for auto"
          className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:bg-white transition-all"
        />
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">XP on Completion</div>
        <div className="text-sm font-bold text-slate-700">{computeXpPreview(task)}</div>
        {activeStatBadges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeStatBadges.map(({ key, label, color, bgColor }) => {
              const weight = task[key] as number;
              return (
                <span key={key} className={clsx("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", color, bgColor)}>
                  {label} <span className="opacity-60">{"●".repeat(weight)}{"○".repeat(5 - weight)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100" />

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all self-start">
          <Trash2 className="w-4 h-4" /> Delete Task
        </button>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">
              Delete this task{subtasks.length > 0 ? ` and its ${subtasks.length} subtask${subtasks.length > 1 ? "s" : ""}` : ""}? Cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => { await deleteTask(task.id); onDeleted(); }} className="flex-1 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 active:scale-95 transition-all">Delete</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white text-slate-600 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/tasks/TaskDetail.tsx
git commit -m "feat: add TaskDetail component with inline editing and XP preview"
```

---

## Task 6: Create `src/app/tasks/TasksPageClient.tsx`

**Files:**
- Create: `src/app/tasks/TasksPageClient.tsx`

**Step 1: Create the file**

```typescript
"use client";

import { useState, useOptimistic, useTransition } from "react";
import TaskList from "@/components/tasks/TaskList";
import TaskDetail from "@/components/tasks/TaskDetail";

interface Task {
  id: string;
  content: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  due_date: string | null;
  parent_task_id: string | null;
  xp_reward: number | null;
  str_weight?: number | null;
  int_weight?: number | null;
  dis_weight?: number | null;
  cha_weight?: number | null;
  cre_weight?: number | null;
  spi_weight?: number | null;
}

interface TasksPageClientProps {
  initialTasks: Task[];
  onToggleStatus: (taskId: string) => Promise<void>;
}

export default function TasksPageClient({ initialTasks, onToggleStatus }: TasksPageClientProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticTasks, addOptimistic] = useOptimistic(
    initialTasks,
    (current: Task[], taskId: string) =>
      current.map(t => t.id === taskId ? { ...t, status: t.status === "completed" ? "todo" : "completed" } : t)
  );

  const handleToggle = (taskId: string) => {
    startTransition(async () => {
      addOptimistic(taskId);
      await onToggleStatus(taskId);
    });
  };

  const selectedTask = optimisticTasks.find(t => t.id === selectedTaskId) ?? null;
  const selectedSubtasks = selectedTask ? optimisticTasks.filter(t => t.parent_task_id === selectedTask.id) : [];

  return (
    <div className="flex h-full max-w-7xl mx-auto px-6 py-6 gap-6">
      <div className="w-80 shrink-0 flex flex-col overflow-hidden">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
          Task Stack — {optimisticTasks.filter(t => !t.parent_task_id && t.status !== "completed").length} Active
        </div>
        <div className="flex-1 overflow-hidden">
          <TaskList
            tasks={optimisticTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onToggleStatus={handleToggle}
            onTaskCreated={id => setSelectedTaskId(id)}
          />
        </div>
      </div>
      <div className="w-px bg-slate-100 shrink-0" />
      <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm">
        <TaskDetail
          task={selectedTask}
          subtasks={selectedSubtasks}
          onDeleted={() => setSelectedTaskId(null)}
          onToggleStatus={handleToggle}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/tasks/TasksPageClient.tsx
git commit -m "feat: add TasksPageClient with optimistic toggle and two-panel layout"
```

---

## Task 7: Create `src/app/tasks/page.tsx`

**Files:**
- Create: `src/app/tasks/page.tsx`

**Step 1: Create the file**

```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTasks, toggleTaskStatus } from "../actions/tasks";
import { LogOut } from "lucide-react";
import TasksPageClient from "./TasksPageClient";

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
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rotate-45" />
              </div>
              <span className="font-black tracking-tighter text-xl">CH_OS</span>
            </div>
            <nav className="flex items-center space-x-1">
              <a href="/dashboard" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Dashboard</a>
              <a href="/tasks" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-900 bg-slate-100 rounded-lg">Tasks</a>
            </nav>
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
      <div className="flex-1 overflow-hidden">
        <TasksPageClient initialTasks={allTasks} onToggleStatus={handleToggleTask} />
      </div>
    </div>
  );
}
```

**Step 2: Manual verification**

```bash
npm run dev
```

1. Visit `/tasks` — page loads with header showing "Tasks" link highlighted
2. Task list shows in left panel (320px), right panel shows empty state
3. Click a task — detail panel appears on right
4. Click "+ New Task" — sheet slides in from right with all form fields
5. Fill in title + fields, submit — task appears in list, is auto-selected
6. Click title in detail — edit inline, press Enter to save
7. Change priority dropdown — saves immediately
8. Add subtask from detail panel — appears indented in list
9. Click delete, confirm — task gone, detail clears
10. Navigate to `/dashboard` — nav link works

**Step 3: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "feat: add /tasks page with two-panel task management layout"
```

---

## Files Summary

| File | Action |
|---|---|
| Supabase SQL Editor | Add 5 columns to `tasks` |
| `src/app/actions/tasks.ts` | Add `updateTask`, `deleteTask`, `createSubtask`; update `createTask` + `toggleTaskStatus` |
| `src/components/tasks/NewTaskSheet.tsx` | New — slide-in creation drawer |
| `src/components/tasks/TaskList.tsx` | New — left panel with list, filters, subtask rows |
| `src/components/tasks/TaskDetail.tsx` | New — right panel with inline editing, subtasks, XP preview |
| `src/app/tasks/TasksPageClient.tsx` | New — client orchestration layer, optimistic state |
| `src/app/tasks/page.tsx` | New — server page with auth, data fetch, header |

## Merge Note

`tasks.ts` is also modified by the `ai-stat-routing` plan. The conflict is only in `toggleTaskStatus` — keep both plans' XP logic (multi-stat gains). The `createTask` signature change in this plan is additive (new optional `options` parameter) and won't conflict.
