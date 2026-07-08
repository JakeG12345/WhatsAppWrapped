import CardShell from "./CardShell";

interface StatCardProps {
  eyebrow: string;
  awardTitle: string;
  winnerName: string;
  statLine: string;
  flavorText: string;
  gradient: string;
  emoji: string;
}

export default function StatCard({
  eyebrow,
  awardTitle,
  winnerName,
  statLine,
  flavorText,
  gradient,
  emoji,
}: StatCardProps) {
  return (
    <CardShell gradient={gradient} eyebrow={eyebrow}>
      <div className="text-6xl">{emoji}</div>
      <h2 className="text-3xl font-black leading-tight">{awardTitle}</h2>
      <p className="text-4xl font-black">{winnerName}</p>
      <p className="text-lg font-medium text-white/90">{statLine}</p>
      <p className="text-sm text-white/60">{flavorText}</p>
    </CardShell>
  );
}
