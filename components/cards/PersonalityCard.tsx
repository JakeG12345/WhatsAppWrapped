import CardShell from "./CardShell";
import type { PersonalityEvidence } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";
import { WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

const ACCENTS = [
  "border-[#25D366]",
  "border-[#53BDEB]",
  "border-[#FFA000]",
  "border-[#D291E4]",
  "border-[#6BCF9C]",
];

interface PersonalityCardProps {
  personality: PersonalityEvidence;
  index: number;
}

export default function PersonalityCard({
  personality,
  index,
}: PersonalityCardProps) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <CardShell gradient="wa-card-surface" eyebrow="Personality">
      <div className={`wa-panel rounded-3xl border-l-4 ${accent} p-5`}>
        <p className="text-sm font-semibold text-[#25D366]">
          {cleanDisplayCopy(personality.member)}
        </p>
        <h2 className="mt-2 text-4xl font-semibold leading-tight">
          {cleanDisplayCopy(personality.archetype)}
        </h2>
        <p className="mt-4 text-base leading-7 text-[#AEBAC1]">
          {cleanDisplayCopy(personality.roastLine)}
        </p>
      </div>
      {personality.evidenceQuotes.length > 0 && (
        <div className="flex flex-col items-start">
          {personality.evidenceQuotes.slice(0, 3).map((q, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${WHATSAPP_RECEIVED_BUBBLE} ${
                i === 0 ? "rounded-bl-md" : "rounded-bl-2xl mt-0.5"
              }`}
            >
              {cleanDisplayCopy(q)}
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}
