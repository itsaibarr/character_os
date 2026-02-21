# Agent 1: NLP Task Parser — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "⚡ Parse Text" toggle panel to the tasks page that lets users paste unstructured text, get AI-parsed tasks, confirm/deselect before inserting.

**Architecture:** Thin server action wraps the existing `extractTasksFromPrompt` in `src/lib/ai.ts` with auth + rate-limit guard, returning `ExtractedTask[]` without writing to the DB. The client-side confirmation panel lets users deselect tasks before triggering the existing `createTask()` per selected item.

**Tech Stack:** Next.js 16 Server Actions · TypeScript · Vercel AI SDK (OpenAI) · Zod (already used in `src/lib/ai.ts`) · Tailwind CSS 4 · Lucide React · `motion/react`

**Runs in parallel with:** Agent 2 (Streak) and Agent 3 (Analytics). Do NOT touch `GamificationHub.tsx`, `types.ts`, or any file owned by Agents 2/3/4.

---

## Pre-Flight Checks

Before writing any code, confirm these files exist and match what is described here:

- `src/lib/ai.ts` — exports `extractTasksFromPrompt(prompt, localTime): Promise<ExtractedTask[]>` and `type ExtractedTask`
- `src/app/actions/tasks.ts` — exports `createTask(content, options?)`
- `src/lib/security/rate-limit.ts` — exports `enforceRateLimit(userId, action, max)` where action already accepts `'nlp_parse'`
- `src/app/actions/gamification.ts` — exports `type ActionResponse<T>`
- `src/app/tasks/TasksPageClient.tsx` — the client component with the task list; has `<header>` at line ~262

---

## Task 1: Server Action — `parseTasksFromText`

**Files:**
- Create: `src/app/actions/nlp.ts`

This action parses text without inserting tasks. It returns the parsed list to the client for confirmation.

**Step 1: Create the file**

```typescript
// src/app/actions/nlp.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { extractTasksFromPrompt, type ExtractedTask } from "@/lib/ai";
import type { ActionResponse } from "@/app/actions/gamification";

export type { ExtractedTask };

/**
 * Parses unstructured text into a list of ExtractedTask objects.
 * Does NOT insert to the database — caller handles confirmation then uses createTask().
 * Rate-limited to 20 NLP parse calls per user per day.
 */
export async function parseTasksFromText(
  text: string,
): Promise<ActionResponse<ExtractedTask[]>> {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: "Input text is empty." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await enforceRateLimit(user.id, "nlp_parse", 20);

    const localTime = new Date().toLocaleString("en-US", {
      timeZoneName: "short",
    });

    const tasks = await extractTasksFromPrompt(text, localTime);

    if (tasks.length === 0) {
      return { success: false, error: "No tasks detected in the text. Try being more specific." };
    }

    return { success: true, data: tasks };
  } catch (error: unknown) {
    console.error("[parseTasksFromText] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to parse tasks.";
    return { success: false, error: message };
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /home/itsaibarr/projects/character-development && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors on the new file.

**Step 3: Commit**

```bash
git add src/app/actions/nlp.ts
git commit -m "feat(nlp): add parseTasksFromText server action"
```

---

## Task 2: Confirmation Component — `ParsedTaskPreview`

**Files:**
- Create: `src/components/tasks/ParsedTaskPreview.tsx`

This component receives the parsed task list, shows checkboxes, and calls `createTask()` for each selected item on confirm.

**Step 1: Create the file**

```tsx
// src/components/tasks/ParsedTaskPreview.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { createTask } from "@/app/actions/tasks";
import type { ExtractedTask } from "@/app/actions/nlp";

