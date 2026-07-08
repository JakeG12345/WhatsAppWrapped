import CardShell from "./CardShell";

export default function FinaleCard({
  groupName,
  closingSpeech,
}: {
  groupName: string;
  closingSpeech: string;
}) {
  return (
    <CardShell
      gradient="bg-gradient-to-br from-yellow-500 via-amber-600 to-purple-800"
      eyebrow="Closing Remarks"
    >
      <p className="text-5xl">🏆</p>
      <h2 className="text-3xl font-black leading-tight">
        The {groupName} Awards
      </h2>
      <p className="text-lg leading-relaxed text-white/90">{closingSpeech}</p>
    </CardShell>
  );
}
