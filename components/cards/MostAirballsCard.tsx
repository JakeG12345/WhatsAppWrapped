import Podium, { type PodiumEntry } from "@/components/Podium";

export default function MostAirballsCard({ entries }: { entries: PodiumEntry[] }) {
  return (
    <Podium
      title="Most Left on Read"
      description="Messages followed by 2+ hours of silence."
      entries={entries}
      unit="message"
      gradient="wa-card-surface"
    />
  );
}
