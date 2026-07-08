import CardShell from "./CardShell";

interface TitleCardProps {
  groupName: string;
  memberCount: number;
  messageCount: number;
  year: number;
}

export default function TitleCard({
  groupName,
  memberCount,
  messageCount,
  year,
}: TitleCardProps) {
  return (
    <CardShell gradient="bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800">
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
          {year} Wrapped
        </p>
        <h1 className="text-5xl font-black leading-[1.05] tracking-tight">
          Your year in
          <br />
          <span className="bg-gradient-to-r from-amber-300 to-pink-300 bg-clip-text text-transparent">
            {groupName}
          </span>
        </h1>
        <p className="mt-2 text-lg text-white/80">
          {memberCount} people. {messageCount.toLocaleString()} messages.
        </p>
      </div>
      <p className="text-sm text-white/50">Swipe to begin →</p>
    </CardShell>
  );
}
