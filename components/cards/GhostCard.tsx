import StatCard from "./StatCard";
import { formatDuration } from "@/lib/format";

export default function GhostCard({
  name,
  longestSilenceHours,
}: {
  name: string;
  longestSilenceHours: number;
}) {
  return (
    <StatCard
      eyebrow="The Ghost"
      awardTitle="Longest Disappearance"
      winnerName={name}
      statLine={`${formatDuration(longestSilenceHours)} of radio silence`}
      flavorText="Left on read by the group chat itself."
      gradient="bg-gradient-to-br from-slate-600 via-slate-800 to-black"
      emoji="👻"
    />
  );
}
