import Podium, { type PodiumEntry } from "@/components/Podium";

export default function MostMessagesCard({ entries }: { entries: PodiumEntry[] }) {
  return (
    <Podium
      title="Most Messages"
      description="The highest message count in this export."
      entries={entries}
      unit="message"
      gradient="wa-card-surface"
    />
  );
}
