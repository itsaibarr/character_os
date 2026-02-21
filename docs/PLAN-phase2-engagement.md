# Phase 2 — Engagement & Motivation Mechanics: Implementation Plan

> 3 features: **Weekly Boss Fights**, **Attribute Synergy Bonuses**, **Loot System with Rarity**
> Split for **3 parallel agents** with zero file overlap.

---

## Current State (What Already Exists)

| Component                                  | Status        | Notes                                                                    |
| ------------------------------------------ | ------------- | ------------------------------------------------------------------------ |
| DB tables (`bosses`, `items`, `inventory`) | ✅ Migrated   | Tables exist via `gamification_phases.sql`                               |
| `rng.ts` (loot roll logic)                 | ✅ Done       | Drop rates: mythic 0.2%, rare 2%, uncommon 10%, common 20%               |
| `synergy.ts` (multiplier calc)             | ✅ Done       | 1.5x–2x bonus for weak stat training                                     |
| `generateWeeklyBoss` action                | ✅ Scaffolded | Creates boss, links 3–7 tasks, sets HP                                   |
| `getActiveWeeklyBoss` action               | ✅ Scaffolded | Fetches boss + linked tasks                                              |
| Boss HP tracking in `toggleTaskStatus`     | ✅ Wired      | Deals damage on task completion, restores on un-complete                 |
| `WeeklyBossBoard.tsx` (UI)                 | ✅ Scaffolded | Renders boss HP bar, attack list, summon button                          |
| `LootDropAlert.tsx` (UI)                   | ✅ Scaffolded | Shows rarity-styled toast alert                                          |
| Loot roll call in `toggleTaskStatus`       | ⚠️ Partial    | Rolls rarity but does NOT persist to `inventory` — marked "Future phase" |

## Gap Analysis (What Needs to Be Built)

### Feature 4: Weekly Boss Fights — Gaps

1. **Boss defeat rewards** — defeating a boss triggers no reward (XP bonus, loot, title)
2. **Boss expiry enforcement** — expired bosses aren't marked as `escaped`
3. **Rescheduling protection** — no guard against infinite rescheduling of boss-linked tasks
4. **Boss summon cooldown** — users can spam `generateWeeklyBoss` with no throttle
5. **Boss history/stats** — no way to see past bosses (defeated/escaped count)

### Feature 5: Attribute Synergy Bonuses — Gaps

1. **Synergy not surfaced in UI** — users can't see which tasks give synergy bonuses
2. **No synergy indicator on task cards** — no visual cue for multi-stat tasks
3. **XP breakdown toast missing synergy info** — toast only shows `+X stat`, not the multiplier source
4. **No "Synergy Guide" explanation** — users don't learn the mechanic

### Feature 6: Loot System with Rarity — Gaps

1. **Loot not persisting to `inventory`** — `toggleTaskStatus` rolls rarity but discards the result
2. **No item catalog seed** — `items` table is empty, no actual items defined
3. **No inventory UI** — no page/sidebar to view collected items
4. **No item usage/activation** — no server action to consume XP boosters, streak shields, etc.
5. **No active buff tracking** — no table/logic for temporary buffs ("+20% INT for 3h")
6. **`LootDropAlert` not connected** — component renders with mock data, not from real drops

---

## 3-Agent Separation

### Agent 1: Backend (Server Actions & Business Logic)

**Files owned** (no overlap with other agents):

| Action                            | File                                                    |
| --------------------------------- | ------------------------------------------------------- |
| Boss defeat rewards + expiry CRON | `src/app/actions/gamification.ts`                       |
| Loot persistence to inventory     | `src/app/actions/tasks.ts` (existing loot roll section) |
| Item catalog + inventory actions  | `src/app/actions/inventory.ts` [NEW]                    |
| Buff activation + expiry logic    | `src/lib/gamification/buffs.ts` [NEW]                   |
| Item catalog seed data            | `src/lib/gamification/item-catalog.ts` [NEW]            |
| Active buffs DB table             | DB migration via Supabase                               |

