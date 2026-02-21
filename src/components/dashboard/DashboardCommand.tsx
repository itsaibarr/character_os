"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, ArrowRight, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface DashboardCommandProps {
  onTaskCreated?: (content: string) => void;
}

export default function DashboardCommand({ onTaskCreated }: DashboardCommandProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    onTaskCreated?.(inputValue);
    setInputValue("");
    setIsProcessing(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        "flex items-center gap-3 border-b py-3 transition-colors duration-200",
        isFocused ? "border-accent" : "border-border"
      )}
    >
      <Terminal
        className={clsx(
          "w-4 h-4 shrink-0 transition-colors duration-200",
          isFocused ? "text-accent" : "text-faint"
        )}
      />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Add a command…"
        className="flex-1 text-sm font-medium text-text placeholder:text-faint outline-none bg-transparent"
      />
      <div className="flex items-center gap-2 shrink-0">
        <AnimatePresence>
          {inputValue && !isProcessing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={() => setInputValue("")}
              className="p-1 text-faint hover:text-muted rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="submit"
          disabled={!inputValue.trim() || isProcessing}
          className={clsx(
            "p-1.5 rounded-lg transition-all",
            inputValue.trim() && !isProcessing
              ? "bg-accent text-white hover:brightness-110 active:scale-95"
              : "text-faint cursor-not-allowed"
          )}
        >
          {isProcessing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ArrowRight className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </form>
  );
}
