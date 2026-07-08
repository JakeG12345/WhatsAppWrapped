import CardShell from "./CardShell";
import type { RunningGagCandidate } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";
import { whatsappNameColor, WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

export default function RunningGagCard({ gag }: { gag: RunningGagCandidate }) {
  const senderOrder = Array.from(new Set(gag.mentions.map((m) => m.sender)));

  return (
    <CardShell
      gradient="wa-card-surface"
      eyebrow="Running Gag Hall of Fame"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold leading-tight">
          {cleanDisplayCopy(gag.name)}
        </h2>
        <p className="text-sm text-[#AEBAC1]">
          Referenced {gag.mentions.length} time{gag.mentions.length === 1 ? "" : "s"}
        </p>
      </div>

      <div
        className="wa-message-scroll flex max-h-[52vh] flex-col overflow-y-auto rounded-3xl border border-[#2A3942] p-3"
      >
        {gag.mentions.map((m, i) => (
          <div key={i} className={`flex flex-col items-start ${i === 0 ? "" : "mt-3"}`}>
            <span className="mb-1 self-center rounded-full bg-[#111B21]/90 px-2 py-0.5 text-[10px] font-medium text-[#8696A0]">
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
