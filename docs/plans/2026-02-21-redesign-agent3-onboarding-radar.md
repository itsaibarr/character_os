# Redesign Agent 3: Onboarding + Radar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the onboarding wizard to use numbered step dots (not a progress bar), clean selection tiles (no shadow-lg on selected), and proper accent tokens. Redesign the radar page to use AppSidebar, a larger chart, and an editorial stat table.

**Architecture:** Onboarding stays a full-page wizard but replaces the filled-background card selections with clean bordered tiles using accent tokens. Radar page drops `AppHeader` for `AppSidebar`, increases chart size to 320px, and replaces the card-wrapped stat table with a borderless editorial table.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `motion/react`, `lucide-react`, `clsx`

**Dependency:** Agent 1 must have committed `globals.css` changes first. This plan uses tokens: `text-accent`, `bg-accent`, `border-accent`, `bg-accent-muted`, `bg-canvas`, `text-text`, `text-muted`, `text-faint`, `border-border`, `border-border-faint`.

---

### Task 1: Redesign OnboardingForm — Numbered Dots, Clean Tiles

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx`

**Context:** The current onboarding has: a thin progress bar, `bg-primary text-white border-primary shadow-lg shadow-primary/20` selected tiles, and `shadow-xl` on the submit button. The "AI design" signals here are the glowing card-selected states and the over-styled button. Replace selection tiles with `border-accent bg-accent-muted text-accent` for selected, and `border-border bg-canvas text-text` for unselected. Replace the progress bar with numbered step dots. Replace the submit button's shadow with a clean rounded-full accent button.

**Step 1: Add the numbered step dots, replace progress bar**

In `src/app/onboarding/OnboardingForm.tsx`, find the progress bar block:

```tsx
// Current:
<div className="mb-6">
  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
    <motion.div
      className="h-full bg-primary shadow-[0_0_15px_rgba(0,86,210,0.4)]"
      initial={{ width: "0%" }}
      animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
    />
  </div>
