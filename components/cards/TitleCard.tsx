import CardShell from "./CardShell";
import { cleanDisplayCopy } from "@/lib/copy";

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
  const displayGroupName = cleanDisplayCopy(groupName);

  return (
    <CardShell eyebrow="Official record">
      <div className="flex flex-col">
        {/* Giant year masthead */}
        <p className="text-[32vw] font-black leading-[0.82] tracking-tighter tabular-nums text-primary sm:text-[11rem]">
          {year}
        </p>
        <h1 className="mt-2 text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
          {displayGroupName}
        </h1>
        <p className="mono-label mt-3 text-muted">The year in review</p>
      </div>

      {/* Docket line items */}
      <div className="border-t border-border">
        <div className="flex items-baseline justify-between border-b border-border py-3">
          <p className="mono-label text-muted">Messages entered</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {messageCount.toLocaleString()}
          </p>
        </div>
        <div className="flex items-baseline justify-between border-b border-border py-3">
          <p className="mono-label text-muted">Named parties</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {memberCount}
          </p>
        </div>
      </div>

      <p className="mono-label text-center text-muted">
        Swipe to open the file →
      </p>
    </CardShell>
  );
}
