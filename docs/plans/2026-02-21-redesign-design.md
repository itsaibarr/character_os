# CH_OS Redesign — Design Document
**Date:** 2026-02-21
**Approach:** Terminal Precision (Approach A)
**Success Criterion:** User experience — every interaction feels deliberate, production-grade, and zero "basic AI app" energy.

---

## Design Principles

1. **Signal, not decoration.** The accent blue (#0056D2) is used only for active state, XP bars, and primary CTAs. Never as background fill on neutral cards.
2. **Data over chrome.** No drop shadows. No gradient cards. Information hierarchy through typography and whitespace alone.
3. **Motion has meaning.** Every animation communicates state change — not decoration. Page enter, list stagger, layout spring transitions, progress bar fill.
4. **Production spatial grammar.** Sidebar + full-height content canvas. The same layout pattern as Linear, Notion, and the design references.

---

## Design Tokens

All tokens live in `src/app/globals.css` under `@theme {}`.

```css
/* Rename primary → accent throughout */
--color-accent: #0056D2;
--color-accent-muted: #EEF4FF;       /* selected tile bg, hover tint */
--color-accent-ring: rgba(0, 86, 210, 0.15);

/* Layout surfaces */
--color-sidebar: #0F172A;            /* slate-950 icon rail */
--color-canvas: #FFFFFF;             /* main content area */
--color-base: #F8FAFC;               /* outer shell only */

/* Borders */
--color-border: #E2E8F0;             /* slate-200 */
--color-border-faint: #F1F5F9;       /* slate-100, row dividers */

/* Text */
--color-text: #0F172A;               /* slate-950 */
--color-muted: #64748B;              /* slate-500 */
--color-faint: #94A3B8;              /* slate-400 */

/* Remove: --color-primary, --color-primary-dark, --color-primary-light,
           --color-secondary, --color-cta */
```

---

## Motion Vocabulary

All animation uses `motion/react` (already installed).

| Token | Value | Usage |
|---|---|---|
| Page enter | `y:8→0, opacity:0→1, duration:0.3s easeOut` | Every page's root element |
| List stagger | `staggerChildren: 0.04s` | Task rows, stat rows, choice tiles |
| Active spring | `type:spring, bounce:0.2, duration:0.4` | `layoutId` filter tabs, sidebar active indicator |
| Progress fill | `width:0→N%, duration:0.8s easeOut` | XP bars, stat progress bars |
| Step transition | `x:30→0 (forward), x:-30→0 (back), opacity:0→1` | Onboarding step change |
| Sidebar icon hover | `scale:1.1, duration:0.15s` | Icon buttons |
| Row hover | `backgroundColor tint, duration:0.15s` | Task rows, stat rows |

---

## Global Shell

**Component:** `src/components/AppSidebar.tsx` (new, replaces `AppHeader.tsx`)

**Structure:**
- Fixed `left-0 top-0 h-screen w-12` (48px), `bg-sidebar`
- Top: CH_OS logotype — rotated diamond `◆` in white
- Middle: 3 nav icon buttons — Dashboard (Home), Tasks (List), Radar (Radio)
  - Inactive: `text-slate-500`
  - Active: `text-white` + 2px `bg-accent` left border indicator (animated with `layoutId`)
  - Hover: `scale(1.1)` on icon
- Bottom: user initials in a 28px circle (`bg-slate-800 text-slate-300`), sign-out appears on hover
- All pages: root div gets `ml-12` to offset sidebar

**Remove:** `src/components/AppHeader.tsx` — all pages currently using it will import `AppSidebar` instead.

---

## Dashboard

**File:** `src/app/dashboard/page.tsx` and its component tree

**Layout:** Single column, max-w-4xl, py-10 px-8

### Character Banner
- Horizontal strip, `border-b border-border pb-6 mb-6`
- Left: avatar image (48×48 `rounded-xl`) or fallback initials box
- Center: character type label (uppercase tracking, muted), large level number, stage badge
- Right: XP progress — label + inline bar (120px wide, 4px height) + `62%` text
- No card wrapping, no shadow

### Stats + Radar (two-column, side-by-side)
- Left col (~55%): editorial stat table
  - Each row: `colored dot (8px) | full stat name | 120px progress bar (4px) | XP value | Lv.N badge`
  - Row separator: `border-b border-border-faint`
  - Progress bars animate width on mount (`0 → value%`, 0.8s easeOut, 0.04s stagger)
- Right col (~45%): radar chart, ~220px, centered vertically
- Both sit on plain `bg-canvas`, no card wrapper

### Command Input
- `border-t border-border mt-6 pt-6`
- Single-line input, placeholder "Add a command…", `⌘K` badge hint on right
- No border radius on the input itself — full-width with bottom border only (borderless look)

### Active Commands (task list)
- Section label: `text-xs font-bold text-faint uppercase tracking-wider mb-3`
- Each task row: `flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50`
  - Left: circle toggle `○` / `●`
  - Center: task content text
  - Right: priority dot (6px colored) + XP badge (`+12xp` in `text-xs text-muted`)
- No card wrapping

---

## Tasks Page

**Files:** `src/app/tasks/TasksPageClient.tsx`, `src/components/tasks/TaskList.tsx`, `src/components/tasks/TaskDetail.tsx`, `src/components/tasks/NewTaskSheet.tsx`

**Layout:** Full viewport height minus sidebar, two-pane with optional third panel

### Left Filter Rail (180px fixed)
- `border-r border-border h-full py-8 px-3`
- Filters: Inbox, Today, Completed
- Each: `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold`
  - Active bg: `layoutId="filter-bg"` spring animated
  - Active text: `text-accent`, inactive: `text-muted hover:text-text`
  - Count badge: `text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100`

### Task List (flex-1)
- `py-8 px-6`
- Header: filter label `text-2xl font-black tracking-tight text-text`
- Rows: no cards — just `border-b border-border-faint`
  - Checkbox circle left (toggles status)
  - Task content (completed = `line-through text-muted`)
  - Right: priority dot + XP badge + due date (muted)
- Entrance: stagger `y:4→0, opacity:0→1` per item, 0.04s
- Empty state: centered `text-sm text-muted` text, no illustrations

### Task Detail Panel
- Slides in from right: `translateX(100%) → translateX(0)`, spring
- `fixed right-0 top-0 h-screen w-[380px] bg-canvas border-l border-border`
- Header: task content as `text-lg font-bold`, close button top-right
- Body: description, subtasks list, metadata rows (priority, difficulty, XP breakdown by stat)
- Subtask rows: same row pattern as main list

### NewTaskSheet
- Bottom sheet (`fixed bottom-0`) or right panel — consistent with detail panel pattern
- Clean form: content input, optional description, priority/difficulty selectors as pill toggles
- CTA: `bg-accent text-white` button, full width

---

## Onboarding

**File:** `src/app/onboarding/OnboardingForm.tsx`

**Layout:** `min-h-screen bg-canvas flex flex-col items-center justify-center`

### Progress Indicator
- `fixed top-0 left-0 right-0 h-0.5 bg-border z-50`
- Inner fill: `bg-accent`, spring animated width
- Below: numbered dot row `● ○ ○ ○ ○ ○ ○ ○ ○` — dots not bars
  - Current: `bg-accent w-2 h-2 rounded-full`
  - Visited: `bg-slate-300`
  - Future: `bg-slate-200`

### Step Container
- `max-w-md w-full px-6 py-12`
- AnimatePresence with `x: ±30 → 0, opacity:0→1` on step change

### Title/Subtitle
- `text-2xl font-black tracking-tight text-text`
- `text-sm text-muted mt-1`

### Choice Tiles
- Grid (2-col for icons, 1-col for text lists)
- Inactive: `border border-border bg-canvas rounded-xl p-3.5`
- Selected: `border border-accent bg-accent-muted text-accent`
- Icon: colored at `text-accent` when selected, `text-muted` otherwise
- **Remove:** `shadow-lg shadow-primary/20` from all selected states
- Hover: `border-slate-300` (no color bleeding on unselected)
- Entrance stagger: `y:8→0, opacity:0→1`, 0.04s per tile

### Text Input Steps
- `w-full bg-canvas border border-border rounded-xl p-4 text-base`
- Focus: `border-accent ring-2 ring-accent-ring`
- No `rounded-2xl` — keep `rounded-xl` consistent

### Navigation Buttons
- Back: `text-muted font-semibold hover:text-text` — no border, no bg
- Next/Submit: `bg-accent text-white px-8 py-3 rounded-full font-bold` with arrow icon
- Hover: `scale(1.02)`, tap: `scale(0.98)`

---

## Radar Page

**Files:** `src/app/radar/page.tsx`, `src/components/radar/RadarPageChart.tsx`

**Layout:** `max-w-2xl mx-auto py-12 px-8`

### Header
- `text-xs font-black text-faint uppercase tracking-widest mb-1` — "Stat Analysis"
- `text-2xl font-black tracking-tight text-text` — "Radar"
- No card wrapping on header

### Radar Chart
- 320px × 320px (larger than current 240px)
- Polygon animates from `0` to data values on mount, 0.8s easeOut
- Vertex dots animate from center to position
- Background rings: `stroke: border` color
- Axis lines: `stroke: border-faint`

### Stat Table
- `border-t border-border mt-8 pt-8`
- Column headers: `text-[10px] font-black text-faint uppercase tracking-widest`
- Each row: `grid grid-cols-4 items-center py-3 border-b border-border-faint`
  - Col 1: colored dot + stat label
  - Col 2: XP value (`font-black`)
  - Col 3: level (`text-muted`)
  - Col 4: 80px progress bar, animates on mount with 0.04s stagger
- Row entrance: stagger `y:4→0, opacity:0→1`

---

## Agent Task Breakdown

### Agent 1 — Shell + Dashboard
**Scope:** Global layout shell, dashboard page, character components, stat components
- Create `AppSidebar.tsx` (replaces AppHeader)
- Update `globals.css` — rename `primary` → `accent`, add new tokens
- Redesign `CharacterDisplay.tsx` → horizontal banner
- Redesign `StatGrid.tsx` → editorial stat table + radar side-by-side
- Update `dashboard/page.tsx` — new layout, new sections
- Update `DashboardCommand` input — borderless style
- Update `TaskStack`/`TaskStackWrapper` — row-based, no cards

### Agent 2 — Tasks
**Scope:** Full tasks page and all task components
- Redesign `TasksPageClient.tsx` — new two-pane layout
- Redesign `TaskList.tsx` — row-based, stagger entrance
- Redesign `TaskDetail.tsx` — right slide-in panel
- Redesign `NewTaskSheet.tsx` — clean form, pill selectors

### Agent 3 — Onboarding + Radar
**Scope:** Onboarding wizard, radar visualization page
- Redesign `OnboardingForm.tsx` — numbered dots, clean tiles, no shadow-lg on selected
- Redesign `radar/page.tsx` — full layout, no AppHeader, stat table redesign
- Redesign `RadarPageChart.tsx` — larger 320px chart, entrance animation

---

## What All Agents Share

- Import from `AppSidebar` not `AppHeader`
- Use `--color-accent` not `--color-primary` in inline styles
- Use Tailwind classes: `text-accent` not `text-primary`, `bg-accent` not `bg-primary`
- No `shadow-lg shadow-primary/20` on selected states
- No standalone `bg-white border border-slate-200 rounded-2xl shadow-sm` card wrapping for data — use dividers instead
- `motion/react` for all enter animations — no bare CSS transitions on layout changes
