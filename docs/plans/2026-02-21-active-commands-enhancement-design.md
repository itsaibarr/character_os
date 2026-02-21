# Active Commands Enhancement Design

Date: 2026-02-21

## Problem

The Active Commands panel on the dashboard shows a flat list of tasks with minimal context. There is no way to distinguish parent tasks from subtasks visually (partially resolved by the tree refactor), and clicking a task does nothing. Each row only shows the title, priority dot, and stat dots — not enough to understand urgency, effort, or value at a glance.

## Goals

1. Clicking any task in Active Commands opens the `TaskDetail` panel in-place on the dashboard (same panel as `/tasks`, no navigation).
2. Parent task rows show a second meta line: due date, difficulty, and computed XP reward.

## Architecture

### No changes to `TaskDetail.tsx`

`TaskDetail` is already a fully standalone component. It renders at `fixed inset-0 z-50`, accepts `task`, `subtasks`, `onClose`, `onDeleted`, and `onToggleStatus` props, and calls server actions directly for updates. It can be mounted from any page.

### `TaskStackWrapper.tsx`

**New responsibilities:**
- Hold `selectedTaskId: string | null` state (initially `null`).
- Pass `onSelectTask: (id: string) => void` down to `TaskStack`.
- Render `<TaskDetail>` inside `<AnimatePresence>` — mirrors the pattern in `TasksPageClient`.
- On panel close (`onClose`, `onDeleted`): call `reloadTasks()` to re-fetch `allTasks` from the server so any edits made in the panel are reflected immediately.
- Expand the local `Task` interface to include `due_date`, `description`, and `xp_reward` so the full object can be passed to `TaskDetail`.

**Task detail callback wiring:**
- `onClose`: set `selectedTaskId` to `null`, reload tasks.
- `onDeleted`: set `selectedTaskId` to `null`, reload tasks.
- `onToggleStatus`: existing handler (already reloads).
- `subtasks`: derived from `allTasks.filter(t => t.parent_task_id === selectedTaskId)`.

### `TaskStack.tsx`

**New prop:** `onSelectTask?: (id: string) => void`

**Click handling:**
- Parent task row `div` gets `onClick={() => onSelectTask?.(task.id)}` and `cursor-pointer`.
- Checkbox `button` gets `onClick` wrapped with `e.stopPropagation()` to prevent opening the panel when toggling.
- Same pattern for subtask rows if `onSelectTask` is provided (subtask click also opens the panel for that subtask's detail).

**Two-line parent task rows:**

```
[○]  Call about Internship            [1/3]  ● ●●
     📅 Today  ·  Moderate  ·  +24 XP
```

Line 1 (existing): checkbox · title · subtask count · priority dot · stat dots
Line 2 (new meta row): due date chip · difficulty label · XP total

**Due date display logic:**
- No `due_date`: omit the date chip entirely.
- Past date (before today): show `"Overdue"` in `text-red-500`.
- Same calendar day as today: `"Today"` in `text-amber-500`.
- Next calendar day: `"Tomorrow"` in `text-text/60`.
- Further: short format `"Mar 5"` in `text-text/60`.

**XP computation (client-side, same formula as `TaskDetail`):**
```
mult = difficulty === "high" ? 3 : difficulty === "medium" ? 2 : 1
total = sum of (stat_weight * mult) for each of the 6 stats
```
If `xp_reward` is manually set on the task, use that value directly.
Display as `+{n} XP` in `text-emerald-500/70`. Omit if total is 0.

**Difficulty label:**
- `"low"` → `"Simple"`
- `"medium"` → `"Moderate"`
- `"high"` → `"Advanced"`
- Always shown (every task has a difficulty).

**Meta row styling:** `text-[10px] font-medium text-text/50`, items separated by a `·` divider.

**Subtask rows:** remain single-line. Clicking a subtask row calls `onSelectTask(subtask.id)` to open its detail panel.

**Task interface additions in `TaskStack.tsx`:**
```ts
due_date?: string | null;
description?: string | null;
xp_reward?: number | null;
```

## Data Flow

```
TaskStackWrapper
  ├── allTasks (all statuses, for subtask counts + full objects)
  ├── activeTasks (filtered todo/in-progress, displayed in tree)
  ├── selectedTaskId (local state)
  │
  ├── <TaskStack tasks={activeTasks} allTasks={allTasks} onSelectTask={setSelectedTaskId} ... />
  │     └── onClick on row → onSelectTask(id)
  │
  └── <AnimatePresence>
        <TaskDetail
          task={allTasks.find(t => t.id === selectedTaskId)}
          subtasks={allTasks.filter(t => t.parent_task_id === selectedTaskId)}
          onClose={() => { setSelectedTaskId(null); reloadTasks(); }}
          onDeleted={() => { setSelectedTaskId(null); reloadTasks(); }}
          onToggleStatus={handleToggleStatus}
        />
      </AnimatePresence>
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/TaskStackWrapper.tsx` | Add panel state, `TaskDetail` render, reload on close, expand Task interface |
| `src/components/dashboard/TaskStack.tsx` | Add `onSelectTask` prop, click handling, two-line meta row, expand Task interface |
| `src/components/tasks/TaskDetail.tsx` | No changes |

## Out of Scope

- Description excerpt on task rows (not requested).
- Animations for the meta row appearing/disappearing.
- Inline editing from the dashboard row (panel handles all edits).
