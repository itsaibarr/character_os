"use client";

import { useState, useRef, useTransition } from "react";
import { Zap, ChevronDown, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { parseTasksFromText, type ExtractedTask } from "@/app/actions/nlp";
import ParsedTaskPreview from "./ParsedTaskPreview";

interface ParseTextButtonProps {
  onTasksAdded?: () => void;
}

export default function ParseTextButton({ onTasksAdded }: ParseTextButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ExtractedTask[] | null>(null);
  const [isParsing, startParsing] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    } else {
      setText("");
      setParsedTasks(null);
    }
  };

  const handleParse = () => {
    if (!text.trim()) return;

    startParsing(async () => {
      const result = await parseTasksFromText(text);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to parse tasks");
        return;
      }
      setParsedTasks(result.data);
    });
  };

  const handleConfirmed = () => {
    setOpen(false);
    setText("");
    setParsedTasks(null);
    onTasksAdded?.();
  };

  const handleCancel = () => {
    setParsedTasks(null);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold border transition-all",
          open
            ? "bg-orange-50 border-orange-500 text-orange-600"
            : "bg-white border-border text-muted hover:border-orange-400 hover:text-orange-500",
        )}
      >
        <Zap
          className={clsx(
            "w-3.5 h-3.5",
            open ? "text-orange-500" : "text-slate-400",
          )}
        />
        Parse Text
        {open ? (
          <X className="w-3 h-3 ml-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-0.5" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="parse-panel"
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[480px] z-20 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ transformOrigin: "top right" }}
          >
            {parsedTasks ? (
              <ParsedTaskPreview
                tasks={parsedTasks}
                onConfirmed={handleConfirmed}
                onCancel={handleCancel}
              />
            ) : (
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-faint mb-2">
                  Paste any text with tasks
                </p>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleParse();
                    }
                  }}
                  placeholder={'e.g. "Tomorrow finish physics homework, buy groceries, update portfolio."'}
                  rows={4}
                  className="w-full resize-none text-[13px] text-text placeholder:text-slate-400 border border-border rounded-sm px-3 py-2.5 focus:outline-none focus:border-orange-400 bg-slate-50 transition-colors"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-faint">⌘↵ to parse</span>
                  <button
                    onClick={handleParse}
                    disabled={!text.trim() || isParsing}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all",
                      text.trim() && !isParsing
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    )}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      "Parse →"
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
