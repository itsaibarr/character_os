# Phase 3 Design: Productivity Infrastructure

**Date:** 2026-02-21
**Status:** Approved
**Features:** Feature 7 (NLP Task Parser), Feature 8 (Streak + Shields), Feature 9 (Analytics Insights)

---

## Overview

Phase 3 delivers three features via 3 parallel agents followed by 1 wiring agent. Each parallel agent owns its feature end-to-end with no file conflicts. Agent 4 is the only agent that touches shared infrastructure files.

---

## Agent Orchestration Map

```
[Agent 1: NLP]  [Agent 2: Streak]  [Agent 3: Analytics]
       └──────────────┬──────────────────┘
                [Agent 4: Wire]
```

**Agents 1, 2, 3 run in parallel. Agent 4 runs after all three complete.**

---

## Feature 7: NLP Task Parsing Engine (Agent 1)

### Success Criteria
- User pastes unstructured text on the tasks page
- System parses it into structured tasks with confirmation step
- User selects which parsed tasks to add before any write occurs

### Files Owned by Agent 1
| File | Action |
|------|--------|
| `src/app/actions/nlp.ts` | CREATE |
| `src/components/tasks/ParseTextButton.tsx` | CREATE |
| `src/components/tasks/ParsedTaskPreview.tsx` | CREATE |
| `src/app/tasks/page.tsx` | MODIFY (header only) |

### Backend: `src/app/actions/nlp.ts`

```typescript
// parseTasksFromText(text: string): Promise<ActionResponse<ParsedTask[]>>
// - Uses Vercel AI SDK + OpenAI (existing pattern from src/lib/ai.ts)
// - Validates output with Zod schema
// - Rate limited: 20 calls/day per user
// - Returns ActionResponse<ParsedTask[]>
```

**ParsedTask shape (local to nlp.ts, moved to types.ts by Agent 4):**
```typescript
interface ParsedTask {
  title: string
  deadline: string | null        // ISO date string or null
  category: string | null        // e.g. "study", "work", "errand"
  difficulty: "easy" | "medium" | "hard"
  subtasks: string[]
  emotionalResistance: "low" | "medium" | "high"  // from sentiment
}
```

### UI: ParseTextButton + ParsedTaskPreview

**Tasks page header (existing: `[+ New Task]`):**
```
[+ New Task]  [⚡ Parse Text ▼]
```
`⚡ Parse Text` uses `text-orange-500` icon + `border-orange-500` on active state.

**Expanded state (below header):**
```
┌──────────────────────────────────────────────┐
│ Paste any text with tasks...                 │
│                                              │
└──────────────────────────────────────────────┘
[Parse →]  (orange-500 CTA)
```

**After parsing — ParsedTaskPreview:**
```
PARSED TASKS  (3 detected)
☐ Finish physics homework   [tomorrow] [study]   [medium]
☐ Buy groceries             [tomorrow] [errand]  [easy]
☐ Update portfolio          [tomorrow] [work]    [hard]
                                     [Add selected (3)]
```
- Checkboxes default to selected
- User can deselect before confirming
- `[Add selected]` calls existing task creation action in batch
- Panel collapses after confirm

---

## Feature 8: Intelligent Streak System with Shields (Agent 2)

### Success Criteria
- Streak increments daily when user completes at least 1 task
- Shield auto-activates to protect streak when a day is missed (if available)
- Milestones at 7/14/30 days auto-award shield items via existing inventory system
- Streak widget visible on dashboard

### Files Owned by Agent 2
| File | Action |
|------|--------|
| `src/app/actions/streak.ts` | CREATE |
| `src/lib/gamification/streak.ts` | CREATE |
| `src/lib/gamification/item-catalog.ts` | MODIFY (add 3 items) |
| `src/components/dashboard/StreakWidget.tsx` | CREATE |

### Backend: `src/lib/gamification/streak.ts` (pure functions)
```typescript
isStreakBroken(lastActivityDate: string): boolean
calculateStreakMilestone(streak: number): MilestoneReward | null
  // returns { itemId, bonusXp } at 7, 14, 30 days; null otherwise
shieldShouldActivate(shieldsRemaining: number, streakBroken: boolean): boolean
```

### Backend: `src/app/actions/streak.ts`
```typescript
getStreakStatus(userId): Promise<ActionResponse<StreakStatus>>
checkAndUpdateStreak(userId): Promise<ActionResponse<StreakStatus>>
  // - Compare last_activity_date to today
  // - If broken + shields > 0: auto-consume shield, maintain streak
  // - If broken + no shields: reset streak to 0
  // - If milestone hit: call addItemToInventory (existing action)
consumeStreakShield(userId): Promise<ActionResponse<void>>
```

**Streak shield auto-activation:** shield consumes automatically on missed day — no user action required.

### New Catalog Items (added to `item-catalog.ts`)
| Item | Rarity | Effect Type | Effect Value |
|------|--------|-------------|--------------|
| Streak Shield | uncommon | streak_shield | `{ misses: 1 }` |
| Iron Resolve | rare | streak_shield | `{ misses: 2 }` |
| Unbreakable Vow | mythic | streak_shield | `{ days: 7 }` |

**Milestone rewards:**
- 7 days → auto-drop "Streak Shield" (uncommon)
- 14 days → auto-drop "Iron Resolve" (rare) + 50 bonus XP
- 30 days → auto-drop "Unbreakable Vow" (mythic) + 200 bonus XP + 24h buff

### UI: StreakWidget

```
🔥 12   🛡 🛡      Next: 14d in 2 days
```

