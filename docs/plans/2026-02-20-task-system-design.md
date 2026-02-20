# Task System Enhancement — Design Doc

**Date:** 2026-02-20

---

## Goal

Upgrade the task model from a simple name+status record to a full task entity with description, priority, scheduling, subtasks, and XP rewards. Add a dedicated `/tasks` page with list + sidebar layout and a manual task creation panel.

---

## Database Schema Changes

### `tasks` table — new columns

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS due_date           timestamptz,
  ADD COLUMN IF NOT EXISTS parent_task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS xp_reward          smallint,
  ADD COLUMN IF NOT EXISTS gcal_event_id      text;  -- reserved for Google Calendar Phase 2
```

**Notes:**
- `xp_reward` is nullable — if null, falls back to `difficulty × multiplier` at completion time
- `parent_task_id` null = top-level task; non-null = subtask
- Subtasks cannot have their own subtasks (enforced at application layer, not DB)
- `gcal_event_id` reserved for Phase 2 Calendar integration, not used in this batch
- Existing columns stay unchanged: `content`, `status`, `priority`, `difficulty`, `str_weight`, `int_weight`, `dis_weight`, `cha_weight`, `cre_weight`, `spi_weight`

---

## `/tasks` Page Layout

```
Header: [ CH_OS ] [ Dashboard | Tasks | Radar ]     [ user@email ] [ logout ]

Body:
┌─────────────────────────────┐  ┌────────────────────────────────────┐
│  [ + New Task ]  [Filters▼] │  │  (empty state or selected task)    │
│─────────────────────────────│  │                                    │
│  ● Task A          INT●●    │  │  Title (editable inline)           │
│    Due: tomorrow            │  │  Description (textarea)            │
│  ● Task B          DIS●     │  │  Priority  [Low|Med|High]          │
│  ● Task C          CRE●●    │  │  Difficulty [Low|Med|High]         │
│    ↳ Subtask 1              │  │  Due Date  [date picker]           │
│    ↳ Subtask 2              │  │  ─────────────────────             │
│  ✓ Task D (completed)       │  │  Subtasks                          │
│                             │  │  ↳ [ + Add subtask ]              │
│                             │  │  ↳ Subtask 1  ✓                   │
│                             │  │  ─────────────────────             │
│                             │  │  XP Reward: +12 (INT ●●●● × med)  │
│                             │  │  Stat Tags: INT●●●● CRE●●          │
└─────────────────────────────┘  └────────────────────────────────────┘
```

**Filters:** All / Active / Completed (toggle group, default = Active)

**Subtasks in list:** Rendered indented below parent, no toggle — always visible when parent is visible.

---

## Manual Task Creation

A slide-in **sheet/drawer** triggered by "**+ New Task**" button. Fields:

| Field | Type | Required |
|---|---|---|
| Title | text input | yes |
| Description | textarea | no |
| Priority | select (Low / Med / High) | no (default: Medium) |
| Difficulty | select (Low / Med / High) | no (default: Medium) |
| Due Date | date input | no |
| Parent Task | searchable select of top-level tasks | no |

On submit:
1. Insert task to DB
2. Trigger AI stat classification in background (same `classifyTaskStats()` used by DashboardCommand)
3. Close sheet, select new task in list

---

## Task Actions

From the sidebar detail panel:
- **Complete** / **Uncomplete** — same toggle as current
- **Delete** — confirm dialog, cascades to subtasks
- **Add subtask** — inline input below subtasks list

No drag-and-drop, no status column changes beyond todo/completed.

---

## XP on Completion

Formula unchanged from the AI stat routing design:
```
xp_per_stat = stat_weight × difficulty_multiplier
difficulty_multiplier: low=1, medium=2, high=3
```

If `xp_reward` column is set (manual override), use that total as flat XP to discipline instead.

---

## Navigation

Add nav links to the dashboard header:

```
CH_OS logo  |  Dashboard  Tasks  Radar  |  user@email  logout
```

The same `<header>` component is extracted to a shared layout or duplicated across pages.

---

## Google Calendar — Phase 2 (not in this plan)

`gcal_event_id` column is added now. When a task has a `due_date`, a future plan will:
1. Use Google Calendar OAuth to create an event
2. Store the event ID in `gcal_event_id`
3. Sync status changes back

---

## Files Changed

| File | Change |
|---|---|
| Supabase SQL editor | Add 5 new columns to `tasks` |
| `src/app/tasks/page.tsx` | New page: list + sidebar layout |
| `src/components/tasks/TaskList.tsx` | Left panel: scrollable task list with subtasks |
| `src/components/tasks/TaskDetail.tsx` | Right panel: full task editing sidebar |
| `src/components/tasks/NewTaskSheet.tsx` | Drawer for manual task creation |
| `src/app/actions/tasks.ts` | `createTask` (accept new fields), new `updateTask`, `deleteTask`, `createSubtask` actions |
| `src/app/dashboard/page.tsx` | Add nav links to header |
| `src/app/layout.tsx` | Possibly extract shared nav, or leave per-page |
