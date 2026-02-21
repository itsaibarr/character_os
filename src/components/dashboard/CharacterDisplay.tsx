"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { CharacterType, CharacterStage, StatValues, getNextEvolutionLevel } from "@/lib/character";

interface CharacterDisplayProps {
  characterType: CharacterType;
  characterStage: CharacterStage;
  level: number;
  xpProgress: number;
  stats: StatValues;
}

const TYPE_LABELS: Record<CharacterType, string> = {
  warrior: 'Warrior', scholar: 'Scholar', monk: 'Monk',
  envoy: 'Envoy', artisan: 'Artisan', mystic: 'Mystic',
  soldier: 'Soldier', inventor: 'Inventor', visionary: 'Visionary',
  egg: 'Unknown',
};

const STAGE_LABELS: Record<CharacterStage, string> = {
  egg: 'Egg', child: 'Child', adult: 'Adult', master: 'Master',
};

function getImageSrc(characterType: CharacterType, characterStage: CharacterStage): string {
  if (characterType === 'egg' || characterStage === 'egg') return '/characters/egg.png';
  return `/characters/${characterType}/${characterStage}.png`;
}

export default function CharacterDisplay({
  characterType, characterStage, level, xpProgress,
}: CharacterDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = getImageSrc(characterType, characterStage);
  const nextEvolution = getNextEvolutionLevel(level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-5 pb-6 border-b border-border"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {!imgError ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
            <Image
              src={imageSrc}
              alt={`${TYPE_LABELS[characterType]} ${STAGE_LABELS[characterStage]}`}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-border flex items-center justify-center">
            <span className="text-[9px] font-black text-faint uppercase tracking-wider text-center leading-tight px-1">
              {characterType === 'egg' ? '?' : TYPE_LABELS[characterType].slice(0, 3)}
            </span>
          </div>
        )}
      </div>

      {/* Name + level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-black text-faint uppercase tracking-widest">
            {characterType === 'egg' ? 'Unhatched' : TYPE_LABELS[characterType]}
          </span>
          <span className="text-[10px] text-faint">·</span>
          <span className="text-[10px] text-faint uppercase tracking-wider">
            {STAGE_LABELS[characterStage]}
          </span>
        </div>
        <div className="text-3xl font-black text-text leading-none mt-0.5">
          Level {level}
        </div>
      </div>

      {/* XP bar */}
      <div className="shrink-0 w-44">
        <div className="flex justify-between text-[10px] font-bold text-faint uppercase tracking-wider mb-1.5">
          <span>XP Progress</span>
          <span>{xpProgress}%</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="h-full bg-accent rounded-full"
          />
        </div>
        <p className="text-[9px] text-faint mt-1.5">
          {nextEvolution !== null ? `Evolves at Lv. ${nextEvolution}` : 'Max Evolution'}
        </p>
      </div>
    </motion.div>
  );
}
