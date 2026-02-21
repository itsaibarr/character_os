# Redesign Agent 2: Tasks Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the full tasks experience — flat row-based task list (no card wrappers), right-side slide-in detail panel (not a centered modal), and a clean new task form.

**Architecture:** `TasksPageClient` keeps its two-pane layout (filter rail + list). `TaskList` rows become flat divider-separated items, not cards. `TaskDetail` becomes a fixed right panel (`translateX` slide-in), not a centered modal overlay. `NewTaskSheet` keeps its right-panel pattern but strips generic AI styling.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `motion/react`, `lucide-react`, `clsx`

**Dependency:** Agent 1 must have committed `globals.css` changes first. This plan uses tokens: `text-accent`, `bg-accent`, `border-accent`, `bg-accent-muted`, `bg-canvas`, `text-text`, `text-muted`, `text-faint`, `border-border`, `border-border-faint`.

---

### Task 1: Update TasksPageClient — Page Layout and AppSidebar

**Files:**
- Modify: `src/app/tasks/page.tsx`
- Modify: `src/app/tasks/TasksPageClient.tsx`

**Context:** `tasks/page.tsx` is a server component that imports `AppHeader` — replace with `AppSidebar`. `TasksPageClient` wraps the two-pane layout in `bg-white`. The outer div needs `ml-12` for the sidebar offset and `bg-canvas`.

**Step 1: Update tasks/page.tsx**

Open `src/app/tasks/page.tsx`. Read it fully, then:
- Remove `import AppHeader` (if present)
- Add `import AppSidebar from "@/components/AppSidebar"`
- Add `<AppSidebar userEmail={user.email ?? ""} />` at the top of the returned JSX
- Wrap the existing content in a `ml-12` div

**Step 2: Update the outer wrapper in TasksPageClient**

Open `src/app/tasks/TasksPageClient.tsx`. Find the outermost div:
```tsx
// Current:
<div className="flex-1 h-full w-full overflow-hidden bg-white">
  <div className="max-w-7xl mx-auto h-full px-6 flex relative">
// Replace with:
<div className="flex-1 h-full w-full overflow-hidden bg-canvas">
  <div className="max-w-7xl mx-auto h-full flex relative">
```

**Step 3: Update the filter rail active state colors**

In `TasksPageClient.tsx`, find the filter button className. Replace `text-primary` with `text-accent`, `bg-blue-50/50` with `bg-accent-muted/50`, `border-blue-100/50` with `border-accent/20`, and `bg-blue-100` with `bg-accent-muted`:

```tsx
// Find and replace in the filter button:
active
  ? "text-primary"
  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
// → Replace with:
active
  ? "text-accent"
  : "text-muted hover:bg-slate-100/80 hover:text-text"

// Find and replace the layoutId motion div:
className="absolute inset-0 bg-blue-50/50 border border-blue-100/50 rounded-lg"
// → Replace with:
className="absolute inset-0 bg-accent-muted/60 border border-accent/15 rounded-lg"

// Find and replace the count badge:
active ? "bg-blue-100 text-primary" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
// → Replace with:
active ? "bg-accent-muted text-accent" : "bg-slate-100 text-muted group-hover:bg-slate-200"
```

**Step 4: Update the main area header**

```tsx
// Find:
<h1 className="text-3xl font-black tracking-tight text-slate-900 capitalize px-1">
// Replace:
<h1 className="text-2xl font-black tracking-tight text-text capitalize">
```

**Step 5: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add src/app/tasks/page.tsx src/app/tasks/TasksPageClient.tsx
git commit -m "design: tasks page uses AppSidebar, ml-12 offset, accent tokens in filter rail"
```

---

### Task 2: Redesign TaskList — Flat Rows, No Cards

**Files:**
- Modify: `src/components/tasks/TaskList.tsx`

**Context:** Current rows use `bg-white border rounded-xl` — the card pattern. Replace with `border-b border-border-faint` dividers only. Selected state: `bg-accent-muted/40` background instead of `bg-blue-50/30 border-blue-100`. The inline task creator at the bottom should become a flat `+ Add task` row, not a dashed border box.

**Step 1: Replace the task row wrapper**

In `src/components/tasks/TaskList.tsx`, find the task row `<div>` with className:
```tsx
// Current row:
<div
  onClick={() => onSelectTask(task.id)}
  className={clsx(
    "group flex items-start gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all border",
    isSelected
      ? "bg-blue-50/30 border-blue-100 shadow-sm"
      : "bg-white border-slate-100 hover:border-slate-200"
  )}
>
// Replace with:
<div
  onClick={() => onSelectTask(task.id)}
  className={clsx(
    "group flex items-center gap-3 py-3 border-b border-border-faint cursor-pointer transition-colors hover:bg-slate-50/70",
    isSelected && "bg-accent-muted/30"
  )}
