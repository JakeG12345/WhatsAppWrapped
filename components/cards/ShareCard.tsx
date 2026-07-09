import SnapshotExportPanel from "@/components/SnapshotPoster";
import CardShell from "./CardShell";
import type { ChatStats, WrappedResult } from "@/lib/types";

interface ShareCardProps {
  stats: ChatStats;
  wrapped: WrappedResult;
}

export default function ShareCard({ stats, wrapped }: ShareCardProps) {
  return (
    <CardShell className="bg-[#25D366] text-[#04140A]" eyebrow="Snapshot">
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-normal">
          Save the Wrapper
        </h2>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] opacity-70">
          Album-ready on mobile, PNG on desktop
        </p>
      </div>

      <SnapshotExportPanel stats={stats} wrapped={wrapped} />
    </CardShell>
  );
}
