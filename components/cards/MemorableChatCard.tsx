import CardShell from "./CardShell";
import type { MomentCandidate } from "@/lib/types";
import { whatsappNameColor, WHATSAPP_SENT_BUBBLE, WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

export default function MemorableChatCard({ moment }: { moment: MomentCandidate }) {
  // No "current user" concept in a recap viewed by anyone, in or out of the
  // chat — so unlike real WhatsApp, EVERY sender gets a name label, including
  // the "me" slot (first speaker, right-aligned/green) — omitting it there
  // reads as a missing name rather than "obviously you" the way it does in
  // the real app.
  const me = moment.exchange[0]?.sender;
  const allSenders = Array.from(new Set(moment.exchange.map((t) => t.sender)));

  return (
    <CardShell
      gradient="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700"
      eyebrow="Most Memorable Chat"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-widest text-white/60">{moment.date}</p>
        <h2 className="text-2xl font-black leading-tight">{moment.title}</h2>
      </div>

      <div
        className="flex max-h-[52vh] flex-col overflow-y-auto rounded-2xl bg-black/25 p-3"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      >
        {moment.exchange.map((turn, i) => {
          const isMe = turn.sender === me;
          const prevSameSender = i > 0 && moment.exchange[i - 1].sender === turn.sender;
          // The "tail" corner (near-square) marks the start of a new
          // speaker turn; consecutive bubbles from the same sender go
          // fully rounded there instead, just like WhatsApp's grouping.
          const tailCorner = isMe
            ? prevSameSender
              ? "rounded-br-2xl"
              : "rounded-br-md"
            : prevSameSender
              ? "rounded-bl-2xl"
              : "rounded-bl-md";

          return (
            <div
              key={i}
              className={`flex ${isMe ? "justify-end" : "justify-start"} ${
                i === 0 ? "" : prevSameSender ? "mt-0.5" : "mt-2"
              }`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-1.5 shadow-sm ${tailCorner} ${
                  isMe ? WHATSAPP_SENT_BUBBLE : WHATSAPP_RECEIVED_BUBBLE
                }`}
              >
                {!prevSameSender && (
                  <p
                    className={`text-xs font-semibold ${whatsappNameColor(turn.sender, allSenders)}`}
                  >
                    {turn.sender}
                  </p>
                )}
                <p className="text-sm leading-snug">{turn.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
