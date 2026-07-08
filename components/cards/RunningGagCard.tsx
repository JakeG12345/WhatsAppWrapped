import CardShell from "./CardShell";
import type { RunningGagCandidate } from "@/lib/types";

export default function RunningGagCard({ gag }: { gag: RunningGagCandidate }) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700"
      eyebrow="Running Gag Hall of Fame"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black leading-tight">{gag.name}</h2>
        <p className="text-sm text-white/60">
          Referenced {gag.mentions.length} time{gag.mentions.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto rounded-2xl bg-black/20 p-3">
        {gag.mentions.map((m, i) => (
          <div key={i} className="rounded-xl bg-white/10 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-white/50">
              <span>{m.sender}</span>
              <span>{m.date}</span>
            </div>
            <p className="mt-1 text-sm italic leading-snug">&ldquo;{m.text}&rdquo;</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