>
```

**Step 2: Update the checkbox button**

```tsx
// Current:
<button
  onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
  className={clsx(
    "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
    task.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400"
  )}
>
  {task.status === "completed" && <Check className="w-3 h-3 text-white" />}
</button>
// Replace with:
<button
  onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
  className={clsx(
    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
    task.status === "completed" ? "bg-accent border-accent" : "border-slate-300 group-hover:border-slate-400"
  )}
>
  {task.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
</button>
```

**Step 3: Update the task content area**

```tsx
// Current content text:
<span className={clsx(
  "block text-sm font-semibold tracking-tight text-slate-900 truncate",
  task.status === "completed" && "line-through text-slate-400 font-medium"
)}>
// Replace with:
<span className={clsx(
  "block text-sm font-medium text-text truncate",
  task.status === "completed" && "line-through text-faint"
)}>
```

**Step 4: Update the ChevronRight color**

```tsx
// Current:
<ChevronRight className={clsx(
  "w-4 h-4 shrink-0 mt-0.5 transition-colors",
  isSelected ? "text-primary" : "text-slate-200 group-hover:text-slate-400"
)} />
// Replace with:
<ChevronRight className={clsx(
  "w-4 h-4 shrink-0 transition-colors",
  isSelected ? "text-accent" : "text-slate-200 group-hover:text-slate-400"
)} />
```

**Step 5: Update the empty state**

```tsx
// Current:
<div className="py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
    <Check className="w-6 h-6 opacity-20" />
  </div>
  <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
    Clear Objectives
  </p>
</div>
// Replace with:
<p className="text-sm text-faint py-8 text-center">Nothing here.</p>
```

**Step 6: Update the inline creator button**

The "Register New Objective" dashed button and inline input form:

```tsx
// Replace the isCreating input block:
{isCreating ? (
  <div className="border-b border-accent py-2 flex items-center gap-2">
    <input
      autoFocus
      value={newContent}
      onChange={e => setNewContent(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setIsCreating(false); }}
      placeholder="New task…"
      className="flex-1 text-sm font-medium text-text placeholder:text-faint outline-none bg-transparent"
    />
    <button
      onClick={handleCreate}
      disabled={!newContent.trim() || isPending}
      className="p-1 bg-accent text-white rounded-md hover:brightness-110 disabled:opacity-50 transition-all"
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
    </button>
  </div>
) : (
  <button
    onClick={() => setIsCreating(true)}
    className="flex items-center gap-2 py-2.5 text-sm text-faint hover:text-muted transition-colors group"
  >
    <Plus className="w-4 h-4" />
    <span>Add task</span>
  </button>
)}
```

**Step 7: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 8: Commit**

```bash
git add src/components/tasks/TaskList.tsx
git commit -m "design: TaskList → flat rows with dividers, no card borders, accent toggle"
```

---

### Task 3: Redesign TaskDetail — Right-Side Slide-In Panel

**Files:**
- Modify: `src/components/tasks/TaskDetail.tsx`

**Context:** Current design is a centered modal with `fixed inset-0 z-60 flex items-center justify-center p-6` plus a blur backdrop. Replace with a right-side panel: `fixed right-0 top-0 h-screen w-[420px]` sliding in from `translateX(100%)`. Keep the backdrop for click-to-close but make it lighter (`bg-black/20`, no blur). Remove the `rounded-4xl` card — the panel itself is the surface. Remove all `shadow-primary/20` and `bg-primary/5` tints. Update `focus:border-primary` → `focus:border-accent`.

**Step 1: Update the outer wrapper and backdrop**

In `src/components/tasks/TaskDetail.tsx`, find the outermost return:

```tsx
// Current:
return (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-6 sm:p-12">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
    />
    <motion.div
      key={task.id}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
    >
// Replace with:
return (
  <div className="fixed inset-0 z-50">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="absolute inset-0 bg-black/20"
    />
    <motion.div
      key={task.id}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute right-0 top-0 h-full w-[420px] bg-canvas border-l border-border shadow-xl flex flex-col overflow-hidden"
    >
```

**Step 2: Update the header**

```tsx
// Current:
<div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center">
      <AlertCircle className="w-4 h-4 text-primary" />
    </div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Objective Details</div>
  </div>
  <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
    <X className="w-5 h-5" />
  </button>
</div>
// Replace with:
<div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
  <span className="text-[10px] font-black text-faint uppercase tracking-widest">Task Detail</span>
  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-faint hover:text-muted transition-colors">
    <X className="w-4 h-4" />
  </button>
</div>
```

**Step 3: Update the body padding and title area**

```tsx
// Current body:
<div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
// Replace with:
<div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
```

Update the toggle button in the title section:
```tsx
// Current:
className={clsx(
  "mt-1.5 w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all",
  task.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 hover:border-slate-400 shadow-sm"
)}
// Replace with:
className={clsx(
  "mt-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
  task.status === "completed" ? "bg-accent border-accent" : "border-slate-300 hover:border-slate-400"
)}
```

**Step 4: Replace all `focus:border-primary` / `focus:ring-primary` occurrences**

The `SELECT_BASE` constant and all input/textarea/select focus styles:

```tsx
// Current:
const SELECT_BASE = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none";
// Replace with:
const SELECT_BASE = "w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all appearance-none";
```

Also update textarea and date input `focus:border-primary focus:ring-2 focus:ring-primary/20` → `focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)]`.

**Step 5: Update the XP Projection box**

```tsx
// Current:
<div className="space-y-3 p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200">
// Replace with:
<div className="space-y-3 p-5 bg-slate-900 rounded-2xl text-white">
```

**Step 6: Update the footer**

```tsx
// Current footer wrapper:
<div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
// Replace with:
<div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
```

Remove the `"Character OS // Protocol v1.6.2"` label from the footer (bottom right).

**Step 7: Update subtask `bg-primary text-white` button**

```tsx
// Current:
className="p-2.5 bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-primary/20"
// Replace with:
className="p-2 bg-accent text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
```

Also: subtask input `focus:border-primary` → `focus:border-accent`, `focus:bg-white`.

**Step 8: Remove `AlertCircle` from imports if no longer used**

Check the imports at the top of the file and remove any unused icons after the changes above.

**Step 9: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 10: Commit**

```bash
git add src/components/tasks/TaskDetail.tsx
git commit -m "design: TaskDetail → right slide-in panel, no modal overlay, accent tokens"
```

---

### Task 4: Redesign NewTaskSheet — Clean Form

**Files:**
- Modify: `src/components/tasks/NewTaskSheet.tsx`

**Context:** The sheet already uses the right-panel pattern (good). Main changes: replace all `border-primary`, `ring-primary/20`, `bg-primary`, `shadow-primary/20` with accent equivalents. Clean up the AI Preview section — it currently has `bg-slate-50 rounded-xl p-4 border border-slate-100` which is another generic card. Replace with a bordered section with `border-t border-border` separator. Update the submit button shadow.

**Step 1: Update the `SELECT_BASE` constant**

```tsx
// Current:
const SELECT_BASE = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none";
// Replace with:
const SELECT_BASE = "w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all appearance-none";
```

**Step 2: Update all input focus styles**

Find every `focus:border-primary focus:ring-2 focus:ring-primary/20` in the file and replace with `focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)]`.

**Step 3: Update the AI Preview section**

```tsx
// Current:
<div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Preview</h3>
// Replace with:
<div className="pt-4 border-t border-border space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-[10px] font-bold text-faint uppercase tracking-widest">XP Preview</h3>
```

Update the stat weight badges inside the AI Preview:
```tsx
// Current badge:
<div key={stat} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
  <span className="text-[10px] font-extrabold text-slate-400 uppercase">{stat}</span>
  <span className="text-xs font-bold text-primary">+{weight}</span>
