import CardShell from "./CardShell";
import type { PersonalityEvidence } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";
import { WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

interface PersonalityCardProps {
  personality: PersonalityEvidence;
  index: number;
}

export default function PersonalityCard({
  personality,
  index,
}: PersonalityCardProps) {
  return (
    <CardShell eyebrow={`Award No. ${String(index + 1).padStart(2, "0")}`}>
      {/* The certificate */}
      <div>
        <p className="mono-label text-muted">Presented to</p>
        <p className="mt-1 border-b border-border pb-3 text-2xl font-black uppercase tracking-tight text-primary">
          {cleanDisplayCopy(personality.member)}
        </p>
        <h2 className="mt-4 text-balance text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl">
          {cleanDisplayCopy(personality.archetype)}
        </h2>
        <p className="mt-4 max-w-md border-l-2 border-primary pl-4 text-base leading-relaxed text-muted">
          {cleanDisplayCopy(personality.roastLine)}
        </p>
      </div>

      {/* Supporting evidence */}
      {personality.evidenceQuotes.length > 0 && (
        <div>
          <p className="mono-label mb-2 text-muted">Supporting evidence</p>
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
        </div>
      )}
    </CardShell>
  );
}
