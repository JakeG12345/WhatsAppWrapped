"use client";

import { motion } from "framer-motion";
import CardShell from "./cards/CardShell";
import { cleanDisplayCopy } from "@/lib/copy";

export interface PodiumEntry {
  name: string;
  count: number;
}

interface PodiumProps {
  eyebrow: string;
  title: string;
  description?: string;
  entries: PodiumEntry[];
  unit: string;
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
}: PodiumProps) {
  const [top, ...rest] = entries;
  const maxCount = Math.max(...entries.map((entry) => entry.count), 1);

  return (
    <CardShell eyebrow={eyebrow}>
      <div>
        <h2 className="text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 font-mono text-xs leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>

      {/* Winner: gets the whole green block treatment */}
      {top && (
        <div className="grain relative bg-primary p-4 text-primary-ink">
          <div className="relative z-10 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="mono-label opacity-70">No. 1</p>
              <p className="mt-1 truncate text-3xl font-black uppercase leading-none tracking-tight">
                {cleanDisplayCopy(top.name)}
              </p>
            </div>
            <p className="shrink-0 text-right font-mono text-2xl font-bold leading-none tabular-nums">
              {top.count.toLocaleString()}
              <span className="mt-1 block text-[10px] font-normal uppercase tracking-widest opacity-70">
                {pluralize(unit, top.count)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* The rest: ledger rows */}
      <div className="archive-scroll max-h-[42vh] overflow-y-auto border-t border-border">
        {rest.map((entry, i) => {
          const width = `${Math.max(4, (entry.count / maxCount) * 100)}%`;
          return (
            <div
              key={entry.name}
              className="relative border-b border-border py-3"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width }}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.05 }}
                className="absolute inset-y-0 left-0 bg-primary/10"
              />
              <div className="relative flex items-baseline justify-between gap-3 px-1">
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
                    {String(i + 2).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm font-bold uppercase tracking-wide">
                    {cleanDisplayCopy(entry.name)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-muted">
                  {entry.count.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