</div>
// Replace with:
<div key={stat} className="flex items-center gap-1 bg-slate-50 border border-border px-2 py-1 rounded-md">
  <span className="text-[10px] font-extrabold text-faint uppercase">{stat}</span>
  <span className="text-xs font-bold text-accent">+{weight}</span>
</div>
```

Update the XP badge:
```tsx
// Current:
<span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">XP</span>
// Replace with:
<span className="text-[10px] font-bold text-accent bg-accent-muted px-1.5 py-0.5 rounded">XP</span>
```

**Step 4: Update the submit button**

```tsx
// Current:
content.trim() && !isSubmitting
  ? "bg-primary text-white shadow-md shadow-primary/20 hover:brightness-110 active:scale-95"
  : "bg-slate-100 text-slate-400 cursor-not-allowed"
// Replace with:
content.trim() && !isSubmitting
  ? "bg-accent text-white hover:brightness-110 active:scale-95"
  : "bg-slate-100 text-muted cursor-not-allowed"
```

**Step 5: Update the header**

```tsx
// Current:
<div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">New Task</div>
<h2 className="text-lg font-black tracking-tight text-slate-900">Create Task</h2>
// Replace with:
<div className="text-[10px] font-bold text-faint uppercase tracking-widest mb-0.5">New Task</div>
<h2 className="text-base font-black tracking-tight text-text">Create Task</h2>
```

**Step 6: Verify TypeScript**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

**Step 7: Verify no `primary` token references remain in tasks components**

```bash
grep -r "primary" /home/itsaibarr/projects/character-development/src/components/tasks/ --include="*.tsx"
grep -r "primary" /home/itsaibarr/projects/character-development/src/app/tasks/ --include="*.tsx"
```

Expected: no output (zero remaining `primary` references).

**Step 8: Commit**

```bash
git add src/components/tasks/NewTaskSheet.tsx
git commit -m "design: NewTaskSheet → accent tokens, clean XP preview section, no shadows"
```
