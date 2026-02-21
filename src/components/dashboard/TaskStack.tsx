"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { clsx } from "clsx";

interface Task {
  id: string;
  content: string;
  status: "todo" | "in-progress" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  parent_task_id?: string | null;
  due_date?: string | null;
  description?: string | null;
  xp_reward?: number | null;
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

interface TaskStackProps {
  tasks: Task[];
  allTasks: Task[];
  onToggleStatus: (id: string) => void;
  onSelectTask?: (id: string) => void;
}

const STAT_LABELS: { key: keyof Task; color: string }[] = [
  { key: "str_weight", color: "bg-red-400"     },
  { key: "int_weight", color: "bg-blue-400"    },
  { key: "dis_weight", color: "bg-amber-400"   },
  { key: "cha_weight", color: "bg-purple-400"  },
  { key: "cre_weight", color: "bg-emerald-400" },
  { key: "spi_weight", color: "bg-indigo-400"  },
];

const STAT_KEYS: (keyof Task)[] = [
  "str_weight", "int_weight", "dis_weight",
  "cha_weight", "cre_weight", "spi_weight",
];

function computeXp(task: Task): number {
  if (task.xp_reward != null) return task.xp_reward;
  const mult = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;
  return STAT_KEYS.reduce((sum, key) => sum + (((task[key] as number) ?? 0) * mult), 0);
}

function formatDueDate(dateStr: string): { label: string; className: string } {
  const due = new Date(dateStr);
  const dueMidnight = new Date(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / 86_400_000);
  if (diff < 0) return { label: "Overdue", className: "text-red-500" };
  if (diff === 0) return { label: "Today", className: "text-amber-500" };
  if (diff === 1) return { label: "Tomorrow", className: "text-text/60" };
  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    className: "text-text/60",
  };
}

const DIFFICULTY_LABEL: Record<Task["difficulty"], string> = {
  low: "Simple",
  medium: "Moderate",
  high: "Advanced",
};

function ActiveStatDots({ task }: { task: Task }) {
  const dots = STAT_LABELS.filter(s => (task[s.key] as number ?? 0) > 0);
  if (dots.length === 0) return null;
  return (
    <div className="flex items-center gap-1 ml-1">
      {dots.map(({ key, color }) => (
        <span key={key} className={clsx("w-1.5 h-1.5 rounded-full opacity-70", color)} />
      ))}
    </div>
  );
}

function TaskRow({
  task,
  onToggleStatus,
  isSubtask = false,
  isLast = false,
  hasMore = false,
}: {
  task: Task;
  onToggleStatus: (id: string) => void;
  isSubtask?: boolean;
  isLast?: boolean;
  hasMore?: boolean;
}) {
  return (
    <div className="flex items-stretch group">
      {isSubtask && (
        <div className="flex flex-col items-center shrink-0 w-8">
          {/* vertical line */}
          <div className={clsx(
            "w-px bg-border-faint ml-3",
            isLast && !hasMore ? "h-3.5 mt-0" : "flex-1"
          )} />
          {/* horizontal connector */}
          <div className="flex items-center h-0">
            <div className="w-3 h-px bg-border-faint" />
          </div>
          {isLast && !hasMore && <div className="flex-1" />}
        </div>
      )}
      <div
        className={clsx(
          "flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors",
          isSubtask ? "flex-1 min-w-0" : "flex-1 min-w-0"
        )}
      >
        <button
          onClick={() => onToggleStatus(task.id)}
          className={clsx(
            "flex items-center justify-center shrink-0 transition-all",
            isSubtask ? "w-3 h-3 rounded-full border" : "w-4 h-4 rounded-full border-2",
            task.status === "completed"
              ? "bg-accent border-accent"
              : isSubtask
                ? "border-slate-300 group-hover:border-slate-400"
                : "border-slate-300 group-hover:border-slate-400"
          )}
        >
          {task.status === "completed" && (
            <Check className={clsx("text-white", isSubtask ? "w-2 h-2" : "w-2.5 h-2.5")} />
          )}
        </button>

        <span
          className={clsx(
            "flex-1 truncate",
            isSubtask ? "text-xs font-normal" : "text-sm font-medium",
            task.status === "completed" ? "line-through text-faint" : "text-text"
          )}
        >
          {task.content}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={clsx(
              "rounded-full",
              isSubtask ? "w-1 h-1" : "w-1.5 h-1.5",
              task.priority === "high" ? "bg-red-400" :
              task.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
            )}
          />
          <ActiveStatDots task={task} />
        </div>
      </div>
    </div>
  );
}

