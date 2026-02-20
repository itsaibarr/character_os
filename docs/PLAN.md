# XP & Character Evolution System - Orchestration Plan & Brainstorm

## 🎼 Orchestration Mode: Phase 1 (Planning)

Based on the `docs/plans/2026-02-20-xp-system.md` document, here is the execution plan for the orchestration phase.

---

## 🧠 Brainstorm: Technical Implementation of XP Calculation & Stat Distribution

### Context

When a task is completed, we need to award XP to the user's specific stats based on the task's AI-determined weights (`0-5`) and difficulty multiplier (`1x-3x`). At character level 5, we must determine the user's permanent Character Type based on their top 2 dominant stats.

---

### Option A: Database-Level Trigger & Function (PostgreSQL)

Create a Supabase trigger on the `tasks` table. When `status` changes to 'completed', a PL/pgSQL function runs to compute the XP, update the `users` table, check the character's level, and optionally mutate `character_type`.

✅ **Pros:**

- Guaranteed data consistency; XP logic runs atomically within the database.
- Faster execution, no extra network requests from the backend.

❌ **Cons:**

- PL/pgSQL is harder to debug, test, and adapt (especially the Character Type rating rules).
- Next.js Server Actions would need to wait for the trigger or rely on Supabase Realtime to update the UI.

📊 **Effort:** High

---

### Option B: Application-Level Server Actions (Next.js)

Handle the XP logic entirely in the existing `toggleTaskStatus` Server Action. The action will compute XP based on weights/difficulty, and perform a Supabase `update` on the user's stats using atomic increments, along with the TypeScript logic for Character Type determination.

✅ **Pros:**

- Logic stays in TypeScript (`src/app/actions/tasks.ts`), aligning with the rest of the application.
- Extremely easy to unit test and modify the ranking algorithm for character types (e.g. `isCombo` logic).
- UI can immediately reflect the new XP and Character State without needing to refetch from the DB.

❌ **Cons:**

- Slight potential for race conditions if atomic increments are not perfectly written in Supabase client queries.

📊 **Effort:** Medium

---

### Option C: Background Job / Webhook (Edge Function)

Next.js emits an event, and an asynchronous queue or Supabase Edge Function processes the XP awarding in the background.

✅ **Pros:**

- Decouples task completion from XP processing.
- The UI is perfectly unblocked, and task toggling is instant.

❌ **Cons:**

- Overkill for this stage; introduces eventual consistency which might confuse users trying to level up instantly.
- Significant infrastructure overhead.

📊 **Effort:** High

---

## 💡 Recommendation

**Option B (Application-Level Server Actions)** is the recommended approach. Maintaining complex sorting/combo logic (e.g. `isCombo('strength', 'discipline') -> 'soldier'`) in PL/pgSQL (Option A) is cumbersome and error-prone. Keeping the business logic in Next.js Server Actions allows for fast iteration, type safety, and immediate UI updates payload returns.

What direction would you like to explore? (Approve this plan and choose an option to trigger Phase 2 Implementation)

---

### Phase 2 Implementation Plan (Based on Option B)

**1. Database Schema Updates (`database-architect`)**

- Add XP columns to the `users` table: `strength_xp`, `intellect_xp`, `discipline_xp`, `charisma_xp`, `creativity_xp`, `spirituality_xp` (default `0`).
- Add `character_level` (default `1`).
- Add `character_type` (text, nullable).

**2. Backend Action Updates (`backend-specialist`)**

- Update `toggleTaskStatus` in `src/app/actions/tasks.ts`:
  - Fetch task's stat weights and difficulty upon completion.
  - Compute `xp_gained` for each stat.
  - Implement minimum guarantee: `+1 DIS` if all weights are `0`.
  - Atomically update user's XP arrays/columns.
  - Re-calculate total XP -> `character_level = floor(total_xp / 100) + 1`.
  - If calculated level >= 5 and `character_type` is currently null, run `getCharacterType(stats)` logic and update the user row.

**3. Frontend UI Component Updates (`frontend-specialist`)**

- Build the `CharacterDisplay.tsx` component (expected on the dashboard):
  - Calculate progress to the next evolving stage (Egg -> Child -> Adult -> Master).
  - Display corresponding image based on stage and type (`public/characters/{type}/{stage}.png`).
  - Render an XP progress bar showing progress within the current 100 XP bracket.

**4. Verification (`test-engineer`)**

- Run `python .agent/skills/lint-and-validate/scripts/lint_runner.py .`
- Run `python .agent/skills/database-design/scripts/schema_validator.py .` (if applicable)
- Provide manual testing instructions for the Developer to verify the character evolution flow by creating/completing a task with known weights.
