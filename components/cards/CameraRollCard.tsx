/* eslint-disable @next/next/no-img-element */
import CardShell from "./CardShell";
import type { MediaHighlight } from "@/lib/media";

export default function CameraRollCard({ highlights }: { highlights: MediaHighlight[] }) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700"
      eyebrow="Camera Roll"
    >
      <h2 className="text-3xl font-black leading-tight">The Year in Photos</h2>

      <div className="grid grid-cols-3 gap-1.5">
        {highlights.map((h, i) => (
          <div
            key={i}
            className="relative aspect-square overflow-hidden rounded-lg bg-black/20"
          >
            <img
              src={h.url}
              alt={`Photo from ${h.sender}`}
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white">
              {h.sender}
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
