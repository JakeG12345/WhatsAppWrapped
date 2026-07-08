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
    <div className="wa-screen flex h-dvh w-full flex-col items-center px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-[#E9EDEF]">
      <div className="flex w-full max-w-md flex-col gap-1">
        <p className="wa-kicker">WhatsApp Wrapped</p>
        <h1 className="text-3xl font-semibold leading-tight">Choose the recap range</h1>
        <p className="text-sm leading-6 text-[#AEBAC1]">
          Pick one year, or include every message in the export.
        </p>
      </div>

      <div className="mt-6 flex w-full max-w-md flex-1 flex-col overflow-hidden rounded-3xl border border-[#2A3942] bg-[#111B21]">
        <button
          type="button"
          onClick={() => onSelect("all")}
          className="flex items-center justify-between gap-4 border-b border-[#2A3942] bg-[#202C33] p-4 text-left transition-colors hover:bg-[#26343D]"
        >
          <div className="min-w-0">
            <p className="text-base font-semibold">All time</p>
            <p className="text-xs text-[#8696A0]">
              {totalMemberCount} members, every message in the export
            </p>
          </div>
          <p className="shrink-0 rounded-full bg-[#00A884] px-3 py-1 text-sm font-bold text-[#06130D]">
            {totalMessageCount.toLocaleString()}
          </p>
        </button>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {years.map((y) => (
            <button
              key={y.year}
              type="button"
              onClick={() => onSelect(y.year)}
              className="flex items-center justify-between gap-4 border-b border-[#2A3942] p-4 text-left transition-colors last:border-0 hover:bg-[#182229]"
            >
              <div className="min-w-0">
                <p className="text-base font-semibold">{y.year}</p>
                <p className="truncate text-xs text-[#8696A0]">
                  {y.memberCount} members, {formatShortDate(y.dateRange.start)} to{" "}
                  {formatShortDate(y.dateRange.end)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-[#25D366]">
                {y.messageCount.toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
