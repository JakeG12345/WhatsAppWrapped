import CardShell from "./CardShell";
import type { MomentCandidate } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";
import { whatsappNameColor, WHATSAPP_SENT_BUBBLE, WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

export default function MemorableChatCard({ moment }: { moment: MomentCandidate }) {
  // No "current user" concept in a recap viewed by anyone, in or out of the
  // chat. Unlike real WhatsApp, every sender gets a name label, including
  // the "me" slot (first speaker, right-aligned/green). Omitting it there
  // reads as a missing name rather than "obviously you" the way it does in
  // the real app.
  const me = moment.exchange[0]?.sender;
  const allSenders = Array.from(new Set(moment.exchange.map((t) => t.sender)));

  return (
    <CardShell
      gradient="wa-card-surface"
      eyebrow="Most Memorable Chat"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[#8696A0]">{cleanDisplayCopy(moment.date)}</p>
        <h2 className="text-3xl font-semibold leading-tight">
          {cleanDisplayCopy(moment.title)}
        </h2>
      </div>

      <div
        className="wa-message-scroll flex max-h-[52vh] flex-col overflow-y-auto rounded-3xl border border-[#2A3942] p-3"
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
                className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${tailCorner} ${
                  isMe ? WHATSAPP_SENT_BUBBLE : WHATSAPP_RECEIVED_BUBBLE
                }`}
              >
                {!prevSameSender && (
                  <p
                    className={`text-xs font-semibold ${whatsappNameColor(turn.sender, allSenders)}`}
                  >
                    {cleanDisplayCopy(turn.sender)}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{cleanDisplayCopy(turn.text)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
