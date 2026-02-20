# Onboarding No-Scroll Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

Several onboarding steps overflow the viewport, requiring users to scroll to reach the Next button. The worst offenders are steps 1, 2, 4, and 5 due to large cards and excessive padding.

## Solution

Two combined changes:
1. **Compact layout** — reduce padding and card sizes across all steps
2. **Auto-advance** — single-choice steps move to the next step immediately on selection

## Layout Changes (all steps)

| Element | Before | After |
|---------|--------|-------|
| Container vertical padding | `py-12` | `py-6` |
| Progress bar bottom margin | `mb-12` | `mb-6` |
| Footer top padding | `pt-12` | `pt-6` |
| Heading size | `text-4xl` | `text-2xl` |
| Subtitle size | `text-xl` | `text-base` |
| Content area min-height | `min-h-[300px]` | removed |
| Large card padding | `p-5` | `p-3` |
| Standard card padding | `p-4` | `p-3` |

## Auto-Advance

Steps where selecting an option immediately calls `handleNext()`:
- Step 2: archetype (single-select)
- Step 3: frictionProfile (single-select)
- Step 4: dailyCapacity (single-select)
- Step 6: acquisitionSource (single-select)

Multi-select steps keep manual Next (user needs to confirm selection):
- Step 1: focusAreas
- Step 5: trackingTools

Text area steps keep manual Next:
- Step 8: triggerReason
- Step 9: mainGoal

## Archetype Step (step 2) Layout Change

Switch from single-column tall cards to `grid-cols-2`, remove the description text line. Icon + label only. Saves ~40% vertical space on the tallest step.

## Files Changed

| File | Change |
|------|--------|
| `src/app/onboarding/OnboardingForm.tsx` | All changes above |
