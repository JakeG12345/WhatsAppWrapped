import CardShell from "./CardShell";
import type { RunningGagCandidate } from "@/lib/types";
import { whatsappNameColor, WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

export default function RunningGagCard({ gag }: { gag: RunningGagCandidate }) {
  const senderOrder = Array.from(new Set(gag.mentions.map((m) => m.sender)));

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

      <div
        className="flex max-h-[52vh] flex-col overflow-y-auto rounded-2xl bg-black/25 p-3"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      >
        {gag.mentions.map((m, i) => (
          <div key={i} className={`flex flex-col items-start ${i === 0 ? "" : "mt-3"}`}>
            <span className="mb-1 self-center rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white/60">
              {m.date}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl rounded-bl-md px-3 py-1.5 shadow-sm ${WHATSAPP_RECEIVED_BUBBLE}`}
            >
              <p className={`text-xs font-semibold ${whatsappNameColor(m.sender, senderOrder)}`}>
                {m.sender}
              </p>
              <p className="text-sm leading-snug">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
