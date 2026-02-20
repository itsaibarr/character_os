# Design Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify all interactive accent colors to `#0056d2` and normalize onboarding font sizes across 6 files.

**Architecture:** Pure Tailwind class replacement — no logic changes. Extend the existing CSS variable system in `globals.css` with two new tokens, then replace stray `blue-*` Tailwind classes and oversized option text in each component. Changes are isolated per file with no cross-file dependencies.

**Tech Stack:** Next.js 15, Tailwind CSS v4, Plus Jakarta Sans

**Design doc:** `docs/plans/2026-02-20-design-unification-design.md`

---

## Context You Need

- `globals.css` uses Tailwind v4 syntax: `@import "tailwindcss"` with `@theme {}` for CSS variables.
- In v4, defining `--color-primary: #0056d2` in `@theme` makes `bg-primary`, `text-primary`, `border-primary` available as Tailwind classes.
- `--color-primary-hover: #0049b0` is already defined — use `bg-primary-hover` for hover states.
- The existing `--color-secondary: #e3f2fd` is the same value as the new `--color-primary-light` we're adding — they'll alias each other.
- No tests exist for styling. Verification is visual: run `npm run dev` and check each page.

---

### Task 1: Add new tokens to `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add two variables inside the existing `@theme {}` block**

In `src/app/globals.css`, after the line `--color-primary-hover: #0049b0;`, add:

```css
--color-primary-light: #e3f2fd;
--color-primary-ring: rgba(0, 86, 210, 0.15);
```

**Step 2: Update the `.input` component class**

The existing `.input` class has `focus:ring-2 focus:ring-blue-100`. Replace `focus:ring-blue-100` with `focus:ring-[var(--color-primary-ring)]`:

```css
.input {
  @apply w-full bg-white border border-slate-200 rounded-lg p-3 text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-[var(--transition-soft)];
}
```

**Step 3: Verify the file looks correct**

The full `@theme {}` block should now include:
```css
--color-primary: #0056d2;
--color-secondary: #e3f2fd;
--color-cta: #0056d2;
--color-text: #1e293b;
--color-primary-hover: #0049b0;
--color-primary-light: #e3f2fd;
--color-primary-ring: rgba(0, 86, 210, 0.15);
```

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add primary-light and primary-ring tokens to theme"
```

---

### Task 2: Fix `DashboardCommand.tsx`

**Files:**
- Modify: `src/components/dashboard/DashboardCommand.tsx`

**Step 1: Fix the focus ring on the form wrapper**

Line ~38-41. Change `ring-blue-50` and `border-blue-400` to use primary:

```tsx
isFocused
  ? "border-primary ring-4 ring-[var(--color-primary-ring)] shadow-primary/10"
  : "border-slate-200 shadow-slate-100"
```

**Step 2: Fix the terminal icon color on focus**

Line ~44. Change `text-blue-500` to `text-primary`:

```tsx
<Terminal className={clsx("w-5 h-5 transition-colors", isFocused && "text-primary")} />
```

**Step 3: Fix the submit button**

Line ~75-80. Change `bg-slate-900 ... shadow-slate-200` to use primary:

```tsx
inputValue.trim()
  ? "bg-primary text-white shadow-lg shadow-primary/20 active:scale-95"
  : "bg-slate-50 text-slate-300"
```

**Step 4: Commit**

```bash
git add src/components/dashboard/DashboardCommand.tsx
git commit -m "style: use primary accent on DashboardCommand submit and focus states"
```

---

### Task 3: Fix `StatGrid.tsx`

**Files:**
- Modify: `src/components/dashboard/StatGrid.tsx`

**Step 1: Fix the XP progress bar fill**

Line ~58. Change `bg-slate-900` to `bg-primary`:

```tsx
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${xpProgress}%` }}
  className="h-full bg-primary rounded-full"
/>
```

**Step 2: Commit**

```bash
git add src/components/dashboard/StatGrid.tsx
git commit -m "style: use primary accent on XP progress bar"
```

---

