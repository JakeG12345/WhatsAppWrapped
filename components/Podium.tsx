"use client";

import { motion } from "framer-motion";
import CardShell from "./cards/CardShell";
import { cleanDisplayCopy } from "@/lib/copy";

export interface PodiumEntry {
  name: string;
  count: number;
}

interface PodiumProps {
  eyebrow?: string;
  title: string;
  description?: string;
  entries: PodiumEntry[];
  unit: string;
  gradient: string;
}

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
  const top = entries[0];
  const maxCount = Math.max(...entries.map((entry) => entry.count), 1);

  return (
    <CardShell gradient={gradient} eyebrow={eyebrow}>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold leading-tight">{title}</h2>
        {description && <p className="text-sm leading-6 text-[#AEBAC1]">{description}</p>}
      </div>

      {top && (
        <div className="wa-panel rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00A884] text-sm font-black text-[#06130D]">
              {initials(top.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{cleanDisplayCopy(top.name)}</p>
              <p className="text-xs text-[#8696A0]">
                Rank 1, {top.count.toLocaleString()} {pluralize(unit, top.count)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="wa-soft-panel flex max-h-[46vh] flex-col overflow-y-auto rounded-3xl">
        {entries.map((entry, i) => {
          const width = `${Math.max(6, (entry.count / maxCount) * 100)}%`;
          return (
            <div
              key={entry.name}
              className="flex flex-col gap-2 border-b border-[#2A3942] px-4 py-3 last:border-0"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111B21] text-xs font-bold text-[#8696A0]">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {cleanDisplayCopy(entry.name)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#AEBAC1]">
                  {entry.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#111B21]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.04 }}
                  className="h-full rounded-full bg-[#00A884]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
