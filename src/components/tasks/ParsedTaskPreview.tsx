"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { createTask } from "@/app/actions/tasks";
import type { ExtractedTask } from "@/app/actions/nlp";

interface ParsedTaskPreviewProps {
  tasks: ExtractedTask[];
  onConfirmed: () => void;
  onCancel: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-slate-500 bg-slate-100 border-slate-200",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  high: "text-orange-500 bg-orange-50 border-orange-200",
  medium: "text-sky-600 bg-sky-50 border-sky-200",
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export default function ParsedTaskPreview({
  tasks,
  onConfirmed,
  onCancel,
}: ParsedTaskPreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(tasks.map((_, i) => i)),
  );
  const [isPending, startTransition] = useTransition();

  const toggle = (idx: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const selectedCount = selected.size;

  const handleAdd = () => {
    if (selectedCount === 0) return;

    startTransition(async () => {
      const toAdd = tasks.filter((_, i) => selected.has(i));

      await Promise.all(
        toAdd.map((t) =>
          createTask(t.content, {
            description: t.description,
            due_date: t.due_date,
            priority: t.priority,
            difficulty: t.difficulty,
          }),
        ),
      );

      toast.success(
        `${selectedCount} task${selectedCount !== 1 ? "s" : ""} added`,
        { icon: "⚡" },
      );
      onConfirmed();
    });
  };

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden bg-white">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-slate-50">
        <span className="text-[10px] font-black uppercase tracking-widest text-faint">
          Parsed Tasks ({tasks.length} detected)
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
        {tasks.map((task, idx) => {
          const isSelected = selected.has(idx);
          return (
            <li
              key={idx}
              onClick={() => toggle(idx)}
              className={clsx(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                isSelected ? "bg-white hover:bg-slate-50/60" : "bg-slate-50/40 opacity-60",
              )}
            >
              <div className="mt-0.5 shrink-0 text-orange-500">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text leading-snug">
                  {task.content}
                </p>
                {task.description && (
                  <p className="text-[11px] text-faint mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                  <p className="text-[10px] text-muted mt-0.5">
                    {task.subtasks.length} subtask{task.subtasks.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {task.due_date && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">
                    {new Date(task.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                <span
                  className={clsx(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                    PRIORITY_COLORS[task.priority ?? "medium"],
                  )}
                >
                  {task.priority ?? "medium"}
                </span>
                <span
                  className={clsx(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                    DIFFICULTY_COLORS[task.difficulty ?? "medium"],
                  )}
                >
                  {task.difficulty ?? "medium"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-border bg-slate-50">
        <span className="text-[11px] text-muted">
          {selectedCount} of {tasks.length} selected
        </span>
        <button
          onClick={handleAdd}
          disabled={selectedCount === 0 || isPending}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all",
            selectedCount > 0 && !isPending
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
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
