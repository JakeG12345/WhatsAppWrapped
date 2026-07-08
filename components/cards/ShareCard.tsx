import CardShell from "./CardShell";
import type { ChatStats, WrappedResult } from "@/lib/types";

interface ShareCardProps {
  stats: ChatStats;
  wrapped: WrappedResult;
}

export default function ShareCard({ stats, wrapped }: ShareCardProps) {
  return (
    <CardShell gradient="bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          {new Date().getFullYear()} Wrapped
        </p>
        <h2 className="text-3xl font-black leading-tight">
          {wrapped.groupName}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-2xl font-black">
            {stats.totalMessages.toLocaleString()}
          </p>
          <p className="text-xs text-white/60">messages</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-2xl font-black">{stats.members.length}</p>
          <p className="text-xs text-white/60">members</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3">
          <p className="truncate text-lg font-black">
            {stats.yapper?.name ?? "—"}
          </p>
          <p className="text-xs text-white/60">the yapper</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3">
          <p className="truncate text-lg font-black">
            {stats.airballs[0]?.name ?? "—"}
          </p>
          <p className="text-xs text-white/60">most airballs</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/20 bg-black/20 p-3">
        <p className="text-xs uppercase tracking-widest text-white/50">
          Moment of the Year
        </p>
        <p className="mt-1 text-base font-bold">
          {wrapped.momentOfTheYear.title}
        </p>
      </div>

      <p className="text-center text-xs text-white/40">
        made with WhatsApp Wrapped · repost this to the chat
      </p>
    </CardShell>
  );
}
