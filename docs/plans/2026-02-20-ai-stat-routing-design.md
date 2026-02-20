# AI Stat Routing — CharacterOS

**Date:** 2026-02-20
**Feature:** AI-powered stat classification for task XP routing
**Approach:** Multi-stat weight distribution (Option A)

---

## Goal

Connect OpenRouter to the task creation flow so the AI analyzes each task's content and assigns XP weights to the 6 character stats (STR, INT, DIS, CHA, CRE, SPI). When a task is completed, those weights determine which stats gain XP and how much.

---

## Database Schema

Add 6 weight columns to the `tasks` table via migration:

```sql
ALTER TABLE tasks
  ADD COLUMN str_weight smallint DEFAULT 0,
  ADD COLUMN int_weight smallint DEFAULT 0,
  ADD COLUMN dis_weight smallint DEFAULT 0,
  ADD COLUMN cha_weight smallint DEFAULT 0,
  ADD COLUMN cre_weight smallint DEFAULT 0,
  ADD COLUMN spi_weight smallint DEFAULT 0;
```

Weights are written at task creation and read at completion. No re-analysis on toggle.

---

## AI Prompt

System prompt for OpenRouter (`classifyTaskStats` in `src/lib/ai.ts`):

```
You are an RPG stat classifier for a productivity app.
Given a task description, assign XP weights (0-5) to each stat:
- STR (Strength): physical effort, health, exercise
- INT (Intellect): learning, research, reading, coding, problem-solving
- DIS (Discipline): admin, deadlines, consistency, boring-but-necessary
- CHA (Charisma): communication, writing, networking, sales, teaching
- CRE (Creativity): design, art, building, brainstorming, music
- SPI (Spirituality): reflection, mindfulness, journaling, rest

Return ONLY valid JSON: {"str":0,"int":0,"dis":0,"cha":0,"cre":0,"spi":0}
```

Uses `generateObject` from the Vercel AI SDK with a Zod schema. Timeout: 3 seconds. On failure, falls back to keyword-based classification (current behavior).

---

## XP Award Formula

On task completion, for each stat with `weight > 0`:

```
xp_gained = weight × difficulty_multiplier
  difficulty_multiplier: low=1, medium=2, high=3
```

Examples:
- "Read 50 pages of a textbook" → INT:4, DIS:2 at medium difficulty = INT+8, DIS+4
- "Run 10km" → STR:5, DIS:3 at medium difficulty = STR+10, DIS+6
- "Design new landing page" → CRE:4, INT:2 at medium difficulty = CRE+8, INT+4

Un-completing a task does NOT subtract XP.

---

## TaskStack UI

Each task card shows stat badges for non-zero weights, e.g.:
```
INT ●●●● CRE ●●
```
Filled dots = weight level (out of 5). Only non-zero stats shown.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/TIMESTAMP_add_task_stat_weights.sql` | Add 6 weight columns |
| `src/lib/ai.ts` | Add `classifyTaskStats(content: string)` |
| `src/app/actions/tasks.ts` | `createTask` calls AI + stores weights; `toggleTaskStatus` reads weights + awards multi-stat XP |
| `src/components/dashboard/TaskStack.tsx` | Show stat weight badges on each task card |

---

## What Does NOT Change

- `DashboardCommand.tsx` — already calls `onTaskCreated`, no change needed
- Onboarding flow
- Auth
- `getUserStats` — reads same XP columns, no change
- `StatGrid` — reads same stats, no change
