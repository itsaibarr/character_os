"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, Plus, Loader2, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { createTask } from "@/app/actions/tasks";
import type { ExtractedTask } from "@/lib/gamification/types";

interface EditableTaskPreviewProps {
  tasks: ExtractedTask[];
  onConfirmed: () => void;
  onCancel: () => void;
}

const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
const DIFFICULTY_OPTIONS = ["low", "medium", "high"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500 bg-slate-100 border-slate-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  high: "text-red-500 bg-red-50 border-red-200",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-sky-600 bg-sky-50 border-sky-200",
  high: "text-accent bg-accent-muted border-accent/30",
};

type EditableTask = ExtractedTask & { selected: boolean };

export default function EditableTaskPreview({
  tasks,
  onConfirmed,
  onCancel,
}: EditableTaskPreviewProps) {
  const [editableTasks, setEditableTasks] = useState<EditableTask[]>(() =>
    tasks.map((t) => ({ ...t, selected: true }))
  );
  const [isPending, startTransition] = useTransition();

  const updateTask = (idx: number, patch: Partial<EditableTask>) => {
    setEditableTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    );
  };

  const removeTask = (idx: number) => {
    setEditableTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleSelect = (idx: number) => {
    updateTask(idx, { selected: !editableTasks[idx].selected });
  };

  const selectedCount = editableTasks.filter((t) => t.selected).length;

  const handleAdd = () => {
    if (selectedCount === 0) return;

    startTransition(async () => {
      try {
        const toAdd = editableTasks.filter((t) => t.selected);

        await Promise.all(
          toAdd.map((t) =>
            createTask(t.content, {
              description: t.description,
              due_date: t.due_date,
              priority: t.priority,
              difficulty: t.difficulty,
            })
          )
        );

        toast.success(
          `${selectedCount} task${selectedCount !== 1 ? "s" : ""} added`,
          { icon: "⚡" }
        );
        onConfirmed();
      } catch {
        toast.error("Failed to add tasks. Please try again.");
      }
    });
  };

  if (editableTasks.length === 0) {
    onCancel();
    return null;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-slate-50">
        <span className="text-[10px] font-black uppercase tracking-widest text-faint">
          Review Tasks ({editableTasks.length})
        </span>
        <button
          onClick={onCancel}
          className="text-[11px] text-muted hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Task rows */}
      <ul className="divide-y divide-border">
        {editableTasks.map((task, idx) => (
          <li
            key={idx}
            className={clsx(
              "px-4 py-3 transition-colors",
              task.selected ? "bg-white" : "bg-slate-50/40 opacity-60"
            )}
          >
            {/* Row 1: checkbox + content input + remove */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleSelect(idx)}
                className="shrink-0 text-accent"
              >
                {task.selected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <input
                type="text"
                value={task.content}
                onChange={(e) => updateTask(idx, { content: e.target.value })}
                className="flex-1 text-[13px] font-semibold text-text bg-transparent outline-none border-b border-transparent focus:border-border transition-colors"
                placeholder="Task title"
              />
              <button
                type="button"
                onClick={() => removeTask(idx)}
                className="shrink-0 p-1 text-slate-300 hover:text-red-400 transition-colors"
                title="Remove task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Row 2: description */}
            <div className="pl-7 mt-1.5">
              <input
                type="text"
                value={task.description ?? ""}
                onChange={(e) =>
                  updateTask(idx, {
                    description: e.target.value || undefined,
                  })
                }
                className="w-full text-[11px] text-muted bg-transparent outline-none border-b border-transparent focus:border-border transition-colors"
                placeholder="Description (optional)"
              />
            </div>

            {/* Row 3: meta controls */}
            <div className="flex items-center gap-2 pl-7 mt-2 flex-wrap">
              {/* Priority toggle */}
              <div className="flex items-center rounded overflow-hidden border border-border">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateTask(idx, { priority: p })}
                    className={clsx(
                      "px-2 py-0.5 text-[10px] font-semibold transition-colors capitalize",
                      task.priority === p
                        ? PRIORITY_COLORS[p]
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Difficulty toggle */}
              <div className="flex items-center rounded overflow-hidden border border-border">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateTask(idx, { difficulty: d })}
                    className={clsx(
                      "px-2 py-0.5 text-[10px] font-semibold transition-colors capitalize",
                      task.difficulty === d
                        ? DIFFICULTY_COLORS[d]
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Due date */}
              <input
                type="date"
                value={task.due_date?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  updateTask(idx, {
                    due_date: e.target.value || undefined,
                  })
                }
                className="text-[10px] font-medium text-muted bg-transparent border border-border rounded px-1.5 py-0.5 outline-none focus:border-accent transition-colors"
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-border bg-slate-50">
        <span className="text-[11px] text-muted">
          {selectedCount} of {editableTasks.length} selected
        </span>
        <button
          onClick={handleAdd}
          disabled={selectedCount === 0 || isPending}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all",
            selectedCount > 0 && !isPending
              ? "bg-accent text-white hover:opacity-90"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          Add selected ({selectedCount})
        </button>
      </div>
    </div>
  );
}
