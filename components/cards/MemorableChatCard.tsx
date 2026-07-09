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
    <CardShell eyebrow="Exhibit: The Moment">
      <div>
        <p className="mono-label text-primary">{cleanDisplayCopy(moment.date)}</p>
        <h2 className="mt-2 text-balance text-3xl font-black uppercase leading-[0.98] tracking-normal sm:text-4xl">
          {cleanDisplayCopy(moment.title)}
        </h2>
      </div>

      {/* The transcript itself stays pure WhatsApp - the frame is the evidence bag */}
      <div className="border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1.5">
          <p className="mono-label text-muted">Transcript</p>
          <p className="mono-label text-muted">Unedited</p>
        </div>
        <div className="wa-message-scroll archive-scroll flex max-h-[48vh] flex-col overflow-y-auto p-3">
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
      </div>
    </CardShell>
  );
}
