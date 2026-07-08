import type { YearSummary } from "@/lib/types";

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
    <div className="flex h-dvh w-full flex-col items-center bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800 px-6 py-10 text-white">
      <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
          WhatsApp Wrapped
        </p>
        <h1 className="text-3xl font-black leading-tight">Which year?</h1>
        <p className="text-sm text-white/70">
          Pick a year to get its Wrapped, or run the whole chat at once.
        </p>
      </div>

      <div className="mt-8 flex w-full max-w-sm flex-1 flex-col gap-3 overflow-y-auto pb-4">
        <button
          type="button"
          onClick={() => onSelect("all")}
          className="flex items-center justify-between rounded-2xl border-2 border-white/50 bg-white/15 p-4 text-left transition-colors hover:bg-white/25"
        >
          <div>
            <p className="text-lg font-black">All time</p>
            <p className="text-xs text-white/60">
              {totalMemberCount} members · every message in the export
            </p>
          </div>
          <p className="text-2xl font-black">{totalMessageCount.toLocaleString()}</p>
        </button>

        {years.map((y) => (
          <button
            key={y.year}
            type="button"
            onClick={() => onSelect(y.year)}
            className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 p-4 text-left transition-colors hover:bg-white/15"
          >
            <div>
              <p className="text-lg font-black">{y.year}</p>
              <p className="text-xs text-white/60">
                {y.memberCount} members · {formatShortDate(y.dateRange.start)}–
                {formatShortDate(y.dateRange.end)}
              </p>
            </div>
            <p className="text-2xl font-black">{y.messageCount.toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