**Tasks:**

1. **Seed item catalog** — define 15–20 items across 4 rarities:
   - Common: `Minor XP Potion (+10% all XP, 1h)`, `Focus Tonic (+15% DIS XP, 2h)`
   - Uncommon: `Streak Shield`, `Stat Reset Scroll (redistribute 50 XP)`
   - Rare: `Evolution Catalyst (unlock branch preview)`, `Double XP Elixir (3h)`
   - Mythic: `Polymath Tome (+5 all stats)`, `Boss Slayer Title`
2. **Wire loot persistence** — after `rollForLootRarity` in `toggleTaskStatus`, pick a random item of that rarity from catalog and insert into `inventory` (upsert quantity)
3. **Boss defeat rewards** — on boss HP reaching 0: award bonus XP (sum of all linked task damage × 0.5), guaranteed rare+ loot roll, log achievement
4. **Boss expiry check** — action or CRON-style check: if `expires_at < now()` and `status = 'active'`, mark `status = 'escaped'`
5. **Buff system** — create `active_buffs` table (`user_id, item_id, effect_type, effect_value, expires_at`), create `activateItem` action that moves item from inventory to active buff, modify XP calculation in `toggleTaskStatus` to check active buffs
6. **Inventory actions** — `getInventory()`, `useItem(itemId)`, `getActiveBuffs()`

**Dependencies:** None — this agent works first.

---

### Agent 2: Frontend (UI Components & Pages)

**Files owned** (no overlap with other agents):

| Component              | File                                                          |
| ---------------------- | ------------------------------------------------------------- |
| Inventory page         | `src/app/inventory/page.tsx` [NEW]                            |
| Inventory item list    | `src/components/inventory/InventoryGrid.tsx` [NEW]            |
| Item detail card       | `src/components/inventory/ItemCard.tsx` [NEW]                 |
| Synergy badge on tasks | `src/components/tasks/SynergyBadge.tsx` [NEW]                 |
| Boss history panel     | `src/components/dashboard/gamification/BossHistory.tsx` [NEW] |
| Active buffs indicator | `src/components/dashboard/ActiveBuffs.tsx` [NEW]              |
| Sidebar nav update     | `src/components/AppSidebar.tsx` (add Inventory link)          |

**Tasks:**

1. **Synergy badge** — small inline indicator on task cards showing "⚡ 1.5x" or "⚡⚡ 2x" when a task trains 2+ stats with weak-stat bonus
2. **Inventory page** — grid layout showing items grouped by rarity, each card shows name, description, rarity color, quantity, and "Use" button for consumables
3. **Item card** — rarity-colored border (common=gray, uncommon=green, rare=blue, mythic=amber), icon, stack count
4. **Boss history** — small collapsible section under WeeklyBossBoard showing last 5 bosses with outcome (Defeated ✓ / Escaped ✗)
5. **Active buffs strip** — horizontal pill row at top of dashboard or next to character display showing active buff icons with countdown timers
6. **Wire LootDropAlert** — connect to real loot drop data returned from `toggleTaskStatus`

**Dependencies:** Can start immediately with mock data. Wire to real actions after Agent 1 finishes.

---

### Agent 3: Integration, Testing & Data Wiring

**Files owned** (no overlap with other agents):

| Scope                    | File                                                          |
| ------------------------ | ------------------------------------------------------------- |
| Integration wiring       | `src/components/dashboard/GamificationHub.tsx`                |
| XP toast enhancement     | `src/components/dashboard/TaskStackWrapper.tsx` or equivalent |
| Synergy calc test        | `src/lib/gamification/synergy.test.ts` [NEW]                  |
| Buff system test         | `src/lib/gamification/buffs.test.ts` [NEW]                    |
| Inventory action test    | `src/app/actions/inventory.test.ts` [NEW]                     |
| Boss reward test         | `src/app/actions/gamification.test.ts` (extend)               |
| RNG edge case tests      | `src/lib/gamification/rng.test.ts` (extend)                   |
| Item catalog seed script | `scripts/seed-items.ts` [NEW]                                 |

