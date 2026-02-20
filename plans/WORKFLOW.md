# CharacterOS Workflow Plan

## Project Overview

**CharacterOS** is an RPG-based task management system with character evolution. It transforms everyday tasks into a game-like experience where users level up their characters by completing tasks.

### Tech Stack

- **Framework**: Next.js 16
- **Database/Auth**: Supabase
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **AI**: AI SDK

---

## Current State Analysis

### Git Status

- **Branch**: `main` (7 commits ahead of `new-origin/main`)
- **Modified files**:
  - `docs/PLAN.md`
  - `src/app/actions/tasks.ts`
  - `src/app/dashboard/page.tsx`
  - `src/app/globals.css`
- **Deleted files**:
  - `public/out.css`
  - `src/app/out.css`
- **New untracked files/directories**:
  - `docs/brainstorm/`
  - `docs/migrations/`
  - `src/app/radar/`
  - `src/app/tasks/`
  - (and others)
- **Stale worktrees**:
  - `.worktrees/dashboard-restructure`
  - `.worktrees/task-system` (prunable)

### Feature Branches Status

- `feature/dashboard-restructure` - exists locally
- `feature/task-system` - exists locally

---

## Implementation Status

### ✅ Implemented Plans (from docs/plans/)

| Plan                  | Status      |
| --------------------- | ----------- |
| Drop Better Auth      | ✅ Complete |
| Drop Drizzle          | ✅ Complete |
| Task System           | ✅ Complete |
| Dashboard Restructure | ✅ Complete |
| Radar Chart           | ✅ Complete |
| Onboarding Once       | ✅ Complete |
| Onboarding No-Scroll  | ✅ Complete |
| Design Unification    | ✅ Complete |

### 🚧 In Progress Plans

| Plan            | Status         | Notes                        |
| --------------- | -------------- | ---------------------------- |
| AI Stat Routing | 🚧 In Progress | `src/lib/ai.ts` exists       |
| XP System       | 🚧 In Progress | Documented in `docs/PLAN.md` |

### 📋 Planned

| Plan                  | Priority | Dependencies       |
| --------------------- | -------- | ------------------ |
| Archetype Theming     | Medium   | Requires XP System |
| Supabase Manual Steps | Low      | -                  |

---

## Recommended Workflow

### Phase 1: Cleanup (Prerequisites)

Before starting new feature development, clean up the repository:

1. **Clean up stale git worktrees**

   ```bash
   git worktree prune
   ```

2. **Commit/push pending changes on main**
   - Review modified files: `docs/PLAN.md`, `src/app/actions/tasks.ts`, `src/app/dashboard/page.tsx`, `src/app/globals.css`
   - Decide: commit locally or discard changes
   - Push to remote if ready

### Phase 2: Parallel Development Worktrees

Create isolated worktrees for each major feature to enable parallel development without conflicts:

```bash
# Create worktrees from main
git worktree add worktrees/feat/ai-stat-routing main -b feat/ai-stat-routing
git worktree add worktrees/feat/xp-system main -b feat/xp-system
git worktree add worktrees/feat/archetype-theming main -b feat/archetype-theming
```

### Phase 3: Implementation Order

Follow this dependency order:

1. **First: AI Stat Routing**
   - Prerequisites: None
   - Location: `worktrees/feat/ai-stat-routing`
   - Files: `src/lib/ai.ts` (exists)

2. **Second: XP System**
   - Prerequisites: AI Stat Routing
   - Location: `worktrees/feat/xp-system`
   - Rationale: XP calculations depend on AI-driven stat weights

3. **Third: Archetype Theming**
   - Prerequisites: XP System
   - Location: `worktrees/feat/archetype-theming`
   - Rationale: Visual theming builds on the stat/level system

---

## Git Strategy

### Worktree Structure

```
character-development/
├── .worktrees/
│   ├── feat/
│   │   ├── ai-stat-routing/      # Feature branch worktree
│   │   ├── xp-system/            # Feature branch worktree
│   │   └── archetype-theming/    # Feature branch worktree
│   └── (pruned)/
│       ├── dashboard-restructure/   # Stale - can prune
│       └── task-system/              # Stale - can prune
├── worktrees/                        # Worktrees directory
│   └── feat/
│       ├── ai-stat-routing/
│       ├── xp-system/
│       └── archetype-theming/
├── main/                             # Main branch
└── (feature branches)
```

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN BRANCH                             │
│                   (clean, squash-merged)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────────┐
│  AI Stat        │ │  XP System    │ │  Archetype         │
│  Routing        │ │               │ │  Theming           │
│                 │ │               │ │                    │
│ (1st)           │ │ (2nd)         │ │ (3rd)              │
└────────┬────────┘ └───────┬───────┘ └──────────┬──────────┘
         │                  │                     │
         │    depends on ───┤                     │
         │                  │    depends on ──────┘
         │                  │
         ▼                  ▼                     ▼
    ┌─────────┐        ┌─────────┐           ┌─────────┐
    │ PR to   │        │ PR to   │           │ PR to   │
    │ main    │        │ main    │           │ main    │
    │ (squash)│        │ (squash)│           │ (squash)│
    └────┬────┘        └────┬────┘           └────┬────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            ▼
                   ┌─────────────────┐
                   │    MAIN         │
                   │  (updated)      │
                   └─────────────────┘
