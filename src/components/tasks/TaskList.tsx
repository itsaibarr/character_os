"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Plus, Clock, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createTask } from "@/app/actions/tasks";

interface Task {
  id: string;
  content: string;
  status: string;
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  due_date: string | null;
  parent_task_id: string | null;
  str_weight?: number | null;
  int_weight?: number | null;
  dis_weight?: number | null;
  cha_weight?: number | null;
  cre_weight?: number | null;
  spi_weight?: number | null;
}

interface TaskListProps {
  tasks: Task[];
  filter: string;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
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
  const active = STAT_LABELS.filter(s => ((task[s.key] as number) ?? 0) > 0);
  if (active.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {active.map(({ key, label, color }) => {
        const weight = task[key] as number;
        return (
          <span key={key} className={clsx("flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider", color)}>
            {label} <span className="ml-0.5 opacity-60">{"●".repeat(weight)}{"○".repeat(5 - weight)}</span>
          </span>
        );
      })}
    </div>
  );
}

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default function TaskList({ tasks, filter, selectedTaskId, onSelectTask, onToggleStatus }: TaskListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async () => {
    if (!newContent.trim() || isPending) return;
    setIsPending(true);
    try {
      const taskId = await createTask(newContent.trim());
      if (taskId) onSelectTask(taskId);
      setNewContent("");
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {tasks.map((task, index) => {
            const due = formatDueDate(task.due_date);
            const overdue = task.due_date ? new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
            const isSelected = selectedTaskId === task.id;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <div
                  onClick={() => onSelectTask(task.id)}
                  className={clsx(
                    "group flex items-center gap-3 py-3 border-b border-border-faint cursor-pointer transition-colors hover:bg-slate-50/70",
                    isSelected && "bg-accent-muted/30"
                  )}
                >
                  <button
                    onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
                    className={clsx(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      task.status === "completed" ? "bg-accent border-accent" : "border-slate-300 group-hover:border-slate-400"
                    )}
                  >
                    {task.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={clsx(
                      "block text-sm font-medium text-text truncate",
                      task.status === "completed" && "line-through text-faint"
                    )}>
                      {task.content}
                    </span>
                    <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                      {task.priority === "high" && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                          <AlertCircle className="w-2.5 h-2.5" /> High Priority
                        </span>
                      )}
                      {due && (
                        <span className={clsx(
                          "flex items-center gap-1 text-[9px] font-black uppercase tracking-widest",
                          overdue ? "text-red-500" : "text-slate-400"
                        )}>
                          <Clock className="w-2.5 h-2.5" /> {due}
                        </span>
                      )}
                    </div>
                    <StatBadges task={task} />
                  </div>
                  <ChevronRight className={clsx(
                    "w-4 h-4 shrink-0 transition-colors",
                    isSelected ? "text-accent" : "text-slate-200 group-hover:text-slate-400"
                  )} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {tasks.length === 0 && !isCreating && (
          <p className="text-sm text-faint py-8 text-center">Nothing here.</p>
        )}
      </div>

      {/* Inline Command Creator */}
      <div className="mt-2">
        {isCreating ? (
          <div className="border-b border-accent py-2 flex items-center gap-2">
            <input
              autoFocus
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setIsCreating(false); }}
              placeholder="New task…"
              className="flex-1 text-sm font-medium text-text placeholder:text-faint outline-none bg-transparent"
            />
            <button
              onClick={handleCreate}
              disabled={!newContent.trim() || isPending}
              className="p-1 bg-accent text-white rounded-md hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 py-2.5 text-sm text-faint hover:text-muted transition-colors group"
          >
            <Plus className="w-4 h-4" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}
