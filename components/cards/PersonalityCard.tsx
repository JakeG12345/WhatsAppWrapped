import CardShell from "./CardShell";
import type { PersonalityEvidence } from "@/lib/types";

const GRADIENTS = [
  "bg-gradient-to-br from-pink-500 via-rose-600 to-red-700",
  "bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700",
  "bg-gradient-to-br from-lime-500 via-green-600 to-emerald-700",
  "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700",
  "bg-gradient-to-br from-amber-400 via-orange-500 to-red-600",
];

interface PersonalityCardProps {
  personality: PersonalityEvidence;
  index: number;
}

export default function PersonalityCard({
  personality,
  index,
}: PersonalityCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <CardShell gradient={gradient} eyebrow="Personality Award">
      <p className="text-2xl font-bold text-white/80">{personality.member}</p>
      <h2 className="text-4xl font-black leading-tight">
        {personality.archetype}
      </h2>
      <p className="text-lg leading-relaxed text-white/90">
        {personality.roastLine}
      </p>
      {personality.evidenceQuotes.length > 0 && (
        <div className="flex flex-col gap-2">
          {personality.evidenceQuotes.slice(0, 2).map((q, i) => (
            <p key={i} className="text-sm italic text-white/60">
              &ldquo;{q}&rdquo;
            </p>
          ))}
        </div>
      )}
    </CardShell>
  );
}
