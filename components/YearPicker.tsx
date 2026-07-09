import type { YearSummary } from "@/lib/types";
import BrandMark from "./BrandMark";

interface YearPickerProps {
  years: YearSummary[];
  totalMessageCount: number;
  totalMemberCount: number;
  onSelect: (year: number | "all") => void;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function YearPicker({
  years,
  totalMessageCount,
  totalMemberCount,
  onSelect,
}: YearPickerProps) {
  return (
    <main className="flex h-dvh w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:px-6">
        <span className="flex items-center gap-2">
          <BrandMark />
          <p className="mono-label text-muted">WhatsApp Wrapped</p>
        </span>
        <p className="mono-label text-muted">Select volume</p>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden px-4 sm:px-6">
        <div className="py-6">
          <p className="mono-label text-primary">Table of contents</p>
          <h1 className="mt-2 text-balance text-4xl font-black uppercase leading-none tracking-normal">
            Pick the era
          </h1>
        </div>

        <div className="archive-scroll flex flex-1 flex-col overflow-y-auto border-t border-border pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="button"
            onClick={() => onSelect("all")}
            className="group flex items-center justify-between gap-4 border-b border-border bg-primary px-4 py-5 text-left text-primary-ink transition-opacity hover:opacity-90"
          >
            <div className="min-w-0">
              <p className="text-3xl font-black uppercase leading-none tracking-normal">
                All time
              </p>
              <p className="mono-label mt-2 opacity-70">
                {`${totalMemberCount} members`} &middot; full archive
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-bold tabular-nums">
              {totalMessageCount.toLocaleString()}
              <span className="ml-1 opacity-60">msgs</span>
            </p>
          </button>

          {years.map((y, i) => (
            <button
              key={y.year}
              type="button"
              onClick={() => onSelect(y.year)}
              className="group flex items-center justify-between gap-4 border-b border-border px-4 py-5 text-left transition-colors hover:bg-surface"
            >
              <div className="flex min-w-0 items-baseline gap-4">
                <span className="font-mono text-[10px] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-3xl font-black leading-none tracking-normal tabular-nums transition-colors group-hover:text-primary">
                    {y.year}
                  </p>
                  <p className="mono-label mt-2 truncate text-muted">
                    {y.memberCount} members &middot;{" "}
                    {formatShortDate(y.dateRange.start)} to{" "}
                    {formatShortDate(y.dateRange.end)}
                  </p>
                </div>
              </div>
              <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-primary">
                {y.messageCount.toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
