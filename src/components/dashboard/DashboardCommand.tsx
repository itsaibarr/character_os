"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Terminal, ArrowRight, X, Command } from "lucide-react";
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
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onTaskCreated?.(inputValue);
    setInputValue("");
    setIsProcessing(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.form
        onSubmit={handleSubmit}
        animate={isFocused ? { scale: 1.01, y: -2 } : { scale: 1, y: 0 }}
        className={clsx(
          "relative flex items-center bg-white rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden",
          isFocused
            ? "border-primary ring-4 ring-[var(--color-primary-ring)] shadow-primary/10"
            : "border-slate-200 shadow-slate-100"
        )}
      >
        <div className="pl-5 text-slate-400">
          <Terminal className={clsx("w-5 h-5 transition-colors", isFocused && "text-primary")} />
        </div>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="I need to finish the API design by 5 PM"
          className="w-full py-5 px-4 text-lg font-medium text-slate-900 placeholder:text-slate-300 outline-none"
        />

        <div className="flex items-center space-x-2 pr-2">
          <AnimatePresence>
            {inputValue && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => setInputValue("")}
                className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
          
          <button
            disabled={!inputValue.trim() || isProcessing}
            className={clsx(
              "p-3 rounded-xl transition-all flex items-center space-x-2 group shrink-0",
              inputValue.trim()
                ? "bg-primary text-white shadow-lg shadow-primary/20 active:scale-95"
                : "bg-slate-50 text-slate-300"
            )}
          >
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            ) : (
              <ArrowRight className={clsx("w-5 h-5 transition-transform", inputValue.trim() && "group-hover:translate-x-1")} />
            )}
          </button>
        </div>
      </motion.form>

      {/* Shortcuts / Hint */}
      <div className="mt-3 flex items-center justify-center space-x-4">
        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
            <Command className="w-3 h-3" />
            <span>K to AI</span>
        </div>
        <div className="h-1 w-1 rounded-full bg-slate-200" />
        <span className="text-[11px] font-semibold text-slate-400">Just type. CharacterOS handles the metadata.</span>
      </div>
    </div>
  );
}
