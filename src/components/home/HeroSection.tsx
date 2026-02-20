"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ReactNode } from "react";

export function HeroSection({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-slate-900">
          CharacterOS
        </h1>
      </motion.div>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-slate-600 text-lg md:text-xl max-w-2xl mb-10"
      >
        Turn your life into a game. Track your progress, build your character, and level up in real life.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex gap-4"
      >
        <Link 
          href="/sign-in"
          className="btn-primary"
        >
          Enter System
        </Link>
        <Link 
          href="/sign-up"
          className="btn-secondary"
        >
          Initialize
        </Link>
      </motion.div>
      {children}
    </div>
  );
}
