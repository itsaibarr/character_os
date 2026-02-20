# Onboarding Shown Once Per User — Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

Onboarding starts on every login. The `onboardingCompleted` boolean already exists in the `user` table and is set to `true` when the user finishes onboarding, but nothing checks it to gate further visits.

## Solution

Check `onboardingCompleted` at each auth exit point and route accordingly:
- `false` (new user) → `/onboarding`
- `true` (returning user) → `/dashboard`

## Touch Points

### 1. `src/app/onboarding/page.tsx`
Add server-side guard at the top: if the authenticated user has `onboardingCompleted = true`, redirect to `/dashboard` before rendering. This is a safety net for any path that lands on `/onboarding`.

### 2. `src/app/(auth)/sign-in/page.tsx`
After successful email/password login, check `onboardingCompleted` and route to `/dashboard` or `/onboarding` accordingly.

### 3. `src/app/auth/callback/route.ts`
OAuth callback currently hardcodes redirect to `/onboarding`. Replace with the same check.

### 4. `src/app/(auth)/sign-up/page.tsx`
No change needed — new users always have `onboardingCompleted = false`.

## Shared Utility

Add `getOnboardingStatus(userId)` (or reuse existing DB query pattern) to avoid duplicating the DB query across sign-in and the OAuth callback.

## Files Changed

| File | Change |
|------|--------|
| `src/app/onboarding/page.tsx` | Add guard redirect if `onboardingCompleted = true` |
| `src/app/(auth)/sign-in/page.tsx` | Check status after login, route accordingly |
| `src/app/auth/callback/route.ts` | Replace hardcoded `/onboarding` with status check |
| `src/lib/onboarding.ts` (new) | `getOnboardingStatus(userId)` utility |