```

### Branch Naming Convention

Use consistent naming:

- `feat/ai-stat-routing` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation

### Merge Strategy

1. **Feature Development**: Work in feature worktree
2. **Testing**: Verify in worktree before merging
3. **PR Creation**: Create pull request to main
4. **Merge**: Use squash merge to keep main clean
5. **Cleanup**: Delete feature branch after merge

---

## Quick Reference Commands

```bash
# View current worktrees
git worktree list

# Prune stale worktrees
git worktree prune

# Create new feature worktree
git worktree add worktrees/feat/<feature-name> main -b feat/<feature-name>

# Remove worktree (when done)
git worktree remove worktrees/feat/<feature-name>
git branch -d feat/<feature-name>

# Check status
git status
git branch -vv
```

---

## File Paths Reference

### Key Source Files

- `src/lib/ai.ts` - AI integration (in progress)
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/actions/tasks.ts` - Task actions
- `src/components/dashboard/` - Dashboard components

### Documentation

- `docs/plans/` - Implementation plans
- `docs/PLAN.md` - Master plan
- `docs/migrations/` - Database migrations

---

## 🔌 Feature Integration Plan

The project has many implemented features that are NOT connected to each other. This section maps what needs to be wired together.

### Current Dashboard State

The dashboard at `src/app/dashboard/page.tsx` currently renders:

- ✅ CharacterDisplay - Shows avatar, type, stage, level, XP progress
- ✅ StatGrid - Shows level, XP%, mini radar chart, 6 stat cards

**But these exist but are NOT rendered:**

- ❌ TaskStack - Full task list UI with completion toggle, priority badges
- ❌ DashboardCommand - AI command input with Cmd+K shortcut

### Integration Gaps

| Component        | File                                          | Status     | Action Needed                                                          |
| ---------------- | --------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| TaskStack        | src/components/dashboard/TaskStack.tsx        | Orphaned   | Import in dashboard, fetch tasks via getTasks(), wire toggleTaskStatus |
| DashboardCommand | src/components/dashboard/DashboardCommand.tsx | Orphaned   | Add to dashboard, wire onTaskCreated to createTask()                   |
| Navigation       | Dashboard                                     | Missing    | Add links to /tasks and /radar pages                                   |
| RadarChart       | src/components/radar/RadarPageChart.tsx       | Duplicated | Could share with StatGrid's embedded radar                             |

### Data Flow That Should Exist

```
Dashboard
├── CharacterDisplay ← getUserStats() ← user table
├── StatGrid ← getUserStats() ← user table
├── TaskStack ← getTasks() ← tasks table
│   └── onToggle → toggleTaskStatus() → awards XP → user table
├── DashboardCommand → createTask() → AI classifyTaskStats() → tasks table
└── Navigation links → /tasks, /radar pages
```

### Implementation Order for Agents

#### Task 1: Integrate TaskStack into Dashboard

**Agent**: code mode

- Import TaskStack in src/app/dashboard/page.tsx
- Fetch tasks using getTasks() server action
- Pass tasks to TaskStack component
- Wire onToggle to toggleTaskStatus() with proper refresh

#### Task 2: Integrate DashboardCommand

**Agent**: code mode

- Add DashboardCommand to dashboard layout
- Wire onTaskCreated callback to call createTask() server action
- Add loading state handling
- Show success feedback after task creation

#### Task 3: Add Navigation

**Agent**: code mode

- Add "View All Tasks" link → /tasks page
- Add "Full Radar Chart" link → /radar page
- Use consistent styling with existing components

#### Task 4: Test Complete Flow

**Agent**: debug mode

- Test: Create task via DashboardCommand → appears in TaskStack
- Test: Complete task → XP awarded → CharacterDisplay updates
- Test: Navigation links work
- Test: Radar page shows correct data

### Agent Work Tree

```
worktrees/feat/dashboard-integration/
├── Task 1: TaskStack Integration (code)
├── Task 2: DashboardCommand Integration (code)
├── Task 3: Navigation Links (code)
└── Task 4: Integration Testing (debug)
```

---

_Last Updated: 2026-02-20_
_Version: 1.0_