### Task 4: Fix accent colors in `OnboardingForm.tsx`

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx`

This file has many repeated instances of the same patterns. Work through each replacement methodically.

**Step 1: Replace all selected-option backgrounds/borders**

Find every instance of:
```
bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200
```
Replace with:
```
bg-primary text-white border-primary shadow-lg shadow-primary/20
```
There are 7 occurrences (steps 0–6 selected states).

**Step 2: Replace all unselected hover borders**

Find every instance of:
```
hover:border-blue-300
```
Replace with:
```
hover:border-primary/50
```
There are 7 occurrences.

**Step 3: Fix the Next button (active state)**

Find:
```tsx
"bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
```
Replace with:
```tsx
"bg-primary text-white hover:bg-primary-hover shadow-primary/20"
```

**Step 4: Fix the progress bar**

Find:
```tsx
className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
```
Replace with:
```tsx
className="h-full bg-primary shadow-[0_0_15px_rgba(0,86,210,0.4)]"
```

**Step 5: Fix archetype icon backgrounds and colors**

Find:
```tsx
formData.archetype === option.id ? "bg-white/20" : "bg-blue-50"
```
Replace with:
```tsx
formData.archetype === option.id ? "bg-white/20" : "bg-secondary"
```

Find (archetype and focus area icons):
```tsx
formData.focusAreas.includes(option.id) ? "text-white" : "text-blue-600"
```
Replace with:
```tsx
formData.focusAreas.includes(option.id) ? "text-white" : "text-primary"
```

Find (archetype icon):
```tsx
formData.archetype === option.id ? "text-white" : "text-blue-600"
```
Replace with:
```tsx
formData.archetype === option.id ? "text-white" : "text-primary"
```

**Step 6: Fix archetype description color on selected**

Find:
```tsx
formData.archetype === option.id ? "text-blue-100" : "text-slate-500"
```
Replace with:
```tsx
formData.archetype === option.id ? "text-white/70" : "text-slate-500"
```

**Step 7: Fix textarea focus states (steps 7 and 8)**

Find both textareas with:
```
focus:ring-blue-100 focus:border-blue-400
```
Replace with:
```
focus:ring-[var(--color-primary-ring)] focus:border-primary
```

**Step 8: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx
git commit -m "style: replace blue-* accent classes with primary tokens in OnboardingForm"
```

---

### Task 5: Normalize font sizes in `OnboardingForm.tsx`

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx`

**Step 1: Fix Step 3 capacity option text**

Find (inside the `currentStep === 3` block):
```tsx
<span className="font-bold text-2xl">{option}</span>
```
Replace with:
```tsx
<span className="font-semibold">{option}</span>
```

**Step 2: Fix Step 1 archetype label text**

Find:
```tsx
<div className="font-bold text-lg uppercase tracking-wider">{option.label}</div>
```
Replace with:
```tsx
<div className="font-bold text-base uppercase tracking-wider">{option.label}</div>
```

**Step 3: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx
git commit -m "style: normalize option button font sizes in OnboardingForm"
```

---

### Task 6: Fix `sign-in/page.tsx`

**Files:**
- Modify: `src/app/(auth)/sign-in/page.tsx`

**Step 1: Fix input focus border**

Find both input elements with `focus:border-blue-500`. Replace with `focus:border-primary`:

```tsx
className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
```

**Step 2: Fix the sign-up link color**

Find:
```tsx
<Link href="/sign-up" className="text-blue-600 hover:underline font-medium">Sign Up</Link>
```
Replace with:
```tsx
<Link href="/sign-up" className="text-primary hover:underline font-medium">Sign Up</Link>
```

**Step 3: Commit**

```bash
git add src/app/(auth)/sign-in/page.tsx
git commit -m "style: use primary accent on sign-in inputs and link"
```

---

### Task 7: Fix `sign-up/page.tsx`

**Files:**
- Modify: `src/app/(auth)/sign-up/page.tsx`

**Step 1: Fix input focus borders**

Find all three inputs with `focus:border-blue-500`. Replace each with `focus:border-primary`:

```tsx
className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
```

**Step 2: Fix the sign-in link color**

Find:
```tsx
<Link href="/sign-in" className="text-blue-600 hover:underline font-medium">Sign In</Link>
```
Replace with:
```tsx
<Link href="/sign-in" className="text-primary hover:underline font-medium">Sign In</Link>
```

**Step 3: Commit**

```bash
git add src/app/(auth)/sign-up/page.tsx
git commit -m "style: use primary accent on sign-up inputs and link"
```

---

### Task 8: Visual verification

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Check each page**

| Page | URL | What to verify |
|---|---|---|
| Hero | `http://localhost:3000` | Buttons render correctly |
| Sign In | `http://localhost:3000/sign-in` | Input focus border is `#0056d2`, link color matches |
| Sign Up | `http://localhost:3000/sign-up` | Same as sign-in |
| Onboarding | `http://localhost:3000/onboarding` | Progress bar is `#0056d2`, all selected states are `#0056d2`, step 3 capacity text matches other steps in size |
| Dashboard | `http://localhost:3000/dashboard` | Submit button is `#0056d2`, XP bar is `#0056d2` |

**Step 3: Verify no stray `blue-*` remain in component files**

```bash
grep -rn "blue-600\|blue-500\|blue-400\|blue-300\|blue-100\|blue-50" src/components src/app/onboarding src/app/\(auth\)
```

Expected: zero results (or only lines inside comments).
