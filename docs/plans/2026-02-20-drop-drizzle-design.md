# Drop Drizzle — Full Supabase Client

**Date:** 2026-02-20
**Goal:** Remove Drizzle ORM entirely and replace all database queries with the Supabase JS client. Use generated TypeScript types for type safety.

---

## Context

Better Auth was already removed (merged to main via `feature/drop-better-auth`). Supabase Auth is the sole auth layer. Drizzle ORM remains as the data layer, connected to Supabase Postgres via the `postgres` driver. This migration completes the consolidation — one client (`@supabase/supabase-js`) handles both auth and data.

---

## Architecture

- **Auth:** Supabase Auth via `@supabase/ssr` — unchanged
- **Data:** Supabase JS client (`supabase.from('table')`) — replaces Drizzle
- **Types:** Generated via `npx supabase gen types typescript` → `src/types/supabase.ts`
- **DB client helper:** Existing `src/utils/supabase/server.ts` `createClient()` is reused for data queries (same instance already used in every server action for auth)

---

## Files Deleted

| File | Reason |
|------|--------|
| `src/lib/db.ts` | Drizzle client |
| `src/db/schema.ts` | Drizzle schema |
| `drizzle.config.ts` | Drizzle config |
| `drizzle/` | Migration files |

**Packages removed:** `drizzle-orm`, `drizzle-kit`, `postgres`, `pg`

**Worktree removed:** `.worktrees/drop-better-auth` + `feature/drop-better-auth` branch (already merged to main)

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/actions/tasks.ts` | Replace all Drizzle queries with Supabase client |
| `src/app/actions/onboarding.ts` | Replace all Drizzle queries with Supabase client |
| `src/app/actions/auth.ts` | Replace Drizzle query with Supabase client |
| `src/app/onboarding/page.tsx` | Replace Drizzle query with Supabase client |
| `package.json` | Remove Drizzle + postgres packages |

**Files added:** `src/types/supabase.ts` (generated)

---

## Query Pattern

```ts
// Before (Drizzle)
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const [userData] = await db.select()
  .from(userTable)
  .where(eq(userTable.id, user.id))
  .limit(1);

// After (Supabase)
const supabase = await createClient();
const { data: userData } = await supabase
  .from('user')
  .select('*')
  .eq('id', user.id)
  .single();
```

---

## What Stays the Same

- `src/utils/supabase/server.ts`, `client.ts`, `middleware.ts`
- All UI components
- All auth flows
- `@supabase/ssr` and `@supabase/supabase-js` packages
