## 🔍 Debug: Redirect Loop between /dashboard and /onboarding

### 1. Symptom

When navigating to `localhost:3000/dashboard`, the user was immediately redirected to `/onboarding`, which in turn redirected back to `/dashboard`, creating an infinite redirect loop.

### 2. Information Gathered

- **Error:** No explosive runtime error, just a silent failure resulting in a redirect loop.
- **File 1:** `src/app/dashboard/page.tsx` checks if `getUserStats()` returns a truthy value. If `null`, it redirects to `/onboarding`.
- **File 2:** `src/app/onboarding/page.tsx` fetches `dbUser?.onboarding_completed` (which was `true`), so it redirects back to `/dashboard`.
- **File 3:** `src/app/actions/tasks.ts` contains the `getUserStats()` function which fetches the user's stats from the database.

### 3. Hypotheses

1. ❓ The `user` table is missing the required XP columns in the database.
2. ❓ Row-Level Security (RLS) is blocking the read query unexpectedly.
3. ❓ The `getUserStats` query includes columns that don't exist in the database, causing the query to fail silently and return `null`.

### 4. Investigation

**Testing hypothesis 1 & 2:**
Looked at the previous migration plans (e.g., `docs/plans/2026-02-20-drop-drizzle.md`). The plan confirmed that the `strength_xp`, `intellect_xp`, etc. columns were successfully migrated and exist in the `user` table.

**Testing hypothesis 3:**
Looked closely at the `.select()` statement in `getUserStats()`:

```typescript
.select('strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, level, archetype')
```

I compared this query against the stated schema in the codebase. The `level` column doesn't exist in the database (it's calculated on the fly as `Math.floor(totalXP / 60) + 1`). Because `level` was requested in the `select()` array but wasn't in the database, Supabase returned an error. Since the code used `if (!userData) return null;` without logging the error, it failed silently, returning `null`.

### 5. Root Cause

🎯 **The `getUserStats` function requested a non-existent column (`level`) from the `user` table**, causing the query to fail silently. Because `getUserStats` returned `null`, the dashboard assumed the user had no profile and redirected to `/onboarding`. The `/onboarding` page requested a valid column (`onboarding_completed`), saw that the profile existed and was completed, and properly redirected back to `/dashboard`.

### 6. Fix

```typescript
// Before (in src/app/actions/tasks.ts)
const { data: userData } = await supabase
  .from("user")
  .select(
    "strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, level, archetype",
  )
  .eq("id", user.id)
  .single();

// After
const { data: userData, error } = await supabase
  .from("user")
  .select(
    "strength_xp, intellect_xp, discipline_xp, charisma_xp, creativity_xp, spirituality_xp, archetype",
  )
  .eq("id", user.id)
  .single();

if (error) {
  console.error("getUserStats error:", error);
}
```

_(The same correction was applied to the query in the `toggleTaskStatus` function.)_

### 7. Prevention

🛡️ Always destructure and log the `error` object from Supabase queries! Supabase JS will fail silently and return `data: null` if a single column name is misspelled, making it extremely difficult to track down missing-column errors without an explicitly logged error response.
