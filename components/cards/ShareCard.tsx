import SnapshotExportPanel from "@/components/SnapshotPoster";
import CardShell from "./CardShell";
import type { ChatStats, WrappedResult } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";

interface ShareCardProps {
  stats: ChatStats;
  wrapped: WrappedResult;
}

export default function ShareCard({ stats, wrapped }: ShareCardProps) {
  const groupName = cleanDisplayCopy(wrapped.groupName);

  return (
    <CardShell className="bg-[#06130D] text-[#E9EDE9]" eyebrow="Final exhibit">
      <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-[0.86fr_1.14fr] sm:items-center">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mono-label text-[#25D366]">Share artifact</p>
            <h2 className="mt-2 text-4xl font-black uppercase leading-[0.9] tracking-normal sm:text-5xl">
              Save the Wrapped
            </h2>
          </div>

          <div className="border-y border-[#25D366]/35 py-3">
            <p className="truncate text-xl font-black uppercase leading-none tracking-normal text-[#25D366]">
              {groupName}
            </p>
            <p className="mono-label mt-2 text-[#8FA396]">
              Send it back to the chat
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[#25D366]/35 text-[#04140A]">
            <div className="bg-[#25D366] p-3">
              <p className="text-2xl font-black tabular-nums">
                {stats.totalMessages.toLocaleString()}
              </p>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
                messages
              </p>
            </div>
            <div className="bg-[#25D366] p-3">
              <p className="text-2xl font-black tabular-nums">{stats.members.length}</p>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
                members
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 border border-[#25D366]/35 bg-[#0A0E0B] p-3 shadow-[0_0_80px_rgba(37,211,102,0.12)]">
          <SnapshotExportPanel stats={stats} wrapped={wrapped} />
        </div>
      </div>
    </CardShell>
  );
}
