# Active Commands Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-place TaskDetail panel to Active Commands (click any task row to open it) and make parent task rows two-line with due date, difficulty, and XP.

**Architecture:** `TaskStack.tsx` gains `onSelectTask` prop, clickable rows, and a meta row. `TaskStackWrapper.tsx` gains `selectedTaskId` state and renders `TaskDetail` inside `AnimatePresence`. `TaskDetail.tsx` is unchanged.

**Tech Stack:** Next.js 15 App Router, React, Framer Motion (`motion/react`), Tailwind CSS, clsx

---

### Task 1: Expand interfaces and add helpers in `TaskStack.tsx`

**Files:**
- Modify: `src/components/dashboard/TaskStack.tsx:7-26`

**Step 1: Add missing fields to Task interface**

Replace the current `Task` interface (lines 7–20) and `TaskStackProps` (lines 22–26) with:

```typescript
interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  parent_task_id?: string | null;
  due_date?: string | null;
  description?: string | null;
  xp_reward?: number | null;
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

interface TaskStackProps {
  tasks: Task[];
  allTasks: Task[];
  onToggleStatus: (id: string) => void;
  onSelectTask?: (id: string) => void;
}
```

**Step 2: Add helper functions after the `STAT_LABELS` constant (after line 35)**

Insert these three helpers between `STAT_LABELS` and the `ActiveStatDots` function:

```typescript
const STAT_KEYS: (keyof Task)[] = [
  "str_weight", "int_weight", "dis_weight",
  "cha_weight", "cre_weight", "spi_weight",
];

function computeXp(task: Task): number {
  if (task.xp_reward != null) return task.xp_reward;
  const mult = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;
  return STAT_KEYS.reduce((sum, key) => sum + (((task[key] as number) ?? 0) * mult), 0);
}

function formatDueDate(dateStr: string): { label: string; className: string } {
  const due = new Date(dateStr);
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / 86_400_000);
  if (diff < 0) return { label: "Overdue", className: "text-red-500" };
  if (diff === 0) return { label: "Today", className: "text-amber-500" };
  if (diff === 1) return { label: "Tomorrow", className: "text-text/60" };
  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    className: "text-text/60",
  };
}

const DIFFICULTY_LABEL: Record<string, string> = {
  low: "Simple",
  medium: "Moderate",
  high: "Advanced",
};
```

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors from `TaskStack.tsx`

**Step 4: Commit**

```bash
git add src/components/dashboard/TaskStack.tsx
git commit -m "feat: expand TaskStack Task interface + add xp/date/difficulty helpers"
```

---

### Task 2: Make parent task rows clickable with a meta line

**Files:**
- Modify: `src/components/dashboard/TaskStack.tsx` — the parent task row block (currently lines 180–218)

**Step 1: Replace the parent task row block**

Find this block in `TaskStack` (inside the `for (const parent of activeParents)` loop):

```tsx
        {/* Parent row */}
        <div className="flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group">
          <button
            onClick={() => onToggleStatus(parent.id)}
```

Replace the entire `{/* Parent row */}` div (through its closing `</div>` before the `{/* Subtask rows */}` comment) with:

```tsx
        {/* Parent row */}
        <div
          className="py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group cursor-pointer"
          onClick={() => onSelectTask?.(parent.id)}
        >
          {/* Line 1: checkbox · title · count · priority · stats */}
          <div className="flex items-center gap-3">
            <button
              onClick={e => { e.stopPropagation(); onToggleStatus(parent.id); }}
              className={clsx(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                parent.status === "completed"
                  ? "bg-accent border-accent"
                  : "border-slate-300 group-hover:border-slate-400"
              )}
            >
              {parent.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
            </button>

            <span
              className={clsx(
                "flex-1 text-sm font-medium truncate",
                parent.status === "completed" ? "line-through text-faint" : "text-text"
              )}
            >
              {parent.content}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              {totalCount > 0 && (
                <span className="text-[10px] font-medium text-faint tabular-nums">
                  {completedCount}/{totalCount}
                </span>
              )}
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  parent.priority === "high" ? "bg-red-400" :
                  parent.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
                )}
              />
              <ActiveStatDots task={parent} />
            </div>
          </div>

          {/* Line 2: meta — due date · difficulty · XP */}
          {(() => {
            const xp = computeXp(parent);
            const duePart = parent.due_date ? formatDueDate(parent.due_date) : null;
            const diffLabel = DIFFICULTY_LABEL[parent.difficulty];
            const hasMeta = duePart || xp > 0;
            if (!hasMeta) return null;
            return (
              <div className="flex items-center gap-1 pl-7 mt-0.5 text-[10px] font-medium text-text/50">
                {duePart && (
                  <>
                    <span className={duePart.className}>{duePart.label}</span>
                    <span className="text-text/30">·</span>
                  </>
                )}
                <span>{diffLabel}</span>
                {xp > 0 && (
                  <>
                    <span className="text-text/30">·</span>
                    <span className="text-emerald-500/70">+{xp} XP</span>
                  </>
                )}
              </div>
            );
          })()}
        </div>
```

**Step 2: Verify visually (dev server)**

Run: `npm run dev`
Open `http://localhost:3000/dashboard`. Parent tasks should now show a second line with difficulty always visible, due date and XP when present.

**Step 3: Commit**

```bash
git add src/components/dashboard/TaskStack.tsx
git commit -m "feat: two-line parent task rows — due date, difficulty, XP meta"
```

---

### Task 3: Make subtask and orphan rows clickable

**Files:**
- Modify: `src/components/dashboard/TaskStack.tsx` — subtask rows block and orphan rows block

