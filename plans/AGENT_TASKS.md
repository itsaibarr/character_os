# Agent Tasks - Ready to Execute

## Agent 1: TaskStack Integration (Code Mode)

**Purpose:** Import TaskStack into dashboard and wire to data

**Copy this command to Agent 1:**

```
Integrate the TaskStack component into the dashboard. Do the following:

1. Edit src/app/dashboard/page.tsx:
   - Import TaskStack from 'components/dashboard/TaskStack' (see below for file content)
   - Import getTasks from 'app/actions/tasks' (see below for file content)
   - Add 'use client' directive at top
   - Fetch tasks using getTasks()
   - Render <TaskStack tasks={tasks} onToggle={toggleTask} /> below the StatGrid
   - Create a toggleTask function that calls toggleTaskStatus() from 'app/actions/tasks' (see below for file content) and refreshes the page

2. Read src/components/dashboard/TaskStack.tsx to understand the props it expects:
   - tasks: array of task objects
   - onToggle: function to call when task is toggled

3. Read src/app/actions/tasks.ts to understand:
   - getTasks() - returns all tasks for current user
   - toggleTaskStatus(taskId) - toggles task completion and awards XP

4. Make sure the integration follows the existing code patterns and styling in the dashboard.
```

## Agent 2: DashboardCommand Integration (Code Mode)

**Purpose:** Add AI command input to dashboard

**Copy this command to Agent 2:**

```
Integrate the DashboardCommand component into the dashboard. Do the following:

1. Edit src/app/dashboard/page.tsx:
   - Import DashboardCommand from 'components/dashboard/DashboardCommand' (see below for file content)
   - Import createTask from 'app/actions/tasks' (see below for file content)
   - Add a handleCreateTask function that:
     - Calls createTask(input) with the user's input
     - Shows success feedback (console.log or toast)
     - Clears the input
   - Add <DashboardCommand onTaskCreated={handleCreateTask} /> to the dashboard, above the StatGrid

2. Read src/components/dashboard/DashboardCommand.tsx to understand:
   - The onTaskCreated callback receives the task input string
   - It already has loading and processing states

3. Read src/app/actions/tasks.ts to understand:
   - createTask(formData) - creates a new task, uses AI to classify stats

4. Make sure the input is properly passed to createTask and handle the response.
```

## Agent 3: Navigation Links (Code Mode)

**Purpose:** Add links to /tasks and /radar pages

**Copy this command to Agent 3:**

```
Add navigation links to the dashboard. Do the following:

1. Edit src/app/dashboard/page.tsx:
   - Add navigation section with two links:
     - "View All Tasks" → links to /tasks
     - "View Full Radar" → links to /radar
   - Use Next.js Link component from 'next/link'
   - Style with Tailwind CSS matching the existing design (use primary color #0056D2)

2. Place the links appropriately - consider adding them below StatGrid or in the header area

3. Ensure consistent styling with other components in the dashboard.
```

## Agent 4: Integration Testing (Debug Mode)

**Purpose:** Test complete user flow

**Copy this command to Agent 4:**

```
Test the complete dashboard integration. Do the following:

1. First, review the updated dashboard at src/app/dashboard/page.tsx to understand what should work

2. Test the data flow:
   - Create a task via DashboardCommand → should appear in TaskStack
   - Complete a task in TaskStack → should toggle and award XP
   - XP should update CharacterDisplay and StatGrid

3. Test navigation:
   - Click "View All Tasks" → should go to /tasks page
   - Click "View Full Radar" → should go to /radar page

4. Check for any errors in console or build

5. If there are issues, identify the root cause and document what needs to be fixed.
```

---

## Running Agents in Parallel

You can run all 4 agents simultaneously - they work on different files:

- Agent 1, 2, 3 all edit src/app/dashboard/page.tsx (coordinate if needed)
- Agent 4 tests the integration after Agents 1-3 complete

---

## File Dependencies

- src/app/actions/tasks.ts - contains getTasks(), createTask(), toggleTaskStatus()
- src/components/dashboard/TaskStack.tsx - task list component
- src/components/dashboard/DashboardCommand.tsx - AI command input
- src/app/dashboard/page.tsx - main dashboard (all three add to this)
