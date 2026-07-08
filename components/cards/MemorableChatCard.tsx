import CardShell from "./CardShell";
import type { MomentCandidate } from "@/lib/types";

const BUBBLE_COLORS = [
  "bg-white/15",
  "bg-amber-400/25",
  "bg-sky-400/25",
  "bg-emerald-400/25",
  "bg-pink-400/25",
];

function bubbleColor(sender: string, senderOrder: string[]): string {
  const idx = senderOrder.indexOf(sender);
  return BUBBLE_COLORS[idx % BUBBLE_COLORS.length];
}

export default function MemorableChatCard({ moment }: { moment: MomentCandidate }) {
  const senderOrder = Array.from(new Set(moment.exchange.map((t) => t.sender)));

  return (
    <CardShell
      gradient="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700"
      eyebrow="Most Memorable Chat"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-widest text-white/60">{moment.date}</p>
        <h2 className="text-2xl font-black leading-tight">{moment.title}</h2>
      </div>

      <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto rounded-2xl bg-black/20 p-3">
        {moment.exchange.map((turn, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 ${bubbleColor(turn.sender, senderOrder)}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
              {turn.sender}
            </p>
            <p className="text-sm leading-snug">{turn.text}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
