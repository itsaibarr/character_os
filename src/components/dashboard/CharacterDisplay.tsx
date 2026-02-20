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

const STAT_META: { key: keyof StatValues; label: string; color: string; dotColor: string }[] = [
  { key: 'strength',     label: 'STR', color: 'text-red-500',     dotColor: 'bg-red-500'     },
  { key: 'intellect',    label: 'INT', color: 'text-blue-500',    dotColor: 'bg-blue-500'    },
  { key: 'discipline',   label: 'DIS', color: 'text-amber-500',   dotColor: 'bg-amber-500'   },
  { key: 'charisma',     label: 'CHA', color: 'text-purple-500',  dotColor: 'bg-purple-500'  },
  { key: 'creativity',   label: 'CRE', color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
  { key: 'spirituality', label: 'SPI', color: 'text-indigo-500',  dotColor: 'bg-indigo-500'  },
];

function getTop2Stats(stats: StatValues) {
  return STAT_META
    .map(meta => ({ meta, xp: stats[meta.key] }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 2)
    .map(r => r.meta);
}

function getImageSrc(characterType: CharacterType, characterStage: CharacterStage): string {
  if (characterType === 'egg' || characterStage === 'egg') return '/characters/egg.png';
  return `/characters/${characterType}/${characterStage}.png`;
}

export default function CharacterDisplay({
  characterType, characterStage, level, xpProgress, stats,
}: CharacterDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = getImageSrc(characterType, characterStage);
  const nextEvolution = getNextEvolutionLevel(level);
  const top2 = getTop2Stats(stats);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Character Image */}
        <div className="shrink-0">
          {!imgError ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
              <Image
                src={imageSrc}
                alt={`${TYPE_LABELS[characterType]} ${STAGE_LABELS[characterStage]}`}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center leading-tight px-1">
                {characterType === 'egg' ? '?' : TYPE_LABELS[characterType]}
              </span>
            </div>
          )}
        </div>

        {/* Character Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-slate-900 leading-none">{level}</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {characterType === 'egg' ? 'Unhatched' : TYPE_LABELS[characterType]}
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest ml-1">
              · {STAGE_LABELS[characterStage]}
            </span>
          </div>

          {characterType !== 'egg' && (
            <div className="flex items-center gap-3 mb-3">
              {top2.map(stat => (
                <div key={stat.key} className="flex items-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${stat.color}`}>
                    {stat.label}
                  </span>
                  <span className="flex gap-px">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < Math.min(5, Math.floor(stats[stat.key] / 10) + 1)
                            ? stat.dotColor
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>XP Progress</span>
              <span>{xpProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {nextEvolution !== null ? `Evolves at Level ${nextEvolution}` : 'Max Evolution'}
          </p>
        </div>
      </div>
    </div>
  );
}
