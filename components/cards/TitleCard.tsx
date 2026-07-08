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
    <CardShell gradient="wa-card-surface">
      <div className="wa-panel overflow-hidden rounded-[2rem]">
        <div className="flex items-center gap-3 border-b border-[#2A3942] bg-[#202C33] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884] text-sm font-black text-[#06130D]">
            {memberCount}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{displayGroupName}</p>
            <p className="text-xs text-[#8696A0]">{year} chat recap</p>
          </div>
        </div>

        <div className="wa-wallpaper flex min-h-[48vh] flex-col justify-between p-5">
          <div className="w-fit rounded-2xl rounded-bl-md bg-[#202C33] px-4 py-3 shadow-sm">
            <p className="wa-kicker">WhatsApp Wrapped</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight">
              Your year in {displayGroupName}
            </h1>
          </div>

          <div className="ml-auto flex max-w-[82%] flex-col gap-2 rounded-2xl rounded-br-md bg-[#005C4B] px-4 py-3 text-right shadow-sm">
            <p className="text-3xl font-semibold tabular-nums">
              {messageCount.toLocaleString()}
            </p>
            <p className="text-sm text-[#D9FDD3]">
              messages from {memberCount} people
            </p>
          </div>
        </div>
      </div>
      <p className="text-center text-sm text-[#8696A0]">Swipe to begin</p>
    </CardShell>
  );
}