export default function TaskStack({ tasks, allTasks, onToggleStatus, onSelectTask }: TaskStackProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-faint py-4">No active commands.</p>
    );
  }

  // Build lookup of all subtasks by parent (from allTasks for accurate counts)
  const allSubtasksByParent = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (t.parent_task_id) {
      const arr = allSubtasksByParent.get(t.parent_task_id) ?? [];
      arr.push(t);
      allSubtasksByParent.set(t.parent_task_id, arr);
    }
  }

  // Active subtasks by parent (only tasks currently displayed)
  const activeSubtasksByParent = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.parent_task_id) {
      const arr = activeSubtasksByParent.get(t.parent_task_id) ?? [];
      arr.push(t);
      activeSubtasksByParent.set(t.parent_task_id, arr);
    }
  }

  // Top-level active tasks (no parent)
  const activeParents = tasks.filter(t => !t.parent_task_id);

  // Orphan subtasks whose parent is not in active tasks (parent completed/missing)
  const activeParentIds = new Set(activeParents.map(t => t.id));
  const orphans = tasks.filter(t => t.parent_task_id && !activeParentIds.has(t.parent_task_id));

  // Render items: parents with their subtasks, then orphans
  const items: React.ReactNode[] = [];
  let animIndex = 0;

  for (const parent of activeParents) {
    const activeChildren = activeSubtasksByParent.get(parent.id) ?? [];
    const allChildren = allSubtasksByParent.get(parent.id) ?? [];
    const completedCount = allChildren.filter(t => t.status === "completed").length;
    const totalCount = allChildren.length;
    const hasChildren = activeChildren.length > 0;

    items.push(
      <motion.div
        key={parent.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, delay: animIndex * 0.04 }}
      >
        {/* Parent row */}
        <div
          className="py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group cursor-pointer"
          onClick={() => onSelectTask?.(parent.id)}
        >
          {/* Line 1: checkbox · title · count · priority · stats */}
          <div className="flex items-center gap-3">
            <button
              onClick={e => { e.stopPropagation(); onToggleStatus(parent.id); }}
              className={clsx(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                parent.status === "completed"
                  ? "bg-accent border-accent"
                  : "border-slate-300 group-hover:border-slate-400"
              )}
            >
              {parent.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
            </button>

            <span
              className={clsx(
                "flex-1 text-sm font-medium truncate",
                parent.status === "completed" ? "line-through text-faint" : "text-text"
              )}
            >
              {parent.content}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              {totalCount > 0 && (
                <span className="text-[10px] font-medium text-faint tabular-nums">
                  {completedCount}/{totalCount}
                </span>
              )}
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  parent.priority === "high" ? "bg-red-400" :
                  parent.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
                )}
              />
              <ActiveStatDots task={parent} />
            </div>
          </div>

          {/* Line 2: meta — due date · difficulty · XP */}
          {(() => {
            const xp = computeXp(parent);
            const duePart = parent.due_date ? formatDueDate(parent.due_date) : null;
            const diffLabel = DIFFICULTY_LABEL[parent.difficulty];
            const hasMeta = duePart || xp > 0;
            if (!hasMeta) return null;
            return (
              <div className="flex items-center gap-1 pl-7 mt-0.5 text-[10px] font-medium text-text/50">
                {duePart && (
                  <>
                    <span className={duePart.className}>{duePart.label}</span>
                    <span className="text-text/30">·</span>
                  </>
                )}
                <span>{diffLabel}</span>
                {xp > 0 && (
                  <>
                    <span className="text-text/30">·</span>
                    <span className="text-emerald-500/70">+{xp} XP</span>
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Subtask rows */}
        {hasChildren && (
          <div className="relative pl-4">
            {/* Vertical tree line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border-faint" style={{ left: "1.25rem" }} />
            {activeChildren.map((child, ci) => {
              const isLast = ci === activeChildren.length - 1;
              return (
                <div key={child.id} className="flex items-stretch group">
                  {/* connector */}
                  <div className="shrink-0 flex flex-col items-start" style={{ width: "1rem" }}>
                    <div className={clsx("w-px bg-border-faint ml-1", isLast ? "h-3.5" : "h-full")} />
                    <div className="w-3 h-px bg-border-faint" />
                    {!isLast && <div className="flex-1 w-px bg-border-faint ml-1" />}
                  </div>

                  <div
                    className="flex items-center gap-3 py-2 border-b border-border-faint hover:bg-slate-50 transition-colors flex-1 min-w-0 pr-1 cursor-pointer"
                    onClick={() => onSelectTask?.(child.id)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); onToggleStatus(child.id); }}
                      className={clsx(
                        "w-3 h-3 rounded-full border flex items-center justify-center shrink-0 transition-all",
                        child.status === "completed"
                          ? "bg-accent border-accent"
                          : "border-slate-300 group-hover:border-slate-400"
                      )}
                    >
                      {child.status === "completed" && <Check className="w-2 h-2 text-white" />}
                    </button>

                    <span
                      className={clsx(
                        "flex-1 text-xs font-normal truncate",
                        child.status === "completed" ? "line-through text-faint" : "text-text/70"
                      )}
                    >
                      {child.content}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={clsx(
                          "w-1 h-1 rounded-full",
                          child.priority === "high" ? "bg-red-400" :
                          child.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
                        )}
                      />
                      <ActiveStatDots task={child} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
    animIndex++;
  }

  // Orphan subtasks (parent not active)
  for (const task of orphans) {
    items.push(
      <motion.div
        key={task.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, delay: animIndex * 0.04 }}
        className="flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group cursor-pointer"
        onClick={() => onSelectTask?.(task.id)}
      >
        <div className="w-4 flex items-center justify-center shrink-0">
          <span className="text-[10px] text-faint">↳</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
          className={clsx(
            "w-3 h-3 rounded-full border flex items-center justify-center shrink-0 transition-all",
            task.status === "completed"
              ? "bg-accent border-accent"
              : "border-slate-300 group-hover:border-slate-400"
          )}
        >
          {task.status === "completed" && <Check className="w-2 h-2 text-white" />}
        </button>
        <span
          className={clsx(
            "flex-1 text-xs font-normal truncate",
            task.status === "completed" ? "line-through text-faint" : "text-text/70"
          )}
        >
          {task.content}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={clsx(
              "w-1 h-1 rounded-full",
              task.priority === "high" ? "bg-red-400" :
              task.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
            )}
          />
          <ActiveStatDots task={task} />
        </div>
      </motion.div>
    );
    animIndex++;
  }

  return (
    <div className="w-full">
      <AnimatePresence initial={false}>
        {items}
      </AnimatePresence>
    </div>
  );
}
