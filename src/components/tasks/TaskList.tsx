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
    <div className="flex flex-col h-full space-y-1">
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
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
                    "group flex items-start gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all border",
                    isSelected 
                      ? "bg-blue-50/30 border-blue-100 shadow-sm" 
                      : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <button
                    onClick={e => { e.stopPropagation(); onToggleStatus(task.id); }}
                    className={clsx(
                      "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                      task.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400"
                    )}
                  >
                    {task.status === "completed" && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={clsx(
                      "block text-sm font-semibold tracking-tight text-slate-900 truncate",
                      task.status === "completed" && "line-through text-slate-400 font-medium"
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
                    "w-4 h-4 shrink-0 mt-0.5 transition-colors",
                    isSelected ? "text-primary" : "text-slate-200 group-hover:text-slate-400"
                  )} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {tasks.length === 0 && !isCreating && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
              <Check className="w-6 h-6 opacity-20" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
              Clear Objectives
            </p>
          </div>
        )}
      </div>

      {/* Inline Command Creator */}
      <div className="mt-4">
        {isCreating ? (
          <div className="bg-white border-2 border-primary/20 rounded-xl p-1 shadow-lg shadow-primary/5 transition-all">
            <input
              autoFocus
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setIsCreating(false); }}
              placeholder="New objective..."
              className="w-full px-3 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-300 outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex gap-2">
                <span>Enter to confirm</span>
                <span>Esc to cancel</span>
              </div>
              <button 
                onClick={handleCreate}
                disabled={!newContent.trim() || isPending}
                className="bg-primary text-white p-1 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50 transition-all group"
          >
            <div className="w-5 h-5 rounded-md border-2 border-slate-100 flex items-center justify-center group-hover:border-slate-200">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-bold uppercase tracking-widest text-slate-300 group-hover:text-slate-400">
              Register New Objective
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
