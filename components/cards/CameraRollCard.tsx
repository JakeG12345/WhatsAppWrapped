/* eslint-disable @next/next/no-img-element */
import CardShell from "./CardShell";
import type { MediaHighlight } from "@/lib/media";

export default function CameraRollCard({ highlights }: { highlights: MediaHighlight[] }) {
  return (
    <CardShell eyebrow="Photographic evidence">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
          The year in photos
        </h2>
        <p className="shrink-0 text-right font-mono text-4xl font-bold leading-none tabular-nums text-primary">
          {highlights.length}
        </p>
      </div>

      {/* Contact sheet */}
      <div className="grid grid-cols-3 gap-px border border-border bg-border">
        {highlights.map((h, i) => (
          <figure key={i} className="relative m-0 bg-background">
            <div className="relative aspect-square overflow-hidden">
              <img
                src={h.url}
                alt={`Photo shared by ${h.sender}`}
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="flex items-center justify-between gap-1 px-1.5 py-1">
              <span className="truncate font-mono text-[9px] uppercase tracking-wider text-muted">
                {h.sender}
              </span>
              <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </CardShell>
  );
}
