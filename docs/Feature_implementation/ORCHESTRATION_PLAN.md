# 🎼 Multi-Agent Orchestration Plan: Gamification Mechanics (Parallel Execution)

To achieve maximum speed, we are executing agents in **Parallel Phases** based on their dependency graphs.

Here is how you can run them simultaneously without causing merge conflicts or logic errors.

---

## 🚦 Execution Timeline

### PHASE 1: Database Foundation & Security Audit

**Status:** ⏸️ Run these in PARALLEL.
**Why:** The database schema is the absolute dependency for the backend, but `security-auditor` can review the initial request concurrently.

| Terminal 1                                             | Terminal 2                                                                                                  |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `database-architect`                                   | `security-auditor`                                                                                          |
| Builds tables, relations, and initial Drizzle schemas. | Reviews the features for cheating exploits, API abuse potential (PvP rank manipulation), and rate limiting. |

---

### PHASE 2: Core Implementation

**Status:** ⏸️ Run these in PARALLEL (Wait for Phase 1 to finish).
**Why:** `backend-specialist` builds the API/Actions while `frontend-specialist` builds the UI components with mock data. They do not block each other until the final integration step.

| Terminal 1                                                                        | Terminal 2                                                                              |
| :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `backend-specialist`                                                              | `frontend-specialist`                                                                   |
| Builds server actions, XP math, RNG logic, and AI integrations (Quests, Parsing). | Builds UI components: Heatmaps, Evolution Trees, Boss Health bars, Notification Toasts. |

---

### PHASE 3: Verification & Polish

**Status:** ⏸️ Run these in PARALLEL (Wait for Phase 2 to finish).
**Why:** Testing and performance optimization can happen simultaneously on the integrated code.

| Terminal 1                                                                                               | Terminal 2                                                                                                  |
| :------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `test-engineer`                                                                                          | `performance-optimizer`                                                                                     |
| Writes unit tests for XP math and integration tests for NLP parser. Runs `.agent/scripts/checklist.py .` | Audits the new Dashboard/Task UI for rerenders and bundles sizes, ensuring 60fps animations for Loot drops. |

---

## 🤖 Agent Execution Commands (Copy & Paste)

### PHASE 1 (Run concurrently in two separate terminals)

**Terminal 1:**

```text
Use the database-architect agent to implement the DB foundation for the 12 Gamification Mechanics.

**CONTEXT:**
- Request: Implement Phase 1-4 Gamification features (`docs/Feature_implementation/1_phase.md` to `4_phase.md`).
- Focus: Build Drizzle/Supabase schemas for characters, attributes, AI quests, bosses, items/inventory, streaks, guilds, and matchmaking.

**TASK:** Generate the SQL migrations / Drizzle schemas and ensure relationships are sound. Provide a summary of all new tables created.
```

**Terminal 2:**

```text
Use the security-auditor agent to review the 12 Gamification Mechanics for exploits.

**CONTEXT:**
- Request: Implement Phase 1-4 Gamification features (`docs/Feature_implementation/1_phase.md` to `4_phase.md`).
- Focus: Anti-cheat for PvP/Leaderboards, rate limiting for the NLP Task engine, and streak shield manipulation.

**TASK:** Outline security policies and create middleware/validation guards for the backend to use. Provide a clear security checklist.
```

---

### PHASE 2 (Run concurrently AFTER Phase 1 finishes)

**Terminal 1:**

```text
Use the backend-specialist agent to build the backend logic for the 12 Gamification Mechanics.

**CONTEXT:**
- Request: Implement Phase 1-4 Gamification features (`docs/Feature_implementation/1_phase.md` to `4_phase.md`).
- Previous Work: DB Schema and Security validation constraints are defined.

**TASK:** Build the Server Actions, Math (Adaptive Difficulty, Synergy), RNG (Loot Drop rates < 0.2%), and Vercel AI SDK integrations (NLP parsing, NPC dialogue). Output robust, type-safe API endpoints.
```

**Terminal 2:**

```text
Use the frontend-specialist agent to build the UI/UX for the 12 Gamification Mechanics.

**CONTEXT:**
- Request: Implement Phase 1-4 Gamification features (`docs/Feature_implementation/1_phase.md` to `4_phase.md`).
- Previous Work: DB Schema exists. You should initially mock server responses to build the UI quickly.
- Rules: Linear/Notion-inspired high-density. Use Lucide icons.

**TASK:** Build the UI components: Weekly Boss boards, Analytics Heatmaps, Branching Evolution Trees, Loot Drop animations, and NPC chat widgets. Hook them up to the backend actions if they exist, or use mock state.
```

---

### PHASE 3 (Run concurrently AFTER Phase 2 finishes)

**Terminal 1:**

```text
Use the test-engineer agent to verify the Gamification integration.

**CONTEXT:**
- Features built: XP math, AI parsing, Guilds, Bosses, Loot.

**TASK:** Write unit tests covering edge cases in RNG logic and XP scaling. Run `python .agent/scripts/checklist.py .` and fix critical bugs.
```

**Terminal 2:**

```text
Use the performance-optimizer agent to audit the Gamification UI.

**CONTEXT:**
- Features built: Heavy UI components like Heatmaps, Animations, and Trees.

**TASK:** Check the React tree for unnecessary re-renders (especially on Streak and XP increments). Ensure Lighthouse scores remain high and bundle sizes are minimal.
```
