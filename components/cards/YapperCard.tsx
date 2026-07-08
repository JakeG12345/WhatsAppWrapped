import StatCard from "./StatCard";

export default function YapperCard({
  name,
  messageCount,
}: {
  name: string;
  messageCount: number;
}) {
  return (
    <StatCard
      eyebrow="The Yapper Award"
      awardTitle="Most Messages Sent"
      winnerName={name}
      statLine={`${messageCount.toLocaleString()} messages sent`}
      flavorText="Everyone else was basically an audience member."
      gradient="bg-gradient-to-br from-orange-500 via-red-600 to-rose-700"
      emoji="🗣️"
    />
  );
}