</div>
// Replace with:
<div className="mb-8 flex items-center gap-1.5">
  {steps.map((_, i) => (
    <motion.div
      key={i}
      animate={{
        width: i === currentStep ? 20 : 8,
        backgroundColor: i < currentStep ? "#0056D2" : i === currentStep ? "#0056D2" : "#e2e8f0",
        opacity: i === currentStep ? 1 : i < currentStep ? 0.5 : 0.4,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-1.5 rounded-full"
    />
  ))}
  <span className="ml-2 text-[10px] font-bold text-faint uppercase tracking-widest">
    {currentStep + 1}/{steps.length}
  </span>
</div>
```

**Step 2: Update ALL selected tile class strings**

Search for every instance of this pattern and replace:

```tsx
// Current selected tile class (appears in steps 0, 1, 2, 3, 4, 5, 6):
"bg-primary text-white border-primary shadow-lg shadow-primary/20"
// Replace ALL with:
"bg-accent-muted text-accent border-accent"
```

There are multiple occurrences. Replace every one of them.

**Step 3: Update the unselected tile hover state**

```tsx
// Current unselected:
"bg-white border-slate-200 text-slate-700 hover:border-primary/50 shadow-sm"
// Replace ALL with:
"bg-canvas border-border text-text hover:border-slate-300"
```

**Step 4: Update icon colors in selected tiles**

For steps 0 and 1 that use icons:
```tsx
// Current:
<option.icon className={clsx("w-5 h-5", formData.focusAreas.includes(option.id) ? "text-white" : "text-primary")} />
// Replace with:
<option.icon className={clsx("w-5 h-5", formData.focusAreas.includes(option.id) ? "text-accent" : "text-muted")} />
```

For the archetype icon container (step 1):
```tsx
// Current:
<div className={clsx("p-2 rounded-lg transition-colors", formData.archetype === option.id ? "bg-white/20" : "bg-secondary")}>
  <option.icon className={clsx("w-5 h-5", formData.archetype === option.id ? "text-white" : "text-primary")} />
</div>
// Replace with:
<div className={clsx("p-2 rounded-lg transition-colors", formData.archetype === option.id ? "bg-accent/10" : "bg-slate-50")}>
  <option.icon className={clsx("w-5 h-5", formData.archetype === option.id ? "text-accent" : "text-muted")} />
</div>
```

**Step 5: Update the Check icon color in selected states**

```tsx
// Step 2 (frictionProfile):
{formData.frictionProfile === option && <Check className="w-5 h-5" />}
// The icon inherits text color. Since selected tiles now use text-accent, this is fine — verify it renders correctly.
```

**Step 6: Update textarea input focus styles**

Steps 7 and 8 have text areas:
```tsx
// Current:
className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-base font-medium focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-primary outline-none transition-all resize-none shadow-sm"
// Replace with:
className="w-full p-4 rounded-xl border border-border bg-canvas text-base font-medium focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-accent outline-none transition-all resize-none"
```

**Step 7: Update the Next/Submit button**

```tsx
// Current:
className={clsx(
  "group flex items-center space-x-3 px-10 py-4 rounded-full font-bold transition-all shadow-xl",
  isStepValid() && !isSubmitting
    ? "bg-primary text-white hover:bg-primary-hover shadow-primary/20"
    : "bg-slate-100 text-slate-400 cursor-not-allowed"
)}
// Replace with:
className={clsx(
  "group flex items-center space-x-3 px-8 py-3.5 rounded-full font-bold transition-all",
  isStepValid() && !isSubmitting
    ? "bg-accent text-white hover:brightness-110 active:scale-[0.98]"
    : "bg-slate-100 text-faint cursor-not-allowed"
)}
```

**Step 8: Update the Back button**

```tsx
// Current:
className={clsx("text-slate-400 font-bold hover:text-slate-600 transition-colors", currentStep === 0 && "invisible")}
// Replace with:
className={clsx("text-faint font-semibold hover:text-muted transition-colors", currentStep === 0 && "invisible")}
```

**Step 9: Update the page wrapper (onboarding/page.tsx)**

Open `src/app/onboarding/page.tsx`. If it has `bg-[#F8FAFC]` or similar, update to `bg-canvas`.

**Step 10: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 11: Verify no `primary` references remain in onboarding**

```bash
grep -r "primary" /home/itsaibarr/projects/character-development/src/app/onboarding/ --include="*.tsx"
```

Expected: no output.

**Step 12: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx src/app/onboarding/page.tsx
git commit -m "design: onboarding → numbered step dots, clean bordered tiles, accent tokens, no shadow-lg"
```

---

### Task 2: Enlarge RadarPageChart — 320px, Stronger Entrance Animation

**Files:**
- Modify: `src/components/radar/RadarPageChart.tsx`

**Context:** Read the current file first with the Read tool. It's likely similar to the inline radar in StatGrid. The goal is to increase the SVG to 320×320 (was 240 or similar), make the background rings use `border-faint` color (`#F1F5F9`), strengthen the polygon entrance animation (add 0.3s delay so it lands after the page), and increase vertex dot radius to 3.5px.

**Step 1: Read the current file**

Use the Read tool to read `src/components/radar/RadarPageChart.tsx` fully before making changes.

**Step 2: Update the SIZE constant**

Find the `SIZE` (or equivalent) constant at the top. Change it from whatever it currently is to `320`:

```tsx
const SIZE = 320;  // was 240 or similar
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 110;  // was 80 — scale proportionally with new SIZE
```

**Step 3: Strengthen polygon entrance**

Find the `<motion.polygon>` element:

```tsx
// Current (approximately):
<motion.polygon
  initial={{ points: zeroPoints }}
  animate={{ points: finalPoints }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  ...
/>
// Replace with:
<motion.polygon
  initial={{ points: zeroPoints }}
  animate={{ points: finalPoints }}
  transition={{ duration: 1.0, ease: "easeOut", delay: 0.3 }}
  ...
/>
```

**Step 4: Update vertex dot radius and transition**

Find the `<motion.circle>` elements for vertex dots:

```tsx
// Current:
r={3}  // or similar
// Replace:
r={3.5}
// Also add delay to match polygon:
transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
```

**Step 5: Lighten background ring stroke color**

Find the ring polygon stroke:
```tsx
stroke="#e2e8f0"  // or similar slate-200
// Replace with the border-faint equivalent:
stroke="#F1F5F9"
```

**Step 6: Update axis line stroke color similarly**

```tsx
stroke="#e2e8f0"  // axis lines
// Replace with:
stroke="#F1F5F9"
```

**Step 7: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 8: Commit**

```bash
git add src/components/radar/RadarPageChart.tsx
git commit -m "design: RadarPageChart → 320px, stronger entrance animation, lighter ring strokes"
```

---

### Task 3: Redesign Radar Page — AppSidebar, Editorial Stat Table

**Files:**
- Modify: `src/app/radar/page.tsx`

**Context:** Current page uses `AppHeader`. Replace with `AppSidebar`. The page has a `bg-[#F8FAFC]` background — change to `bg-canvas`. The stat table is currently wrapped in `bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm` — remove all of that, use a plain `border-t border-border` separator. Add staggered entrance animation to stat rows using a client wrapper component OR use a simple CSS approach (since the page is a server component, add motion animations via a new client component or inline the table into a client component).

**Step 1: Update imports**

In `src/app/radar/page.tsx`:
```tsx
// Remove:
import AppHeader from "@/components/AppHeader";
// Add:
import AppSidebar from "@/components/AppSidebar";
```

**Step 2: Update the page wrapper**

```tsx
// Current:
return (
  <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100">
    <AppHeader userEmail={user.email!} currentPath="/radar" />
    <main className="max-w-2xl mx-auto px-6 py-12">
// Replace with:
return (
  <div className="min-h-screen bg-canvas text-text selection:bg-accent-muted">
    <AppSidebar userEmail={user.email!} />
    <main className="ml-12 max-w-2xl mx-auto px-8 py-10">
```

**Step 3: Update the page header section**

```tsx
// Current:
<div className="text-center mb-8">
  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Stat Analysis</div>
  <h1 className="text-2xl font-black tracking-tight text-slate-900">Radar Chart</h1>
</div>
// Replace with:
<div className="mb-8">
  <div className="text-[10px] font-black text-faint uppercase tracking-widest mb-1">Stat Analysis</div>
  <h1 className="text-2xl font-black tracking-tight text-text">Radar</h1>
</div>
```

**Step 4: Update radar chart container**

```tsx
// Current:
<div className="flex justify-center mb-10">
  <RadarPageChart values={normalizedValues} />
</div>
// Replace with:
<div className="flex justify-center mb-8">
  <RadarPageChart values={normalizedValues} />
</div>
```

**Step 5: Replace the stat table card wrapper**

```tsx
// Current:
<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
  <div className="grid grid-cols-4 px-5 py-2 border-b border-slate-100">
    {['Stat', 'XP', 'Level', 'Progress'].map(h => (
      <span key={h} className={`text-[10px] font-black text-slate-400 uppercase tracking-widest ${h !== 'Stat' ? 'text-right' : ''}`}>{h}</span>
    ))}
  </div>
  {statRows.map((row, i) => (
    <div key={row.key} className={`grid grid-cols-4 items-center px-5 py-3 ${i < statRows.length - 1 ? 'border-b border-slate-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.dotBg}`} />
        <span className="text-sm font-bold text-slate-700">{row.label}</span>
      </div>
      <span className="text-sm font-black text-slate-900 text-right">{row.xp}</span>
      <span className="text-sm font-bold text-slate-500 text-right">Lv.{row.level}</span>
      <div className="flex justify-end">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${row.dotBg} opacity-60`} style={{ width: `${(row.xp % 10) * 10}%` }} />
        </div>
      </div>
    </div>
  ))}
</div>
// Replace with:
<div className="border-t border-border pt-6">
  <div className="grid grid-cols-4 pb-2 border-b border-border-faint">
    {['Stat', 'XP', 'Level', 'Progress'].map(h => (
      <span key={h} className={`text-[10px] font-black text-faint uppercase tracking-widest ${h !== 'Stat' ? 'text-right' : ''}`}>{h}</span>
    ))}
  </div>
  {statRows.map((row, i) => (
    <div key={row.key} className={`grid grid-cols-4 items-center py-3 ${i < statRows.length - 1 ? 'border-b border-border-faint' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${row.dotBg}`} />
        <span className="text-sm font-semibold text-text">{row.label}</span>
      </div>
      <span className="text-sm font-black text-text text-right">{row.xp}</span>
      <span className="text-sm font-medium text-muted text-right">Lv.{row.level}</span>
      <div className="flex justify-end">
        <div className="w-20 h-[3px] bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${row.dotBg} opacity-70`} style={{ width: `${(row.xp % 10) * 10}%` }} />
        </div>
      </div>
    </div>
  ))}
</div>
```

**Step 6: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 7: Verify no `AppHeader` or `primary` references remain in radar**

```bash
grep -r "AppHeader\|primary" /home/itsaibarr/projects/character-development/src/app/radar/ --include="*.tsx"
grep -r "AppHeader\|primary" /home/itsaibarr/projects/character-development/src/components/radar/ --include="*.tsx"
```

Expected: no output.

**Step 8: Commit**

```bash
git add src/app/radar/page.tsx
git commit -m "design: radar page → AppSidebar, ml-12, editorial stat table, no card wrapper"
```

---

### Task 4: Final Sweep — Remove AppHeader, Verify Full Build

**Files:**
- Check: `src/components/AppHeader.tsx` (can be deleted after confirming no usages)
- Verify: all pages build without errors

**Step 1: Check if AppHeader is still referenced anywhere**

```bash
grep -r "AppHeader" /home/itsaibarr/projects/character-development/src/ --include="*.tsx" --include="*.ts"
```

If zero results: proceed to delete it.
If results found: go fix those files first (update them to use AppSidebar).

**Step 2: Delete AppHeader (if no remaining usages)**

```bash
rm /home/itsaibarr/projects/character-development/src/components/AppHeader.tsx
```

**Step 3: Run full TypeScript check**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1
```

Expected: zero errors. If errors appear, fix them before continuing.

**Step 4: Do a full primary token sweep across all source files**

```bash
grep -r "text-primary\|bg-primary\|border-primary\|ring-primary\|shadow-primary\|color-primary\|primary-dark\|primary-light\|primary-ring\|primary-hover" /home/itsaibarr/projects/character-development/src/ --include="*.tsx" --include="*.ts" --include="*.css" -l
```

For each file returned: open it, find the usages, and replace:
- `text-primary` → `text-accent`
- `bg-primary` → `bg-accent`
- `border-primary` → `border-accent`
- `ring-primary` → `ring-accent`
- `shadow-primary` → remove (no equivalent — just delete shadow-primary classes)
- `--color-primary` CSS var references in style attributes → `var(--color-accent)`

**Step 5: Run TypeScript check again**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "design: remove AppHeader, sweep all remaining primary→accent token references"
```

**Step 7: Verify dev server starts without errors**

```bash
cd /home/itsaibarr/projects/character-development && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no errors. If build errors appear, read the error messages carefully and fix the specific files mentioned.
