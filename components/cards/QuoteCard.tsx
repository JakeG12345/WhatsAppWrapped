import CardShell from "./CardShell";
import type { QuoteCandidate } from "@/lib/types";
import { WHATSAPP_RECEIVED_BUBBLE } from "@/lib/whatsapp";

const NAME_COLOR = "text-[#53BDEB]";

export default function QuoteCard({ quote }: { quote: QuoteCandidate }) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-zinc-900 via-neutral-900 to-black"
      eyebrow="Quote of the Year"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
          {quote.date}
        </span>
        <div
          className={`max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-left shadow-lg ${WHATSAPP_RECEIVED_BUBBLE}`}
        >
          <p className={`text-xs font-semibold ${NAME_COLOR}`}>{quote.sender}</p>
          <p className="text-lg font-semibold leading-snug">{quote.text}</p>
        </div>
        <p className="text-sm text-white/50">{quote.context}</p>
      </div>
    </CardShell>
  );
}
