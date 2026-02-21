# Agent Tasks - Complete Integration

## Current Status

- Branch is ahead of new-origin/main
- Dashboard integration started: TaskStackWrapper and DashboardCommandWrapper exist
- AI exists at src/lib/ai.ts but needs enhancement for detailed tasks

---

## Agent 1: Complete Dashboard Integration (Code Mode)

### Command:

```
Complete the dashboard integration. The dashboard currently has TaskStackWrapper and DashboardCommandWrapper components but they may not be fully wired.

1. Check src/app/dashboard/page.tsx and verify:
   - TaskStackWrapper is imported and rendered
   - DashboardCommandWrapper is imported and rendered
   - Both components are properly connected to data/actions

2. If needed, wire up:
   - TaskStackWrapper: should fetch tasks via getTasks() and handle toggleTaskStatus()
   - DashboardCommandWrapper: should call createTask() on task creation

3. Add navigation links to /tasks and /radar pages using Next.js Link component

4. Ensure the dashboard shows a cohesive view with:
   - CharacterDisplay (already there)
   - StatGrid (already there)
   - DashboardCommand (AI input)
   - TaskStack (quick task view)
   - Navigation to full pages

5. Test the flow: create task → appears in stack → complete → XP updates
```

---

## Agent 2: Enhance AI for Detailed Tasks (Code Mode)

### Command:

```
Enhance the AI task classification to work with detailed tasks. Currently AI only analyzes task title, but should analyze full task context.

1. Update src/lib/ai.ts - enhance classifyTaskStats function:

   CHANGE from (current):
```

export async function classifyTaskStats(content: string) {
// only analyzes content string
}

```

TO (new):
```

interface TaskInput {
content: string;
description?: string;
priority?: 'low' | 'medium' | 'high';
difficulty?: 'low' | 'medium' | 'high';
}

interface TaskAnalysis {
statWeights: {
str: number;
int: number;
dis: number;
cha: number;
cre: number;
spi: number;
};
priority: 'low' | 'medium' | 'high';
difficulty: 'low' | 'medium' | 'high';
estimatedXP: number;
insights: string[];
}

export async function classifyTaskStats(task: TaskInput): Promise<TaskAnalysis> {
// Analyze content + description for better stat classification
// Suggest priority/difficulty if not provided
// Calculate estimated XP based on weights and difficulty
// Return insights about which stats this task builds
}

```

2. Update src/app/actions/tasks.ts - modify createTask:
- Pass full task data (content, description, priority, difficulty) to AI
- Use AI-suggested priority/difficulty if user didn't specify
- Calculate XP reward based on stat weights and difficulty

3. Update src/components/tasks/NewTaskSheet.tsx:
- Show AI-generated stat weights preview before creation
- Show estimated XP gain
- Update misleading "will be classified after creation" message

---

## Agent 3: XP System Integration (Code Mode)

### Command:
```

Ensure XP system is properly integrated with task completion.

1. Check src/app/actions/tasks.ts - verify toggleTaskStatus:
   - When task is completed, award XP to user
   - XP should be based on: task xp_reward field or calculated from stat weights \* difficulty multiplier
2. XP Formula (implement if missing):

   ```
   baseXP = sum of all stat weights (0-30)
   difficultyMultiplier = low: 1x, medium: 1.5x, high: 2x
   awardedXP = baseXP * difficultyMultiplier
   ```

3. After XP is awarded:
   - Update user's character level if threshold reached
   - Update character type if top stats change at level 5+

4. Make sure CharacterDisplay and StatGrid refresh after task completion to show new XP

---

## Agent 4: Integration Testing (Debug Mode)

### Command:

```
Test the complete user flow after all integrations.

1. Start the dev server: npm run dev

2. Test the full flow:
   a) Go to dashboard - should see CharacterDisplay, StatGrid, DashboardCommand, TaskStack
   b) Create a task via DashboardCommand:
      - Enter "Complete the project report due next week"
      - AI should classify it (check stats: dis+cha likely)
      - Task should appear in TaskStack
   c) Complete the task:
      - Click completion toggle
      - XP should be awarded
      - CharacterDisplay should show updated XP/level
   d) Navigate to /tasks - should see full task list
   e) Navigate to /radar - should see radar chart

3. Test detailed task creation:
   a) Go to /tasks
   b) Create new task with: title, description, priority, difficulty
   c) Verify AI analyzes description for better stats
   d) Verify XP preview is shown

4. Check for any console errors or broken UI

5. Document any issues found.
```

---

## File Dependencies

- src/app/dashboard/page.tsx - main dashboard
- src/app/actions/tasks.ts - task server actions (getTasks, createTask, toggleTaskStatus)
- src/lib/ai.ts - AI classification
- src/components/dashboard/TaskStackWrapper.tsx - task list wrapper
- src/components/dashboard/DashboardCommandWrapper.tsx - AI command wrapper
- src/components/tasks/NewTaskSheet.tsx - detailed task form
- src/components/dashboard/CharacterDisplay.tsx - shows character/level
- src/components/dashboard/StatGrid.tsx - shows stats/XP
