"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createTask, getTaskAnalysis } from "@/app/actions/tasks";
import { TaskAnalysis } from "@/lib/ai";
import { useDebounce } from "@/hooks/use-debounce";

interface Task {
  id: string;
  content: string;
  parent_task_id: string | null;
}

interface NewTaskSheetProps {
  open: boolean;
  onClose: () => void;
  topLevelTasks: Task[];
  onCreated?: (taskId: string) => void;
}

export default function NewTaskSheet({ open, onClose, topLevelTasks, onCreated }: NewTaskSheetProps) {
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [difficulty, setDifficulty] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const debouncedContent = useDebounce(content, 800);
  const debouncedDescription = useDebounce(description, 800);

  useEffect(() => {
    async function analyze() {
      if (!debouncedContent.trim()) {
        setAnalysis(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await getTaskAnalysis({
          content: debouncedContent,
          description: debouncedDescription,
          priority,
          difficulty
        });
        setAnalysis(result);
      } catch (err) {
        console.error("Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
    analyze();
  }, [debouncedContent, debouncedDescription, priority, difficulty]);

  useEffect(() => {
    if (open) {
      setContent(""); setDescription(""); setPriority("medium"); setDifficulty("medium");
      setDueDate(""); setParentTaskId(""); setError(null);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const newId = await createTask(content.trim(), {
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        parent_task_id: parentTaskId || undefined,
        priority,
        difficulty,
      });
      onCreated?.(newId ?? "");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SELECT_BASE = "w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all appearance-none";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-bold text-faint uppercase tracking-widest mb-0.5">New Task</div>
                <h2 className="text-base font-black tracking-tight text-text">Create Task</h2>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-text placeholder:text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional context, notes, or steps..."
                  rows={3}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-text placeholder:text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as "low"|"medium"|"high")} className={SELECT_BASE}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as "low"|"medium"|"high")} className={SELECT_BASE}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-[var(--color-accent-ring)] transition-all"
                />
              </div>

              {topLevelTasks.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Parent Task <span className="normal-case font-medium text-slate-400">(makes this a subtask)</span>
                  </label>
                  <select value={parentTaskId} onChange={e => setParentTaskId(e.target.value)} className={SELECT_BASE}>
                    <option value="">None (top-level task)</option>
                    {topLevelTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.content.length > 50 ? t.content.slice(0, 50) + "…" : t.content}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* XP Preview */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-faint uppercase tracking-widest">XP Preview</h3>
                  {isAnalyzing && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                </div>

                {analysis ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(analysis.statWeights).map(([stat, weight]) => {
                        if (weight === 0) return null;
                        return (
                          <div key={stat} className="flex items-center gap-1 bg-slate-50 border border-border px-2 py-1 rounded-md">
                            <span className="text-[10px] font-extrabold text-faint uppercase">{stat}</span>
                            <span className="text-xs font-bold text-accent">+{weight}</span>
                          </div>
                        );
                      })}
                      {Object.values(analysis.statWeights).every(w => w === 0) && (
                        <span className="text-xs text-slate-400 italic">No specific stats identified yet.</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated XP</span>
                        <div className="flex items-center gap-1.5">
                           <span className="text-lg font-black text-slate-900">{analysis.estimatedXP}</span>
                           <span className="text-[10px] font-bold text-accent bg-accent-muted px-1.5 py-0.5 rounded">XP</span>
                        </div>
                      </div>
                      
                      {analysis.insights.length > 0 && (
                        <div className="text-[10px] text-slate-400 italic text-right max-w-[150px]">
                          &quot;{analysis.insights[0]}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-medium italic">
                    Start typing to see AI analysis and stat gains...
                  </p>
                )}
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all",
                  content.trim() && !isSubmitting
                    ? "bg-accent text-white hover:brightness-110 active:scale-95"
                    : "bg-slate-100 text-muted cursor-not-allowed"
                )}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isSubmitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
