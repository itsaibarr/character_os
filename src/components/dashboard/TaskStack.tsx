"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, Clock, AlertCircle, MoreHorizontal, ChevronRight } from "lucide-react";
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

const STAT_LABELS: { key: keyof Task; label: string; color: string }[] = [
  { key: "str_weight", label: "STR", color: "text-red-500" },
  { key: "int_weight", label: "INT", color: "text-blue-500" },
  { key: "dis_weight", label: "DIS", color: "text-amber-500" },
  { key: "cha_weight", label: "CHA", color: "text-purple-500" },
  { key: "cre_weight", label: "CRE", color: "text-emerald-500" },
  { key: "spi_weight", label: "SPI", color: "text-indigo-500" },
];

function StatBadges({ task }: { task: Task }) {
  const active = STAT_LABELS.filter(s => (task[s.key] as number ?? 0) > 0);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
      {active.map(({ key, label, color }) => {
        const weight = task[key] as number;
        return (
          <span key={key} className={clsx("flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider", color)}>
            {label}
            <span className="ml-0.5 opacity-60">
              {"●".repeat(weight)}{"○".repeat(5 - weight)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function TaskStack({ tasks, onToggleStatus }: TaskStackProps) {
  return (
    <div className="w-full space-y-2">
      <AnimatePresence initial={false}>
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -20 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={clsx(
              "group relative flex items-center bg-white border rounded-xl p-4 transition-all",
              "hover:shadow-md hover:border-slate-300",
              task.status === "completed" ? "bg-slate-50 border-slate-100 opacity-60" : "border-slate-200"
            )}
          >
            {/* Completion Radio-ish Button */}
            <button
              onClick={() => onToggleStatus(task.id)}
              className={clsx(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                task.status === "completed"
                  ? "bg-green-500 border-green-500"
                  : "border-slate-200 group-hover:border-slate-400"
              )}
            >
              {task.status === "completed" && <Check className="w-4 h-4 text-white" />}
            </button>

            {/* Task Content */}
            <div className="flex-1 ml-4 overflow-hidden">
              <span className={clsx(
                "block text-[15px] font-semibold tracking-tight transition-all truncate",
                task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"
              )}>
                {task.content}
              </span>

              <div className="flex items-center space-x-3 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span className={clsx(
                    "flex items-center",
                    task.priority === "high" && "text-amber-500"
                )}>
                    {task.priority === "high" && <AlertCircle className="w-3 h-3 mr-1" />}
                    {task.priority} Prio
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span>{task.difficulty} Effort</span>
              </div>

              <StatBadges task={task} />
            </div>

            {/* Actions / Detail Arrow */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {tasks.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
          <Clock className="w-8 h-8 mb-3 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest opacity-40">No commands in stack</p>
        </div>
      )}
    </div>
  );
}
