import { clsx } from "clsx";
import { Skull, Check, X } from "lucide-react";
import type { BossHistoryEntry } from "@/lib/gamification/types";

interface BossHistoryProps {
  entries: BossHistoryEntry[];
}

export default function BossHistory({ entries }: BossHistoryProps) {
  return (
    <div className="w-full border border-border bg-white p-4 rounded-sm">
      <h2 className="text-[10px] font-black text-faint uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Skull size={10} />
        Boss History
      </h2>

      {entries.length === 0 ? (
        <p className="text-[11px] text-muted py-2">No past encounters.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-1.5 border-b border-border-faint last:border-0"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-text truncate block">
                  {entry.title}
                </span>
                <span className="text-[10px] text-faint">
                  {new Date(entry.completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm flex items-center gap-1 shrink-0",
                  entry.outcome === "defeated"
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-red-600 bg-red-50"
                )}
              >
                {entry.outcome === "defeated" ? (
                  <><Check size={9} strokeWidth={3} /> Defeated</>
                ) : (
                  <><X size={9} strokeWidth={3} /> Escaped</>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
