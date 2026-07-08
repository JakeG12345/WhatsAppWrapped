import Podium, { type PodiumEntry } from "@/components/Podium";

export default function MostAirballsCard({ entries }: { entries: PodiumEntry[] }) {
  return (
    <Podium
      eyebrow="Leaderboard 02"
      title="Left on Read"
      description="Messages followed by 2+ hours of total silence."
      entries={entries}
      unit="message"
    />
  );
}
