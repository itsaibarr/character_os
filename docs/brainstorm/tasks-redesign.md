# Brainstorm: Tasks Page Redesign

## Context

The `/tasks` page currently retains some legacy styles (like `red-600` buttons and 8px corners) that contrast with the premium, high-density look of the Dashboard (`#0056d2` primary, 12px/16px corners, and `font-black` hierarchy).

---

## Option A: The "Direct Port"

Bring all Dashboard primitives directly to the tasks page. Replace red with primary blue, update all `rounded-lg` to `rounded-xl`, and use the `font-black` tracking system for section headers.

✅ **Pros:**

- Maximum consistency with minimal effort.
- Feels like part of the same "App Shell".

❌ **Cons:**

- Misses the opportunity to improve the specific UX of task management.

📊 **Effort:** Low

---

## Option B: The "Linear-Inspired" Layout

Enhance the Sidebar with better active states (subtle `bg-primary-light` or `ring`), use dense spacing (4px/8px), and implement a more sophisticated modal backdrop (darker, more blur) to create focus.

✅ **Pros:**

- Very professional and "pro-tool" feel.
- High information density.

❌ **Cons:**

- More complex CSS updates across `TaskList` and `TaskDetail`.

📊 **Effort:** Medium

---

## Option C: The "Unified Command" System

Redesign the "Add Task" inline component to match the `DashboardCommand.tsx` aesthetic (large, centered-looking, shadow-xl). This creates a signature "CharacterOS" interaction pattern.

✅ **Pros:**

- Unique branding and consistent interaction language.
- "Wow" factor for new task creation.

❌ **Cons:**

- Requires refactoring the inline input into a more reusable command-style component.

📊 **Effort:** High

---

## 💡 Recommendation

**Option B + Components of C**. I suggest we path towards a high-density "Pro" layout (Option B) while using the Dashboard's shadow and ring system for the inputs (Option C). This keeps the app feeling premium and fast.
