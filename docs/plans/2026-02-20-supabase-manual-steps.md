# Manual Steps: Complete Supabase Migration

Run these in order. Each section is one SQL Editor session in Supabase Dashboard.

---

## Step 1 — User Sync Trigger

**Where:** Supabase Dashboard → SQL Editor → New query

```sql
-- Function: auto-sync new auth users into public.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user (id, email, name, "emailVerified", "createdAt", "updatedAt")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE((new.email_confirmed_at IS NOT NULL), false),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after every new user in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Verify:** Dashboard → Database → Functions → confirm `handle_new_user` is listed.

---

## Step 2 — Backfill Existing Users

**Where:** Supabase Dashboard → SQL Editor → New query

```sql
INSERT INTO public.user (id, email, name, "emailVerified", "createdAt", "updatedAt")
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE((email_confirmed_at IS NOT NULL), false),
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

**Verify:** Dashboard → Table Editor → `user` table → confirm rows exist for your auth users.

---

## Step 3 — Drop Better Auth Tables + Ensure Tasks Table

**Where:** Supabase Dashboard → SQL Editor → New query

```sql
-- Drop Better Auth foreign keys
ALTER TABLE IF EXISTS "account" DROP CONSTRAINT IF EXISTS "account_userId_user_id_fk";
ALTER TABLE IF EXISTS "session" DROP CONSTRAINT IF EXISTS "session_userId_user_id_fk";

-- Drop Better Auth tables
DROP TABLE IF EXISTS "verification";
DROP TABLE IF EXISTS "account";
DROP TABLE IF EXISTS "session";

-- Ensure tasks table exists with correct structure
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "content" text NOT NULL,
  "status" text DEFAULT 'todo' NOT NULL,
  "priority" text DEFAULT 'medium',
  "difficulty" text DEFAULT 'medium',
  "due_date" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Ensure FK on tasks
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_user_id_user_id_fk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id");
```

**Verify:** Dashboard → Table Editor → confirm `session`, `account`, `verification` are gone and `tasks` exists.

---

## Step 4 — Push Code to Remote

**Where:** Terminal in project root

```bash
git push
```

---

## Done

Once all 4 steps are complete the migration is fully live.
