"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { MessageSquare, X, ArrowUpRight, Zap } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "npc" | "user";
  text: string;
  timestamp: string;
  isQuestAssigned?: boolean;
}

interface NPCChatWidgetProps {
  npcName: string;
  moodScore: number;
  messages: ChatMessage[];
  onSendMessage?: (text: string) => void;
}

export default function NPCChatWidget({ npcName, moodScore, messages, onSendMessage }: NPCChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage?.(input);
    setInput("");
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          "fixed bottom-6 right-6 p-3 bg-slate-900 text-white rounded-full shadow-lg transition-transform hover:scale-105 z-40",
          isOpen && "pointer-events-none opacity-0"
        )}
      >
        <MessageSquare size={20} />
      </button>

      {/* Extreme Density Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 w-[340px] h-[480px] bg-white border border-slate-900 rounded-sm shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-text">
                  {npcName}
                </span>
                <span className="text-[10px] text-faint ml-2 border px-1 rounded-[2px]">
                  Mood: {moodScore}%
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-faint hover:text-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    "flex flex-col max-w-[85%]",
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  )}
                >
                  <div className={clsx(
                    "text-[11px] leading-relaxed p-2.5 rounded-sm border",
                    msg.sender === "user" 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-text border-slate-200"
                  )}>
                    {msg.text}
                  </div>
                  
                  {/* Micro Quest Attachment styling */}
                  {msg.isQuestAssigned && (
                    <div className="mt-1.5 border border-orange-200 bg-orange-50 p-2 rounded-sm flex items-start gap-2 max-w-[200px]">
                      <Zap size={10} className="text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="block text-[9px] font-black uppercase text-orange-700 tracking-wider leading-tight w-full">
                          Micro Quest Assigned
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <span className="text-[9px] font-medium text-faint mt-1 uppercase tracking-widest">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-white flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your progress..."
                className="flex-1 text-xs py-1.5 px-2 outline-none placeholder:text-slate-300 font-medium text-text bg-transparent"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="p-1.5 bg-slate-100 border border-slate-200 text-text rounded-[2px] hover:bg-slate-200 disabled:opacity-50 transition-colors"
                aria-label="Send message"
              >
                <ArrowUpRight size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
