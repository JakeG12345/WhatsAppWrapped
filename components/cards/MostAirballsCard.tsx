import Podium, { type PodiumEntry } from "@/components/Podium";

export default function MostAirballsCard({ entries }: { entries: PodiumEntry[] }) {
  return (
    <Podium
      eyebrow=""
      title="Most Airballs"
      description="No reply for 2+ hours 💀"
      entries={entries}
      unit="airball"
      gradient="bg-gradient-to-br from-slate-600 via-slate-800 to-black"
    />
  );
}
