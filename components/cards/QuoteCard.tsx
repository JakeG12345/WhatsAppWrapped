import CardShell from "./CardShell";
import type { QuoteCandidate } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";

export default function QuoteCard({ quote }: { quote: QuoteCandidate }) {
  const text = cleanDisplayCopy(quote.text);
  // Short quotes earn poster-scale type; long ones step down to stay on-card.
  const sizeClass =
    text.length <= 60
      ? "text-4xl sm:text-5xl"
      : text.length <= 140
        ? "text-3xl sm:text-4xl"
        : "text-2xl sm:text-3xl";

  return (
    <CardShell eyebrow="Quote of the year">
      <div className="flex flex-col">
        <span
          aria-hidden="true"
          className="font-mono text-7xl font-bold leading-none text-primary"
        >
          &ldquo;
        </span>
        <blockquote
          className={`text-balance font-black leading-[1.05] tracking-tight ${sizeClass}`}
        >
          {text}
        </blockquote>
        <div className="mt-6 flex items-baseline gap-3 border-t border-border pt-4">
          <cite className="not-italic text-lg font-black uppercase tracking-tight text-primary">
            {cleanDisplayCopy(quote.sender)}
          </cite>
          <span className="mono-label text-muted">
            {cleanDisplayCopy(quote.date)}
          </span>
        </div>
      </div>

      <p className="max-w-md font-mono text-xs leading-relaxed text-muted">
        {cleanDisplayCopy(quote.context)}
      </p>
    </CardShell>
  );
}
