import { clsx } from "clsx";

interface SynergyBadgeProps {
  multiplier: number;
}

/**
 * Inline indicator for multi-stat synergy bonuses.
 * Shows nothing when multiplier is 1 (no bonus).
 * Shows ⚡1.5x or ⚡⚡2x based on multiplier value.
 */
export default function SynergyBadge({ multiplier }: SynergyBadgeProps) {
  if (multiplier <= 1) return null;

  const isDouble = multiplier >= 2;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shrink-0",
        isDouble
          ? "bg-amber-100 text-amber-700"
          : "bg-amber-50 text-amber-600"
      )}
      title={`Synergy bonus: ${multiplier}x XP multiplier`}
    >
      {isDouble ? "⚡⚡" : "⚡"}
      {multiplier}x
    </span>
  );
}
