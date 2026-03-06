"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, ArrowRight, X, Loader2, Mic, MicOff } from "lucide-react";
import { clsx } from "clsx";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface DashboardCommandProps {
  onSubmit?: (content: string) => void;
  isProcessing?: boolean;
}

export default function DashboardCommand({ onSubmit, isProcessing = false }: DashboardCommandProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { transcript, isListening, isSupported, start, stop, reset } =
    useSpeechRecognition();

  // Sync speech transcript into input value
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    // Stop recording if active
    if (isListening) stop();

    onSubmit?.(inputValue);
    setInputValue("");
    reset();
  };

  const handleClear = () => {
    setInputValue("");
    if (isListening) stop();
    reset();
  };

  const toggleMic = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        "flex items-center gap-3 border-b py-3 transition-colors duration-200",
        isFocused || isListening ? "border-accent" : "border-border"
      )}
    >
      <Terminal
        className={clsx(
          "w-4 h-4 shrink-0 transition-colors duration-200",
          isFocused || isListening ? "text-accent" : "text-faint"
        )}
      />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isListening ? "Listening…" : "Add a command…"}
        className="flex-1 text-sm font-medium text-text placeholder:text-faint outline-none bg-transparent"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <AnimatePresence>
          {inputValue && !isProcessing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={handleClear}
              className="p-1 text-faint hover:text-muted rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mic button — hidden on unsupported browsers */}
        {isSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={isProcessing}
            className={clsx(
              "p-1.5 rounded-lg transition-all",
              isListening
                ? "text-accent animate-pulse"
                : "text-faint hover:text-muted",
              isProcessing && "opacity-40 cursor-not-allowed"
            )}
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>
        )}

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