**Step 1: Update subtask rows inside the `activeChildren.map` block**

Find the subtask inner div (currently has `className="flex items-center gap-3 py-2 border-b ..."`):

```tsx
                  <div className="flex items-center gap-3 py-2 border-b border-border-faint hover:bg-slate-50 transition-colors flex-1 min-w-0 pr-1">
                    <button
                      onClick={() => onToggleStatus(child.id)}
```

Replace with:

```tsx
                  <div
                    className="flex items-center gap-3 py-2 border-b border-border-faint hover:bg-slate-50 transition-colors flex-1 min-w-0 pr-1 cursor-pointer"
                    onClick={() => onSelectTask?.(child.id)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); onToggleStatus(child.id); }}
```

**Step 2: Update orphan rows**

Find the orphan `motion.div` (has `className="flex items-center gap-3 py-2.5 border-b ..."`). Add `cursor-pointer onClick` to it and wrap the orphan checkbox with stopPropagation:

Replace:
```tsx
        className="flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group"
```
With:
```tsx
        className="flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group cursor-pointer"
        onClick={() => onSelectTask?.(task.id)}
```

And replace the orphan checkbox:
```tsx
        <button
          onClick={() => onToggleStatus(task.id)}
```
With:
```tsx
        <button
          onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
```

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/dashboard/TaskStack.tsx
git commit -m "feat: subtask and orphan rows clickable for task detail panel"
```

---

### Task 4: Add panel state and TaskDetail to `TaskStackWrapper.tsx`

**Files:**
- Modify: `src/components/dashboard/TaskStackWrapper.tsx`

**Step 1: Expand imports and Task interface**

Replace the current file header (imports + Task interface) with:

```typescript
"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import TaskStack from "@/components/dashboard/TaskStack";
import TaskDetail from "@/components/tasks/TaskDetail";
import { getTasks, toggleTaskStatus } from "@/app/actions/tasks";

interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  parent_task_id?: string | null;
  due_date?: string | null;
  description?: string | null;
  xp_reward?: number | null;
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}
```

**Step 2: Update the component body**

Replace everything from `export default function TaskStackWrapper` through the end of the file with:

```typescript
interface TaskStackWrapperProps {
  refreshKey?: number;
  onStatusToggled?: () => void;
}

export default function TaskStackWrapper({ refreshKey, onStatusToggled }: TaskStackWrapperProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  async function reloadTasks() {
    const data = await getTasks();
    setAllTasks(data as Task[]);
  }

  useEffect(() => {
    reloadTasks().then(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleToggleStatus = async (taskId: string) => {
    await toggleTaskStatus(taskId);
    await reloadTasks();
    if (onStatusToggled) onStatusToggled();
  };

  const handleClose = async () => {
    setSelectedTaskId(null);
    await reloadTasks();
  };

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTasks = allTasks.filter(t => t.status === "todo" || t.status === "in-progress");
  const selectedTask = selectedTaskId ? (allTasks.find(t => t.id === selectedTaskId) ?? null) : null;
  const selectedSubtasks = selectedTaskId
    ? allTasks.filter(t => t.parent_task_id === selectedTaskId)
    : [];

  return (
    <>
      <TaskStack
        tasks={activeTasks}
        allTasks={allTasks}
        onToggleStatus={handleToggleStatus}
        onSelectTask={setSelectedTaskId}
      />
      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetail
            task={selectedTask as any}
            subtasks={selectedSubtasks as any}
            onClose={handleClose}
            onDeleted={handleClose}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </AnimatePresence>
    </>
  );
}
```

> **Note on `as any` casts:** `TaskDetail` expects `description: string | null` (non-optional) but `TaskStackWrapper`'s Task has it optional. The cast is safe because `getTasks()` returns the full DB row — the value is always present at runtime. If this causes a lint error, add `description: string | null` as non-optional to the local Task interface instead.

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors (or only the known `as any` suppressed warnings)

**Step 4: Smoke test in browser**

Run: `npm run dev`
1. Open `http://localhost:3000/dashboard`
2. Click a parent task row (not the checkbox) — TaskDetail panel should slide in from the right
3. Close the panel — task list refreshes
4. Click the checkbox directly — status should toggle without opening the panel
5. Click a subtask row — TaskDetail for that subtask opens

**Step 5: Commit**

```bash
git add src/components/dashboard/TaskStackWrapper.tsx
git commit -m "feat: TaskDetail panel in Active Commands — click task to open in-place"
```

---

### Task 5: Final verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: clean

**Step 2: End-to-end smoke test checklist**

- [ ] Parent task row body click → panel opens with correct task
- [ ] Subtask row click → panel opens for subtask
- [ ] Orphan subtask click → panel opens for orphan subtask
- [ ] Checkbox click (any row) → toggles status, does NOT open panel
- [ ] Panel close (X button) → panel closes, list refreshes with latest data
- [ ] Panel close (backdrop click) → same as above
- [ ] Deleting a task from panel → panel closes, task disappears from list
- [ ] Editing title in panel → after close, new title shows in Active Commands
- [ ] Parent task with due date today → "Today" label in amber on meta row
- [ ] Parent task with overdue date → "Overdue" label in red
- [ ] Parent task with no due date → no date chip; only difficulty + XP if non-zero
- [ ] Task with no stat weights → no XP shown on meta row; difficulty still shown
- [ ] Tree structure still intact (subtasks indented under parents)
- [ ] Subtask counter (2/3) still visible on parent rows

**Step 3: Commit if any minor fixes were needed**

```bash
git add -p
git commit -m "fix: active commands panel edge cases"
```
