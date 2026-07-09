import CardShell from "./CardShell";
import type { RunningGagCandidate } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";
import { whatsappNameColor, WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

export default function RunningGagCard({ gag }: { gag: RunningGagCandidate }) {
  const senderOrder = Array.from(new Set(gag.mentions.map((m) => m.sender)));

  return (
    <CardShell eyebrow="Recurring bit">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <h2 className="min-w-0 text-balance text-3xl font-black uppercase leading-[0.98] tracking-normal sm:text-4xl">
          {cleanDisplayCopy(gag.name)}
        </h2>
        <p className="shrink-0 text-right">
          <span className="block font-mono text-4xl font-bold leading-none tabular-nums text-primary">
            {gag.mentions.length}
          </span>
          <span className="mono-label mt-1 block text-muted">
            sighting{gag.mentions.length === 1 ? "" : "s"}
          </span>
        </p>
      </div>

      <div className="wa-message-scroll archive-scroll flex max-h-[50vh] flex-col overflow-y-auto border border-border p-3">
        {gag.mentions.map((m, i) => (
          <div key={i} className={`flex flex-col items-start ${i === 0 ? "" : "mt-4"}`}>
            <span className="mono-label mb-1.5 self-center text-muted">
              {cleanDisplayCopy(m.date)}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 shadow-sm ${WHATSAPP_RECEIVED_BUBBLE}`}
            >
              <p className={`text-xs font-semibold ${whatsappNameColor(m.sender, senderOrder)}`}>
                {cleanDisplayCopy(m.sender)}
              </p>
              <p className="text-sm leading-relaxed">{cleanDisplayCopy(m.text)}</p>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
