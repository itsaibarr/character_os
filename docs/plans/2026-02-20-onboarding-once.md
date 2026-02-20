# Onboarding Shown Once Per User — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure onboarding only appears the first time a user signs in; returning users go straight to `/dashboard`.

**Architecture:** The `user` table already has `onboardingCompleted boolean` (default `false`), set to `true` by `completeOnboarding()`. We fix three redirect sources — the onboarding page guard, the email/password sign-in handler, and the OAuth callback — to check this field and route accordingly. A shared server action `getOnboardingRedirect()` avoids duplicating the DB query.

**Tech Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM + PostgreSQL, Better Auth (email/password), Supabase Auth (OAuth/Google), `@/lib/db` for DB access.

---

### Task 1: Create `getOnboardingRedirect` server action

**Files:**
- Create: `src/app/actions/auth.ts`

**Step 1: Create the file**

```typescript
"use server";

import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function getOnboardingRedirect(): Promise<"/dashboard" | "/onboarding"> {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  const betterSession = await auth.api.getSession({ headers: await headers() });

  const userId = supabaseUser?.id || betterSession?.user?.id;
  if (!userId) return "/onboarding";

  const [dbUser] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return dbUser?.onboardingCompleted ? "/dashboard" : "/onboarding";
}
```

**Step 2: Verify the file exists and TypeScript is happy**

Run: `npx tsc --noEmit`
Expected: no errors related to `src/app/actions/auth.ts`

**Step 3: Commit**

```bash
git add src/app/actions/auth.ts
git commit -m "feat: add getOnboardingRedirect server action"
```

---

### Task 2: Guard the onboarding page

**Files:**
- Modify: `src/app/onboarding/page.tsx:21-29`

**Context:** Lines 21-29 have a commented-out check. The variable names are wrong (`users` instead of `userTable`, missing imports). Replace the entire commented block with a working version.

**Step 1: Replace the commented block**

In `src/app/onboarding/page.tsx`, replace the import section and the commented block:

Current imports (lines 1-5):
```typescript
import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";
```

Replace with:
```typescript
import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";
```

Then replace the commented block (lines 21-29):
```typescript
  // Optional: Check if already onboarded and redirect to dashboard
  /*
  const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
  });
  if (user?.onboardingCompleted) {
      redirect("/dashboard");
  }
  */
```

With:
```typescript
  const userId = supabaseUser?.id || betterSession?.user?.id;
  if (userId) {
    const [dbUser] = await db
      .select({ onboardingCompleted: userTable.onboardingCompleted })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    if (dbUser?.onboardingCompleted) {
      redirect("/dashboard");
    }
  }
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: guard onboarding page — redirect to dashboard if already onboarded"
```

---

### Task 3: Fix email/password sign-in redirect

**Files:**
- Modify: `src/app/(auth)/sign-in/page.tsx:1-34`

**Context:** This is a `"use client"` component. After `authClient.signIn.email` succeeds, `onSuccess` fires on the client. At that point the session cookie is already set, so calling a server action to read the session works. We import `getOnboardingRedirect` and use its result instead of hardcoding `/onboarding`.

**Step 1: Add the import**

At the top of the file, after the existing imports, add:
```typescript
import { getOnboardingRedirect } from "@/app/actions/auth"
```

**Step 2: Update the `signIn` function**

Current `onSuccess` callback (line 26-28):
```typescript
            onSuccess: () => {
              router.push("/onboarding")
            },
```

Replace with:
```typescript
            onSuccess: async () => {
              const destination = await getOnboardingRedirect()
              router.push(destination)
            },
```

Also remove the now-unused `callbackURL` from `authClient.signIn.email` (line 21):
```typescript
        callbackURL: "/onboarding", // redirect to onboarding after sign in
```
Delete that line entirely.

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add "src/app/(auth)/sign-in/page.tsx"
git commit -m "feat: route returning users to dashboard on email sign-in"
```

---

### Task 4: Fix OAuth callback redirect

**Files:**
- Modify: `src/app/auth/callback/route.ts`

**Context:** After `supabase.auth.exchangeCodeForSession(code)` succeeds, the Supabase session is live. We can then check the `user` table for `onboardingCompleted`. If the Supabase user hasn't gone through onboarding yet (not in `user` table), treat that as "not onboarded". Also remove the hardcoded `?next=/onboarding` from the Google OAuth button in sign-in since the callback now decides dynamically.

**Step 1: Rewrite the callback route**

Replace the entire file content:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/lib/db'
import { user as userTable } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      let destination = '/onboarding'
      if (user) {
        const [dbUser] = await db
          .select({ onboardingCompleted: userTable.onboardingCompleted })
          .from(userTable)
          .where(eq(userTable.id, user.id))
          .limit(1)
        if (dbUser?.onboardingCompleted) {
          destination = '/dashboard'
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${destination}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`)
      } else {
        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

**Step 2: Remove hardcoded `?next=/onboarding` from sign-in Google button**

In `src/app/(auth)/sign-in/page.tsx`, find the Google OAuth button (line 55):
```typescript
                    redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
```

Replace with:
```typescript
                    redirectTo: `${window.location.origin}/auth/callback`,
```

Also do the same in `src/app/(auth)/sign-up/page.tsx` if it has the same pattern (check line ~57).

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add src/app/auth/callback/route.ts "src/app/(auth)/sign-in/page.tsx" "src/app/(auth)/sign-up/page.tsx"
git commit -m "feat: route returning OAuth users to dashboard in auth callback"
```

---

## Manual Testing Checklist

After all tasks are done, verify these scenarios:

1. **New user (email/password):** Sign up → should land on `/onboarding` → complete it → should land on `/dashboard`
2. **Returning user (email/password):** Sign in again → should go directly to `/dashboard`, never hitting onboarding
3. **New user (Google OAuth):** Sign in with Google → should land on `/onboarding` → complete it → should land on `/dashboard`
4. **Returning user (Google OAuth):** Sign in with Google again → should go directly to `/dashboard`
5. **Direct URL attempt:** While signed in as a returning user, navigate directly to `/onboarding` → should be redirected to `/dashboard`
