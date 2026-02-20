# Design Unification — CharacterOS

**Date:** 2026-02-20
**Accent color:** `#0056d2`
**Approach:** CSS variable everywhere (Option A)

---

## Goal

Unify all interactive accent colors to `#0056d2` across the app and normalize inconsistent font sizes in the onboarding flow. The design system token (`--color-primary`) already holds the correct value — components simply need to use it consistently.

---

## Token Changes (`globals.css`)

Add two new variables to `@theme`:

```css
--color-primary-light: #e3f2fd;        /* soft bg for hover/icon backgrounds */
--color-primary-ring: rgba(0, 86, 210, 0.15);  /* focus ring color */
```

Update `.input` focus ring to use `--color-primary-ring`.

---

## Component Changes

### `DashboardCommand.tsx`
- Submit button: `bg-slate-900` → `bg-primary`
- Submit button shadow: `shadow-slate-200` → `shadow-primary/20`
- Focus ring: `ring-blue-50` → `ring-[var(--color-primary-ring)]`
- Border on focus: `border-blue-400` → `border-primary`
- Terminal icon on focus: `text-blue-500` → `text-primary`

### `StatGrid.tsx`
- XP progress bar: `bg-slate-900` → `bg-primary`

### `OnboardingForm.tsx`
**Accent replacements:**
- All selected option states: `bg-blue-600 border-blue-600` → `bg-primary border-primary`
- All selected option shadows: `shadow-blue-200` → `shadow-primary/20`
- All unselected hover borders: `hover:border-blue-300` → `hover:border-primary/50`
- Archetype icon bg (unselected): `bg-blue-50` → `bg-secondary`
- Archetype/focus icons (unselected): `text-blue-600` → `text-primary`
- Archetype selected description: `text-blue-100` → `text-white/70`
- Progress bar: `bg-blue-600` → `bg-primary`
- Progress bar glow: `rgba(37,99,235,0.4)` → `rgba(0,86,210,0.4)`
- Textarea focus: `focus:ring-blue-100 focus:border-blue-400` → `focus:ring-[var(--color-primary-ring)] focus:border-primary`
- Next button (active): `bg-blue-600 hover:bg-blue-700 shadow-blue-100` → `bg-primary hover:bg-primary-hover shadow-primary/20`

**Font size normalizations:**
- Step 1 archetype label: `text-lg` → `text-base`
- Step 3 capacity options: `text-2xl font-bold` → `text-base font-semibold`

### `sign-in/page.tsx`
- Input focus border: `focus:border-blue-500` → `focus:border-primary`
- Link color: `text-blue-600` → `text-primary`

### `sign-up/page.tsx`
- Input focus border: `focus:border-blue-500` → `focus:border-primary`
- Link color: `text-blue-600` → `text-primary`

---

## What Does NOT Change

| Element | Reason |
|---|---|
| Stat card icon colors (red/amber/purple/etc.) | Intentional RPG palette |
| `bg-green-500` on completed tasks | Semantic success color |
| `bg-slate-900` logo diamond | Brand mark |
| Scrollbar dark colors | Intentional terminal aesthetic |
| All font sizes except noted above | Already consistent |
| Plus Jakarta Sans font | Single font, no change needed |

---

## Files Touched

1. `src/app/globals.css`
2. `src/components/dashboard/DashboardCommand.tsx`
3. `src/components/dashboard/StatGrid.tsx`
4. `src/app/onboarding/OnboardingForm.tsx`
5. `src/app/(auth)/sign-in/page.tsx`
6. `src/app/(auth)/sign-up/page.tsx`