**Tasks:**

1. **Seed script** — write a Supabase seed script to insert the item catalog defined by Agent 1 into the `items` table
2. **Wire XP toast to show synergy** — when `toggleTaskStatus` returns gains with synergy active, enhance toast: "+8 discipline (+1.5x synergy)"
3. **Wire LootDropAlert into task completion flow** — when `toggleTaskStatus` returns a loot drop, trigger the alert component with the real item data
4. **Wire inventory page** — connect Agent 2's UI to Agent 1's `getInventory()` and `useItem()` actions
5. **Unit tests:**
   - `synergy.test.ts`: edge cases (all stats zero, single stat, exactly 10% threshold)
   - `buffs.test.ts`: activation, expiry, stacking rules
   - `rng.test.ts`: bonus multiplier limits, probability distribution sanity check
6. **Integration tests:**
   - Boss defeat flow: create boss → complete all linked tasks → verify rewards
   - Loot persistence: complete task → verify inventory row created
   - Buff effect: activate buff → complete task → verify boosted XP

---

## Execution Order

```
┌─────────────────────────────────────────────┐
│  Agent 1 (Backend)  — starts first          │
│  Agent 2 (Frontend) — starts in parallel    │
│  Agent 3 (Integration) — starts AFTER 1 & 2 │
└─────────────────────────────────────────────┘
```

| Phase | Agents                       | Blocker                                        |
| ----- | ---------------------------- | ---------------------------------------------- |
| 1     | Agent 1 + Agent 2 (parallel) | None — Agent 2 uses mock data                  |
| 2     | Agent 3                      | Needs Agent 1's actions + Agent 2's components |

---

## Agent Execution Commands

### Agent 1 (Backend) — Terminal 1:

```text
Use the backend-specialist agent to complete Phase 2 backend logic.

**CONTEXT:**
- Plan: docs/PLAN-phase2-engagement.md (Agent 1 section)
- Existing code: src/lib/gamification/rng.ts, synergy.ts exist. Boss actions scaffolded in gamification.ts. Loot roll in tasks.ts line 533 is marked "Future phase".
- DB: bosses, items, inventory tables exist (gamification_phases.sql)

**TASK:**
1. Create src/lib/gamification/item-catalog.ts — define 15-20 items across 4 rarities
2. Create src/app/actions/inventory.ts — getInventory(), useItem(itemId), getActiveBuffs()
3. Create src/lib/gamification/buffs.ts — buff activation, expiry, XP modifier logic
4. Wire loot persistence in tasks.ts toggleTaskStatus — after rollForLootRarity, pick random item from catalog, upsert to inventory
5. Add boss defeat rewards in gamification.ts — bonus XP + guaranteed rare+ drop on boss kill
6. Add boss expiry logic — mark expired bosses as 'escaped'
7. Create active_buffs DB migration (user_id, item_id, effect_type, effect_value JSONB, expires_at)
8. Modify XP calculation to apply active buff multipliers

DO NOT touch any .tsx component files. Backend only.
```

### Agent 2 (Frontend) — Terminal 2:

```text
Use the frontend-specialist agent to build Phase 2 UI components.

**CONTEXT:**
- Plan: docs/PLAN-phase2-engagement.md (Agent 2 section)
- Design system: text-[10px] labels, font-black headings, border-border, bg-white surfaces, rounded-sm, Lucide icons
- Existing: WeeklyBossBoard.tsx, LootDropAlert.tsx exist as scaffolds
- Style: Linear/Notion-inspired, high density, no gradients/glassmorphism

**TASK:**
1. Create src/components/tasks/SynergyBadge.tsx — inline "⚡1.5x" / "⚡⚡2x" indicator for multi-stat tasks
2. Create src/app/inventory/page.tsx — grid layout, items grouped by rarity
3. Create src/components/inventory/InventoryGrid.tsx — responsive grid of ItemCards
4. Create src/components/inventory/ItemCard.tsx — rarity-colored border, name, description, quantity, "Use" button
5. Create src/components/dashboard/gamification/BossHistory.tsx — last 5 bosses, outcome badges
6. Create src/components/dashboard/ActiveBuffs.tsx — horizontal pill row with countdown timers
7. Add "Inventory" link to AppSidebar.tsx

Use mock data initially. Actions will be wired by Agent 3.
DO NOT modify any server action files (.ts in actions/).
```

