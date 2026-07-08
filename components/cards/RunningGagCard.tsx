import CardShell from "./CardShell";
import type { RunningGagCandidate } from "@/lib/types";

export default function RunningGagCard({ gag }: { gag: RunningGagCandidate }) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700"
      eyebrow="Running Gag Hall of Fame"
    >
      <div className="text-6xl">🏆</div>
      <h2 className="text-3xl font-black leading-tight">{gag.name}</h2>
      <p className="text-lg font-medium text-white/90">
        Referenced {gag.timesReferenced}+ times since {gag.originDate}
      </p>
      <p className="text-sm italic text-white/70">
        &ldquo;{gag.originQuote}&rdquo;
      </p>
      <p className="text-sm text-white/60">{gag.description}</p>
    </CardShell>
  );
}