interface ParsedTaskPreviewProps {
  tasks: ExtractedTask[];
  onConfirmed: () => void;
  onCancel: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-slate-500 bg-slate-100 border-slate-200",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  high: "text-orange-500 bg-orange-50 border-orange-200",
  medium: "text-sky-600 bg-sky-50 border-sky-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export default function ParsedTaskPreview({
  tasks,
  onConfirmed,
  onCancel,
}: ParsedTaskPreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(tasks.map((_, i) => i)),
  );
  const [isPending, startTransition] = useTransition();

  const toggle = (idx: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const selectedCount = selected.size;

  const handleAdd = () => {
    if (selectedCount === 0) return;

    startTransition(async () => {
      const toAdd = tasks.filter((_, i) => selected.has(i));

      await Promise.all(
        toAdd.map((t) =>
          createTask(t.content, {
            description: t.description,
            due_date: t.due_date,
            priority: t.priority,
            difficulty: t.difficulty,
          }),
        ),
      );

      toast.success(
        `${selectedCount} task${selectedCount !== 1 ? "s" : ""} added`,
        { icon: "⚡" },
      );
      onConfirmed();
    });
  };

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden bg-white">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-slate-50">
        <span className="text-[10px] font-black uppercase tracking-widest text-faint">
          Parsed Tasks ({tasks.length} detected)
        </span>
        <button
          onClick={onCancel}
          className="text-[11px] text-muted hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Task rows */}
      <ul className="divide-y divide-border">
        {tasks.map((task, idx) => {
          const isSelected = selected.has(idx);
          return (
            <li
              key={idx}
              onClick={() => toggle(idx)}
              className={clsx(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                isSelected ? "bg-white hover:bg-slate-50/60" : "bg-slate-50/40 opacity-60",
              )}
            >
              {/* Checkbox */}
              <div className="mt-0.5 shrink-0 text-orange-500">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </div>

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text leading-snug">
                  {task.content}
                </p>
                {task.description && (
                  <p className="text-[11px] text-faint mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                  <p className="text-[10px] text-muted mt-0.5">
                    {task.subtasks.length} subtask
                    {task.subtasks.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {task.due_date && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">
                    {new Date(task.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                <span
                  className={clsx(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                    PRIORITY_COLORS[task.priority ?? "medium"],
                  )}
                >
                  {task.priority ?? "medium"}
                </span>
                <span
                  className={clsx(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                    DIFFICULTY_COLORS[task.difficulty ?? "medium"],
                  )}
                >
                  {task.difficulty ?? "medium"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-border bg-slate-50">
        <span className="text-[11px] text-muted">
          {selectedCount} of {tasks.length} selected
        </span>
        <button
          onClick={handleAdd}
          disabled={selectedCount === 0 || isPending}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all",
            selectedCount > 0 && !isPending
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          Add selected ({selectedCount})
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/tasks/ParsedTaskPreview.tsx
git commit -m "feat(nlp): add ParsedTaskPreview confirmation component"
```

---

## Task 3: Toggle Button — `ParseTextButton`

**Files:**
- Create: `src/components/tasks/ParseTextButton.tsx`

This is the controller component: renders the "⚡ Parse Text" button + expandable textarea + loading state + `ParsedTaskPreview` after parsing.

**Step 1: Create the file**

```tsx
// src/components/tasks/ParseTextButton.tsx
"use client";

import { useState, useRef, useTransition } from "react";
import { Zap, ChevronDown, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { parseTasksFromText, type ExtractedTask } from "@/app/actions/nlp";
import ParsedTaskPreview from "./ParsedTaskPreview";

interface ParseTextButtonProps {
  /** Called after tasks are successfully added, so the task list can refresh. */
  onTasksAdded?: () => void;
}

export default function ParseTextButton({ onTasksAdded }: ParseTextButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ExtractedTask[] | null>(null);
  const [isParsing, startParsing] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    } else {
      setText("");
      setParsedTasks(null);
    }
  };

  const handleParse = () => {
    if (!text.trim()) return;

    startParsing(async () => {
      const result = await parseTasksFromText(text);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to parse tasks");
        return;
      }
      setParsedTasks(result.data);
    });
  };

  const handleConfirmed = () => {
    setOpen(false);
    setText("");
    setParsedTasks(null);
    onTasksAdded?.();
  };

  const handleCancel = () => {
    setParsedTasks(null);
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold border transition-all",
          open
            ? "bg-orange-50 border-orange-500 text-orange-600"
            : "bg-white border-border text-muted hover:border-orange-400 hover:text-orange-500",
        )}
      >
        <Zap
          className={clsx(
            "w-3.5 h-3.5",
            open ? "text-orange-500" : "text-slate-400",
          )}
        />
        Parse Text
        {open ? (
          <X className="w-3 h-3 ml-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-0.5" />
        )}
      </button>

      {/* Expandable panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="parse-panel"
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[480px] z-20 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ transformOrigin: "top right" }}
          >
            {parsedTasks ? (
              <ParsedTaskPreview
                tasks={parsedTasks}
                onConfirmed={handleConfirmed}
                onCancel={handleCancel}
              />
            ) : (
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-faint mb-2">
                  Paste any text with tasks
                </p>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleParse();
                    }
                  }}
                  placeholder={
                    'e.g. "Tomorrow finish physics homework, buy groceries, update portfolio."'
                  }
                  rows={4}
                  className="w-full resize-none text-[13px] text-text placeholder:text-slate-400 border border-border rounded-sm px-3 py-2.5 focus:outline-none focus:border-orange-400 bg-slate-50 transition-colors"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-faint">
                    ⌘↵ to parse
                  </span>
                  <button
                    onClick={handleParse}
                    disabled={!text.trim() || isParsing}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all",
                      text.trim() && !isParsing
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    )}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      "Parse →"
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/tasks/ParseTextButton.tsx
git commit -m "feat(nlp): add ParseTextButton toggle panel"
```

---

## Task 4: Wire Into Tasks Page

**Files:**
- Modify: `src/app/tasks/TasksPageClient.tsx`

Add `ParseTextButton` to the page header alongside the existing `<h1>` title. The button's `onTasksAdded` callback should trigger a router refresh to pull in the new tasks.

**Step 1: Read the current file**

Open `src/app/tasks/TasksPageClient.tsx`. Locate the `<header>` block (around line 262):

```tsx
<header className="mb-10">
  <h1 className="text-2xl font-black tracking-tight text-text capitalize">
    {filter}
  </h1>
</header>
```

**Step 2: Add import at the top of the file**

Add to the existing import block (after line 14):

```tsx
import ParseTextButton from "@/components/tasks/ParseTextButton";
```

**Step 3: Replace the `<header>` block**

Replace:
```tsx
<header className="mb-10">
  <h1 className="text-2xl font-black tracking-tight text-text capitalize">
    {filter}
  </h1>
</header>
```

With:
```tsx
<header className="mb-10 flex items-center justify-between">
  <h1 className="text-2xl font-black tracking-tight text-text capitalize">
    {filter}
  </h1>
  <ParseTextButton onTasksAdded={() => router.refresh()} />
</header>
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 5: Visual sanity check**

Start dev server if not running:
```bash
npm run dev
```
Navigate to `/tasks`. Confirm:
- "Parse Text" button appears in header, right-aligned
- Clicking it opens the dropdown panel
- Pasting text and pressing "Parse →" shows the parsed task list with checkboxes
- Confirming adds the tasks (they appear in the inbox)
- Rate limit toast appears after 20 parses

**Step 6: Final commit**

```bash
git add src/app/tasks/TasksPageClient.tsx
git commit -m "feat(nlp): wire ParseTextButton into tasks page header"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/app/actions/nlp.ts` | CREATED |
| `src/components/tasks/ParsedTaskPreview.tsx` | CREATED |
| `src/components/tasks/ParseTextButton.tsx` | CREATED |
| `src/app/tasks/TasksPageClient.tsx` | MODIFIED (header only) |

**Agent 4 dependency:** Agent 4 does NOT need to touch any of these files. The integration is complete when this plan finishes.
