Batch 1 — Core Game Mechanics (Foundational)

1. Branching Evolution Tree

Mechanic (what exactly you implement):

A character has 6 attributes (Strength, Discipline, Intellect, Charisma, Creativity, Spirituality).

Evolution is not level-based, but attribute-ratio–based.

At milestone levels (5, 10, 20…), you check the dominant attribute(s) and unlock one of several evolution branches.

Example logic:

Strength > 40% → “Beast Path”

Creativity + Charisma dominate → “Mystic Path”

Intellect + Discipline → “Techno Path”

Why:
Linear evolution becomes boring. Branching keeps progression unpredictable and personal.

Pushback:
If you don’t implement meaningful attribute impact, this becomes “cosmetic inflation.” Make sure evolution affects gameplay (XP bonuses, quest types, etc.).

2. Dynamic AI-Generated Quests

Mechanic:

Each morning an AI agent generates 2–5 quests based on:

yesterday’s completed vs failed tasks

current weak attribute

backlog items

emotional tone of tasks

Types of quests:

Urgent Quest (fix procrastination)

Strength Quest (hard task first)

Momentum Quest (complete 3 small tasks in a row)

Boss Prep Quest (prepare subtasks for the weekly boss)

Why:
This creates an adaptive game loop similar to roguelikes — always new challenges.

Pushback:
Random quests without logic will annoy the user. Implement strict constraints:
"If quest workload > user capacity, regenerate."

3. Adaptive Difficulty System

Mechanic:
You score the user’s last 7 days of behavior.
Use a simple formula:

Too many fails → lower task difficulty thresholds, increase rewards for small wins.

Too many easy wins → increase required effort for quest XP, offer harder quests.

Difficulty adjusts weekly, not daily.

Why:
Difficulty curves prevent boredom (too easy) or burnout (too hard).

Pushback:
Don’t make difficulty changes invisible. Surface it:
"Your Discipline difficulty was lowered to support recovery."
