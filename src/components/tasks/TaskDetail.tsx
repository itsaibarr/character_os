"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "motion/react";
import { Check, Trash2, Plus, Loader2, Calendar, X } from "lucide-react";
import { clsx } from "clsx";
import { updateTask, deleteTask, createSubtask } from "@/app/actions/tasks";

interface Task {
  id: string;
  content: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  difficulty: "low" | "medium" | "high";
  due_date: string | null;
  parent_task_id: string | null;
  xp_reward: number | null;
  str_weight?: number | null;
  int_weight?: number | null;
  dis_weight?: number | null;
  cha_weight?: number | null;
  cre_weight?: number | null;
  spi_weight?: number | null;
}

interface TaskDetailProps {
  task: Task | null;
  subtasks: Task[];
  onClose: () => void;
  onDeleted: () => void;
  onToggleStatus: (id: string) => void;
}

const STAT_LABELS: { key: keyof Task; label: string; color: string; bgColor: string }[] = [
  { key: "str_weight", label: "STR", color: "text-red-500",     bgColor: "bg-red-50" },
  { key: "int_weight", label: "INT", color: "text-blue-500",    bgColor: "bg-blue-50" },
  { key: "dis_weight", label: "DIS", color: "text-amber-500",   bgColor: "bg-amber-50" },
  { key: "cha_weight", label: "CHA", color: "text-purple-500",  bgColor: "bg-purple-50" },
  { key: "cre_weight", label: "CRE", color: "text-emerald-500", bgColor: "bg-emerald-50" },
  { key: "spi_weight", label: "SPI", color: "text-indigo-500",  bgColor: "bg-indigo-50" },
];

function computeXpPreview(task: Task) {
  if (task.xp_reward != null) return `+${task.xp_reward} XP (Manual Override)`;
  const mult = task.difficulty === "high" ? 3 : task.difficulty === "medium" ? 2 : 1;
  const breakdown = STAT_LABELS
    .map(s => ({ label: s.label, xp: ((task[s.key] as number) ?? 0) * mult }))
    .filter(x => x.xp > 0)
    .map(x => `+${x.xp} ${x.label}`)
    .join("  ");
  return breakdown || "No rewards yet";
}

