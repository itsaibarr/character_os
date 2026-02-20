# Dashboard Restructure + New Pages — Design Doc

**Date:** 2026-02-20

---

## Goal

Restructure `/dashboard` to focus on character identity and stats only. Move the radar chart to `/radar`. Move task management to `/tasks`. Add shared navigation across all pages.

---

## Page Structure After

| Route | Content |
|---|---|
| `/dashboard` | Character display + stat cards + XP bar + nav links |
| `/radar` | Full-page radar chart (larger, centered, with stat legend) |
| `/tasks` | Task management (separate plan) |

---

## `/dashboard` New Layout

```
Header: [ CH_OS ] [ Dashboard | Tasks | Radar ]    [ user@email ] [ logout ]

Main:
  ┌──────────────────────────────────────────────────┐
  │  CHARACTER DISPLAY                               │
  │  [character image]  Level 7 · Inventor           │
  │  INT●●●●● CRE●●●  →  Evolves at Level 15        │
  │  XP Progress ████████░░░░░ 68%                   │
  └──────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │  STATS                                                 │
  │  [ STR ] [ INT ] [ DIS ] [ CHA ] [ CRE ] [ SPI ]      │
  │  (existing 6 mini stat cards, unchanged)               │
  └────────────────────────────────────────────────────────┘

  [ → View Radar Chart ]   [ → Manage Tasks ]
  (subtle link buttons at the bottom)
```

**Character display section:**
- Shows the character image (static file, selected by type + stage)
- Level badge + character type name
- Top 2 stats shown as "dominant traits" with dot indicators
- Next evolution level (e.g. "Evolves at Level 15")
- XP progress bar

**Removed from dashboard:**
- Radar chart (moved to `/radar`)
- Task input (DashboardCommand) — removed or kept as a small shortcut link to `/tasks`
- TaskStack — removed (full task management is at `/tasks`)

---

## `/radar` Page

```
Header: same as dashboard (CH_OS + nav + user)

Main (centered):
  ┌────────────────────────────────────────┐
  │         RADAR CHART (larger)          │
  │         SIZE = 320px                  │
  │  STR ●●●○○   INT ●●●●●   DIS ●●○○○  │
  │  CHA ●○○○○   CRE ●●●○○   SPI ●○○○○  │
  │                                        │
  │  (legend below chart with stat names,  │
  │   current value, and per-stat level)   │
  └────────────────────────────────────────┘
```

- Uses the same `RadarChart` SVG component from `StatGrid`, with a larger `SIZE` prop
- Fetches `getUserStats()` for data
- Legend table below chart: Stat name | Color dot | Current XP | Level

---

## Navigation Component

Extract the header into a shared `<AppHeader>` server component:

```typescript
// src/components/AppHeader.tsx
// Props: user email, current page (for active link highlighting)
// Links: /dashboard, /tasks, /radar
```

Used in `/dashboard`, `/radar`, `/tasks` — replaces the inline header in each page.

---

## Character Image System

**File location:** `public/characters/{type}/{stage}.png`

Example:
```
public/characters/inventor/egg.png
public/characters/inventor/child.png
public/characters/inventor/adult.png
public/characters/inventor/master.png
```

**Type slugs** (9 types):
`warrior`, `scholar`, `monk`, `envoy`, `artisan`, `mystic`, `soldier`, `inventor`, `visionary`

**Stage slugs:** `egg`, `child`, `adult`, `master`

**Determination logic** (in `getUserStats()` or a separate helper):
```typescript
function getCharacterType(stats): string {
  // Rank stats by XP value, get top 2
  // Map pair to character type slug
  // Return 'egg' type until level 5 (image = public/characters/egg.png)
}

function getCharacterStage(level): 'egg' | 'child' | 'adult' | 'master' {
  if (level < 5)  return 'egg';
  if (level < 15) return 'child';
  if (level < 30) return 'adult';
  return 'master';
}
```

**Top-2 stat → character type mapping:**

| Dominant stats | Type | Slug |
|---|---|---|
| STR only | Warrior | `warrior` |
| INT only | Scholar | `scholar` |
| DIS only | Monk | `monk` |
| CHA only | Envoy | `envoy` |
| CRE only | Artisan | `artisan` |
| SPI only | Mystic | `mystic` |
| STR + DIS | Soldier | `soldier` |
| INT + CRE | Inventor | `inventor` |
| CHA + CRE | Visionary | `visionary` |
| STR + INT | Scholar (INT wins) | `scholar` |
| STR + CHA | Warrior (STR wins) | `warrior` |
| STR + CRE | Artisan (CRE wins) | `artisan` |
| STR + SPI | Warrior (STR wins) | `warrior` |
| INT + DIS | Scholar (INT wins) | `scholar` |
| INT + CHA | Scholar (INT wins) | `scholar` |
| INT + SPI | Scholar (INT wins) | `scholar` |
| DIS + CHA | Monk (DIS wins) | `monk` |
| DIS + CRE | Artisan (CRE wins) | `artisan` |
| DIS + SPI | Mystic (SPI wins) | `mystic` |
| CHA + SPI | Envoy (CHA wins) | `envoy` |
| CRE + SPI | Visionary (CRE wins) | `visionary` |

Until images are ready, show a placeholder gray box with the character type name.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/AppHeader.tsx` | New shared nav component |
| `src/app/dashboard/page.tsx` | Use AppHeader, remove TaskStack + DashboardCommand, add CharacterDisplay |
| `src/components/dashboard/CharacterDisplay.tsx` | New: image + level + dominant stats + next evolution |
| `src/components/dashboard/StatGrid.tsx` | Remove radar chart (moved to /radar page) |
| `src/app/radar/page.tsx` | New page: full-page radar chart + legend |
| `src/app/actions/tasks.ts` | `getUserStats()` — add character type + stage to return value |
| `src/lib/character.ts` | New: `getCharacterType()` and `getCharacterStage()` helpers |
