import CardShell from "./CardShell";
import type { QuoteCandidate } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";
import { WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

const NAME_COLOR = "text-[#53BDEB]";

export default function QuoteCard({ quote }: { quote: QuoteCandidate }) {
  return (
    <CardShell
      gradient="wa-card-surface"
      eyebrow="Quote of the Year"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-[#2A3942] bg-[#111B21] px-3 py-1 text-[10px] font-medium text-[#8696A0]">
          {cleanDisplayCopy(quote.date)}
        </span>
        <div
          className={`max-w-[88%] rounded-2xl rounded-bl-md px-4 py-3 text-left shadow-lg ${WHATSAPP_RECEIVED_BUBBLE}`}
        >
          <p className={`text-xs font-semibold ${NAME_COLOR}`}>
            {cleanDisplayCopy(quote.sender)}
          </p>
          <p className="text-lg font-semibold leading-snug">
            {cleanDisplayCopy(quote.text)}
          </p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#8696A0]">
          {cleanDisplayCopy(quote.context)}
        </p>
      </div>
    </CardShell>
  );
}
