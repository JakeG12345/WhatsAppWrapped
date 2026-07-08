import CardShell from "./CardShell";
import type { MomentCandidate } from "@/lib/types";

export default function MomentCard({ moment }: { moment: MomentCandidate }) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700"
      eyebrow="Moment of the Year"
    >
      <div className="rounded-2xl border border-white/30 bg-white/10 p-5 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-widest text-white/60">
          {moment.date}
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight">
          {moment.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/90">
          {moment.narrative}
        </p>
        {moment.peopleInvolved.length > 0 && (
          <p className="mt-4 text-sm text-white/60">
            Starring: {moment.peopleInvolved.join(", ")}
          </p>
        )}
      </div>
      {moment.evidenceQuotes.length > 0 && (
        <div className="flex flex-col gap-2">
          {moment.evidenceQuotes.slice(0, 3).map((q, i) => (
            <p key={i} className="text-sm italic text-white/70">
              &ldquo;{q}&rdquo;
            </p>
          ))}
        </div>
      )}
    </CardShell>
  );
}