- `text-orange-500` flame icon, `text-orange-400` streak count
- Shield icons: filled = available, faded = spent
- "Next milestone" countdown in `text-faint` (existing design token)
- No shields: shows `text-slate-400` shield outline with "No shields" tooltip

---

## Feature 9: Personalized Analytics Insights (Agent 3)

### Success Criteria
- Collapsible panel on dashboard shows up to 5 key insights
- Attribute drift detected when XP share changes >5% in 7 days
- Burnout warning triggers when 7-day task load exceeds 1.25x personal average
- No external charting library — text + color indicators only

### Files Owned by Agent 3
| File | Action |
|------|--------|
| `src/app/actions/analytics.ts` | CREATE |
| `src/components/dashboard/InsightsPanel.tsx` | CREATE |

### Backend: `src/app/actions/analytics.ts`
```typescript
getAnalyticsInsights(userId): Promise<ActionResponse<AnalyticsInsights>>
```

**AnalyticsInsights shape (local, moved to types.ts by Agent 4):**
```typescript
interface AnalyticsInsights {
  attributeDrift: Array<{
    attribute: string           // "str" | "int" | "dis" | "cha" | "cre" | "spi"
    direction: "rising" | "lagging"
    deltaPct: number            // e.g. 8 for +8%
  }>
  categoryDistribution: Array<{
    category: string
    pct: number
  }>
  burnoutScore: number          // 0–1; >0.75 = warning
  burnoutMultiplier: number     // e.g. 1.3 = "1.3x normal load"
}
```

**Data sources (read-only from existing tables):**
- `characters` → `str_xp`, `int_xp`, `dis_xp`, `cha_xp`, `cre_xp`, `spi_xp` (current and 7 days ago via `task` history)
- `tasks` → `completed_at`, `category` (if exists) for distribution + load calculation
- No new DB schema required

### UI: InsightsPanel

```
INSIGHTS  [▲ collapse]
⚠ Creativity rising fast (+8%)      ← text-orange-500
⚠ Discipline lagging 3 weeks (-6%)  ← text-orange-500
● 12-day streak active  🛡🛡          ← text-emerald-600
■ Study 40% · Work 35% · Errand 25% ← text-faint
🔴 Task load 1.3x normal             ← text-red-500 (burnout)
[View full analytics →]             ← links to /analytics (future page)
```

**Behavior:**
- Default collapsed; state persisted in `localStorage`
- Max 5 insight rows (top 2 drifts + streak + top category + burnout if >0.75)
- Motion collapse animation using existing `motion` library
- Orange-500 for drift/warnings, emerald for positive trends, slate for neutral
- Collapsed state shows badge count of active warnings on the header

---

## Agent 4: Wiring Integration

### Files Modified by Agent 4 Only
| File | Change |
|------|--------|
| `src/lib/gamification/types.ts` | Add `ParsedTask`, `StreakStatus`, `AnalyticsInsights`; add `"streak_shield"` to `ItemEffectType` |
| `src/components/dashboard/GamificationHub.tsx` | Add state + fetches for streak/analytics; render `<StreakWidget>` and `<InsightsPanel>` |
| `src/app/tasks/page.tsx` | Import `<ParseTextButton>`, wire `onTasksAdded` |
| `src/lib/gamification/streak.test.ts` | CREATE: unit tests for streak pure functions |

### Type Additions to `types.ts`
```typescript
// Add to ItemEffectType union:
| "streak_shield"

// New interfaces:
interface ParsedTask { ... }          // moved from nlp.ts
interface StreakStatus {
  currentStreak: number
  shieldsRemaining: number
  lastActivityDate: string
  nextMilestone: 7 | 14 | 30 | null
  daysUntilMilestone: number | null
}
interface AnalyticsInsights { ... }   // moved from analytics.ts
```

### GamificationHub Integration
```typescript
// Add to GamificationHub state:
const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null)
const [analyticsInsights, setAnalyticsInsights] = useState<AnalyticsInsights | null>(null)

// Add to useEffect data fetches:
getStreakStatus(userId)
getAnalyticsInsights(userId)

// Add to render (existing layout maintained):
<StreakWidget status={streakStatus} />
<InsightsPanel insights={analyticsInsights} streakStatus={streakStatus} />
```

### Phase 2 Cleanup (pre-existing gaps)
Agent 4 also verifies/applies `docs/migrations/active_buffs.sql` migration if not already applied.

---

## Accent Color Usage (Phase 3)

All Phase 3 features follow existing orange-500/600 convention:

| Element | Color |
|---------|-------|
| "⚡ Parse Text" button active state | `border-orange-500`, `text-orange-500` |
| Streak count + flame | `text-orange-500` / `text-orange-400` |
| Attribute drift warnings | `text-orange-500` |
| Burnout warning | `text-red-500` (distinct severity) |
| Positive trends (rising streak) | `text-emerald-600` |
| Neutral insights | `text-faint` (existing token) |
| Milestone badge | `bg-orange-500 text-white` |

---

## File Conflict Matrix

| File | Agent 1 | Agent 2 | Agent 3 | Agent 4 |
|------|---------|---------|---------|---------|
| `types.ts` | read-only | read-only | read-only | **write** |
| `GamificationHub.tsx` | — | — | — | **write** |
| `tasks/page.tsx` | **write** | — | — | wire import |
| `actions/nlp.ts` | **create** | — | — | — |
| `actions/streak.ts` | — | **create** | — | — |
| `actions/analytics.ts` | — | — | **create** | — |
| `item-catalog.ts` | — | **modify** | — | — |
| `streak.ts` (lib) | — | **create** | — | — |
| Components | ParseText* | StreakWidget | InsightsPanel | — |

**No row has two agents writing simultaneously.**
