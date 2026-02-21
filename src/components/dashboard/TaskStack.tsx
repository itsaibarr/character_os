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
  str_weight?: number;
  int_weight?: number;
  dis_weight?: number;
  cha_weight?: number;
  cre_weight?: number;
  spi_weight?: number;
}

interface TaskStackProps {
  tasks: Task[];
  onToggleStatus: (id: string) => void;
}

const STAT_LABELS: { key: keyof Task; color: string }[] = [
  { key: "str_weight", color: "bg-red-400"     },
  { key: "int_weight", color: "bg-blue-400"    },
  { key: "dis_weight", color: "bg-amber-400"   },
  { key: "cha_weight", color: "bg-purple-400"  },
  { key: "cre_weight", color: "bg-emerald-400" },
  { key: "spi_weight", color: "bg-indigo-400"  },
];

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

export default function TaskStack({ tasks, onToggleStatus }: TaskStackProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-faint py-4">No active commands.</p>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence initial={false}>
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            className="flex items-center gap-3 py-2.5 border-b border-border-faint hover:bg-slate-50 transition-colors group"
          >
            {/* Toggle */}
            <button
              onClick={() => onToggleStatus(task.id)}
              className={clsx(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                task.status === "completed"
                  ? "bg-accent border-accent"
                  : "border-slate-300 group-hover:border-slate-400"
              )}
            >
              {task.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
            </button>

            {/* Content */}
            <span
              className={clsx(
                "flex-1 text-sm font-medium truncate",
                task.status === "completed" ? "line-through text-faint" : "text-text"
              )}
            >
              {task.content}
            </span>

            {/* Right meta */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  task.priority === "high" ? "bg-red-400" :
                  task.priority === "medium" ? "bg-amber-400" : "bg-slate-300"
                )}
              />
              <ActiveStatDots task={task} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