### Agent 3 (Integration & Testing) — Terminal 3 (AFTER 1 & 2):

```text
Use the test-engineer agent to wire and test Phase 2 integration.

**CONTEXT:**
- Plan: docs/PLAN-phase2-engagement.md (Agent 3 section)
- Agent 1 built: inventory actions, buff system, item catalog, boss rewards, loot persistence
- Agent 2 built: InventoryGrid, ItemCard, SynergyBadge, BossHistory, ActiveBuffs components

**TASK:**
1. Wire inventory page to getInventory() and useItem() actions
2. Wire LootDropAlert to real loot data from toggleTaskStatus return value
3. Wire SynergyBadge into task list — calculate synergy from task weights + user stats
4. Enhance XP toast to show synergy multiplier source
5. Write unit tests: synergy.test.ts, buffs.test.ts, rng.test.ts edge cases
6. Write integration tests: boss defeat flow, loot persistence, buff application
7. Create scripts/seed-items.ts to populate items table
8. Run python .agent/scripts/checklist.py . and fix critical issues
```

---

## File Ownership Matrix (Conflict Prevention)

| File                                                      | Agent 1 | Agent 2 | Agent 3 |
| --------------------------------------------------------- | :-----: | :-----: | :-----: |
| `actions/gamification.ts`                                 |   ✏️    |    —    |    —    |
| `actions/tasks.ts` (loot section)                         |   ✏️    |    —    |    —    |
| `actions/inventory.ts` [NEW]                              |   ✏️    |    —    |    —    |
| `lib/gamification/buffs.ts` [NEW]                         |   ✏️    |    —    |    —    |
| `lib/gamification/item-catalog.ts` [NEW]                  |   ✏️    |    —    |    —    |
| `app/inventory/page.tsx` [NEW]                            |    —    |   ✏️    |    —    |
| `components/inventory/*` [NEW]                            |    —    |   ✏️    |    —    |
| `components/tasks/SynergyBadge.tsx` [NEW]                 |    —    |   ✏️    |    —    |
| `components/dashboard/ActiveBuffs.tsx` [NEW]              |    —    |   ✏️    |    —    |
| `components/dashboard/gamification/BossHistory.tsx` [NEW] |    —    |   ✏️    |    —    |
| `AppSidebar.tsx`                                          |    —    |   ✏️    |    —    |
| `GamificationHub.tsx`                                     |    —    |    —    |   ✏️    |
| `TaskStackWrapper.tsx` (toast)                            |    —    |    —    |   ✏️    |
| `*.test.ts` files [NEW]                                   |    —    |    —    |   ✏️    |
| `scripts/seed-items.ts` [NEW]                             |    —    |    —    |   ✏️    |

---

## Verification Checklist

- [ ] Completing a task rolls loot AND persists to `inventory` table
- [ ] Inventory page shows collected items with correct quantities
- [ ] Using a consumable item activates a buff with countdown
- [ ] Active buffs boost XP calculation during their duration
- [ ] Defeating a boss awards bonus XP + guaranteed rare+ loot
- [ ] Expired bosses auto-marked as 'escaped'
- [ ] Synergy badge appears on multi-stat tasks
- [ ] XP toast shows synergy multiplier when active
- [ ] Boss history shows last 5 bosses with outcomes
- [ ] All unit tests pass
- [ ] checklist.py returns no critical issues
