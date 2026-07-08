"use client";

import { motion } from "framer-motion";
import CardShell from "./cards/CardShell";

export interface PodiumEntry {
  name: string;
  count: number;
}

interface PodiumProps {
  eyebrow?: string;
  title: string;
  description?: string;
  entries: PodiumEntry[]; // full ranking, all members, sorted descending
  unit: string; // e.g. "message" — pluralized automatically
  gradient: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];
// 1st tallest/widest in the center, 2nd and 3rd shorter on either side —
// height carries the rank (the actual data channel), not color.
const STAND_HEIGHT = [96, 68, 48];
const STAND_ORDER = [1, 0, 2]; // display order: 2nd, 1st, 3rd

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function pluralize(unit: string, count: number): string {
  return count === 1 ? unit : `${unit}s`;
}

export default function Podium({
  eyebrow,
  title,
  description,
  entries,
  unit,
  gradient,
}: PodiumProps) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <CardShell gradient={gradient} eyebrow={eyebrow}>
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black leading-tight">{title}</h2>
        {description && <p className="text-sm text-white/60">{description}</p>}
      </div>

      <div className="flex items-end justify-center gap-3">
        {STAND_ORDER.filter((rank) => top3[rank]).map((rank) => {
          const entry = top3[rank];
          return (
            <div key={entry.name} className="flex w-24 flex-col items-center gap-1.5">
              <p className="text-xl leading-none">{MEDALS[rank]}</p>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-base font-bold ring-2 ring-white/30">
                {initials(entry.name)}
              </div>
              <p className="w-full truncate text-center text-sm font-semibold">
                {entry.name}
              </p>
              <p className="text-xl font-black">{entry.count.toLocaleString()}</p>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: STAND_HEIGHT[rank] }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 * rank }}
                className="flex w-full items-start justify-center rounded-t-xl bg-white/15 pt-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
              >
                <span className="text-lg font-black text-white/70">{rank + 1}</span>
              </motion.div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="flex max-h-40 flex-col overflow-y-auto rounded-xl bg-black/15">
          {rest.map((entry, i) => (
            <div
              key={entry.name}
              className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 last:border-0"
            >
              <span className="flex items-center gap-3 truncate">
                <span className="text-xs font-semibold tabular-nums text-white/40">
                  {i + 4}
                </span>
                <span className="truncate text-sm font-medium">{entry.name}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-white/70">
                {entry.count.toLocaleString()} {pluralize(unit, entry.count)}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}
