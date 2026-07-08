import CardShell from "./CardShell";
import type { QuoteCandidate } from "@/lib/types";

export default function QuoteCard({ quote }: { quote: QuoteCandidate }) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-zinc-900 via-neutral-900 to-black"
      eyebrow="Quote of the Year"
    >
      <p className="text-4xl">💬</p>
      <p className="text-3xl font-black leading-snug">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-lg font-semibold text-white/80">— {quote.sender}</p>
      <p className="text-sm text-white/50">{quote.date}</p>
      <p className="text-sm text-white/50">{quote.context}</p>
    </CardShell>
  );
}
