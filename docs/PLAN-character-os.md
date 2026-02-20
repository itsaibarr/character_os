# Project Plan: CharacterOS

**Task Slug**: character-os
**Goal**: Build an "Operating System for Human Character" based on RPG mechanics.

## Phase 1: Context & Foundation

- [ ] **Research**: Review `product_spec.md.resolved` and `design-system/characteros/MASTER.md`. (Done)
- [ ] **Setup**: Initialize Next.js 14 project with TypeScript, Tailwind CSS, Shadcn UI.
- [ ] **Design System Integration**: Configure `tailwind.config.ts` with tokens from the design system master file.

## Phase 2: Core Data Architecture

- [ ] **Database Setup**: Configure Supabase/Postgres.
- [ ] **Schema Definition**: Create tables for `Users`, `Logs` (with metadata), `Stats` (STR, INT, DIS, CHA, CRE, SPI), and `Traits`.
- [ ] **ORM**: Setup Drizzle ORM for type-safe database access.

## Phase 3: The Terminal (Input Logic)

- [ ] **Frontend**: Build the minimalist text input component ("The Terminal").
- [ ] **Backend API**: implement natural language processing logic.
  - _Mock Mode_: Initial regex/keyword based parsing.
  - _AI Mode_: Integration with OpenAI/Claude for intent analysis (requires API key).
- [ ] **Feedback Loop**: Display immediate XP gain and trait progress.

## Phase 4: The Character Sheet (Dashboard)

- [ ] **Visualization**: Implement Hexagon Radar Chart for stats.
- [ ] **Theming**: Implement "Cyberpunk" (coder) and "Zen" (meditator) themes that switch based on archetype.
- [ ] **Stats Grid**: Display numerical values and progress bars.

## Phase 5: Integrity Engine (Basic)

- [ ] **Trust Tier**: Implement logic to flag high-XP claims for verification.
- [ ] **Reflection Prompt**: UI for asking "What did you learn?" on high-value tasks.

## Verification Checklist

- [ ] **Visuals**: Does the app match the designated "Cyberpunk/Zen" aesthetic?
- [ ] **Data Flow**: Do logs correctly update user stats?
- [ ] **Responsiveness**: Is the terminal usable on mobile?
- [ ] **Perf**: Does the dashboard load instantly (Server Components)?
