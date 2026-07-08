import Podium, { type PodiumEntry } from "@/components/Podium";

export default function MostMessagesCard({ entries }: { entries: PodiumEntry[] }) {
  return (
    <Podium
      title="Most Messages"
      description="Who's the biggest yapper"
      entries={entries}
      unit="message"
      gradient="bg-gradient-to-br from-orange-500 via-red-600 to-rose-700"
    />
  );
}
