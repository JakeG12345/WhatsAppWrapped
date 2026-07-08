import Podium, { type PodiumEntry } from "@/components/Podium";

export default function MostMessagesCard({ entries }: { entries: PodiumEntry[] }) {
  return (
    <Podium
      eyebrow="Leaderboard 01"
      title="Most Messages"
      description="Total messages entered into evidence, per member."
      entries={entries}
      unit="message"
    />
  );
}
