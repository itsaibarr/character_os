"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { getCharacterStage } from "@/lib/character";

export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  oldArchetype: string;
  newArchetype: string;
  isEvolution: boolean;
}

interface LevelUpModalProps {
  data: LevelUpData | null;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  warrior: 'Warrior', scholar: 'Scholar', monk: 'Monk',
  envoy: 'Envoy', artisan: 'Artisan', mystic: 'Mystic',
  soldier: 'Soldier', inventor: 'Inventor', visionary: 'Visionary',
  egg: 'Egg',
};

function getImageSrc(archetype: string, stage: string): string {
  if (archetype === 'egg' || stage === 'egg') return '/characters/egg.png';
  return `/characters/${archetype}/${stage}.png`;
}

export default function LevelUpModal({ data, onClose }: LevelUpModalProps) {
  const [imgError, setImgError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  const stage = getCharacterStage(data.newLevel);
  const imageSrc = getImageSrc(data.newArchetype, stage);
  const typeLabel = TYPE_LABELS[data.newArchetype] || data.newArchetype;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
          className="relative w-full max-w-sm bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-accent/10 to-transparent pointer-events-none" />

          <div className="p-8 pb-10 text-center flex flex-col items-center">
            {/* Title / Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center px-3 py-1 mb-8 rounded-full bg-accent-muted text-accent text-[10px] font-bold uppercase tracking-widest"
            >
              {data.isEvolution ? "Character Evolved" : "Level Up"}
            </motion.div>

            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
              className="relative mb-8"
            >
              {!imgError ? (
                <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden shadow-xl bg-slate-100 ring-4 ring-background">
                  <Image
                    src={imageSrc}
                    alt={typeLabel}
                    fill
                    className="object-cover"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto rounded-2xl bg-slate-100 border border-border flex items-center justify-center ring-4 ring-background">
                  <span className="text-xl font-black text-faint uppercase tracking-wider">
                    {typeLabel.slice(0, 3)}
                  </span>
                </div>
              )}

              {/* Decorative particles around the image (simplified CSS) */}
              <div className="absolute inset-0 -z-10 animate-pulse bg-accent/20 blur-2xl rounded-full scale-150" />
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2 mb-10"
            >
              <h2 className="text-4xl font-black text-text">Level {data.newLevel}</h2>
              <p className="text-sm font-medium text-muted">
                {data.isEvolution ? (
                  <>
                    You are now a <span className="text-accent">{typeLabel}</span>
                  </>
                ) : (
                  <>You grew stronger as a {typeLabel}</>
                )}
              </p>
            </motion.div>

            {/* Action */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
              className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-95"
            >
              Continue Journey
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