export default function TaskDetail({ task, subtasks, onClose, onDeleted, onToggleStatus }: TaskDetailProps) {
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [difficulty, setDifficulty] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [xpReward, setXpReward] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [newSubtaskContent, setNewSubtaskContent] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.content);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDifficulty(task.difficulty);
    setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
    setXpReward(task.xp_reward != null ? String(task.xp_reward) : "");
    setEditingTitle(false);
    setShowDeleteConfirm(false);
    setAddingSubtask(false);
    setNewSubtaskContent("");
  }, [task?.id]);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 px-8">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
          <Check className="w-7 h-7 opacity-20" />
        </div>
        <p className="text-sm font-bold text-slate-400 text-center">Select an objective</p>
        <p className="text-xs text-slate-300 text-center mt-1">Review operational details here</p>
      </div>
    );
  }

  const saveTitle = () => {
    if (title.trim() === task.content) { setEditingTitle(false); return; }
    if (!title.trim()) { setTitle(task.content); setEditingTitle(false); return; }
    setSavingField("title");
    startTransition(async () => { await updateTask(task.id, { content: title.trim() }); setSavingField(null); setEditingTitle(false); });
  };

  const saveDescription = () => {
    const trimmed = description.trim();
    if (trimmed === (task.description ?? "")) return;
    setSavingField("description");
    startTransition(async () => { await updateTask(task.id, { description: trimmed || null }); setSavingField(null); });
  };

  const SELECT_BASE = "w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all appearance-none";
  const activeStatBadges = STAT_LABELS.filter(s => ((task[s.key] as number) ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />
      <motion.div
        key={task.id}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-[560px] max-w-full bg-canvas border-l border-border shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <span className="text-[10px] font-black text-faint uppercase tracking-widest">Task Detail</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-faint hover:text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Title Section */}
          <div className="flex items-start gap-5">
            <button
              onClick={() => onToggleStatus(task.id)}
              className={clsx(
                "mt-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                task.status === "completed" ? "bg-accent border-accent" : "border-slate-300 hover:border-slate-400"
              )}
            >
              {task.status === "completed" && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(task.content); setEditingTitle(false); } }}
                  className="w-full text-2xl font-black tracking-tight text-text bg-transparent border-b-2 border-accent outline-none pb-1"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className={clsx(
                    "text-2xl font-black tracking-tight cursor-text hover:text-accent transition-colors leading-tight",
                    task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"
                  )}
                >
                  {task.content}
                  {savingField === "title" && <Loader2 className="inline w-4 h-4 ml-3 animate-spin text-slate-400" />}
                </h2>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mission Parameters</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={saveDescription}
                  placeholder="Detailed instructions..."
                  rows={4}
                  className="w-full bg-slate-50 border border-border rounded-lg px-4 py-3 text-sm font-medium text-text placeholder:text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:bg-white transition-all resize-none"
                />
                {savingField === "description" && <span className="text-[9px] font-bold text-accent flex items-center gap-1.5 px-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
              </div>

              {/* Priority + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Priority</label>
                  <select value={priority} onChange={e => { const v = e.target.value as any; setPriority(v); startTransition(async () => updateTask(task.id, { priority: v })); }} className={SELECT_BASE}>
                    <option value="low">Low Impact</option><option value="medium">Standard</option><option value="high">Critical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Complexity</label>
                  <select value={difficulty} onChange={e => { const v = e.target.value as any; setDifficulty(v); startTransition(async () => updateTask(task.id, { difficulty: v })); }} className={SELECT_BASE}>
                    <option value="low">Simple</option><option value="medium">Moderate</option><option value="high">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Objective Horizon</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date" value={dueDate}
                    onChange={e => { setDueDate(e.target.value); startTransition(async () => updateTask(task.id, { due_date: e.target.value || null })); }}
                    className="w-full bg-slate-50 border border-border rounded-lg pl-11 pr-4 py-3 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Subtasks */}
              {task.parent_task_id === null && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Neural Decomposition ({subtasks.length})</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                        <button
                          onClick={() => onToggleStatus(sub.id)}
                          className={clsx(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", 
                            sub.status === "completed" ? "bg-green-500 border-green-500" : "border-slate-200 group-hover:border-slate-400"
                          )}
                        >
                          {sub.status === "completed" && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className={clsx("text-xs font-bold flex-1 truncate uppercase tracking-tight", sub.status === "completed" ? "text-slate-400 line-through" : "text-slate-700")}>{sub.content}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={newSubtaskContent}
                      onChange={e => setNewSubtaskContent(e.target.value)}
                      onKeyDown={async e => { if (e.key === "Enter" && newSubtaskContent.trim()) { setAddingSubtask(true); await createSubtask(task.id, newSubtaskContent.trim()); setNewSubtaskContent(""); setAddingSubtask(false); } }}
                      placeholder="Add sub-component..."
                      className="flex-1 bg-slate-50 border border-border rounded-lg px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-text placeholder:text-faint focus:outline-none focus:border-accent focus:bg-white transition-all"
                    />
                    <button
                      onClick={async () => { if (!newSubtaskContent.trim()) return; setAddingSubtask(true); await createSubtask(task.id, newSubtaskContent.trim()); setNewSubtaskContent(""); setAddingSubtask(false); }}
                      disabled={!newSubtaskContent.trim() || addingSubtask}
                      className="p-2 bg-accent text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {addingSubtask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* XP Projection */}
              <div className="space-y-3 p-5 bg-slate-900 rounded-2xl text-white">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">XP Matrix Projection</label>
                <div className="text-lg font-black tracking-tight">{computeXpPreview(task)}</div>
                {activeStatBadges.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {activeStatBadges.map(({ key, label, color }) => {
                      const weight = task[key] as number;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className={clsx("text-[9px] font-black uppercase tracking-widest", color)}>{label} Activation</span>
                          <span className={clsx("text-[10px] font-black tracking-tight", color)}>
                            {"●".repeat(weight)}{"○".repeat(5 - weight)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" /> Purge Objective
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Awaiting termination confirmation?</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-all">Abort</button>
                <button onClick={async () => { await deleteTask(task.id); onDeleted(); }} className="px-4 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-all shadow-md shadow-red-200">Confirm Purge</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
