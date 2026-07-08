"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import CardShell from "./CardShell";
import type { ChatStats, WrappedResult } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";

interface ShareCardProps {
  stats: ChatStats;
  wrapped: WrappedResult;
}

export default function ShareCard({ stats, wrapped }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const groupName = cleanDisplayCopy(wrapped.groupName);

  async function handleDownload() {
    if (!cardRef.current) return;
    setStatus("working");
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
      });
      const link = document.createElement("a");
      const safeName = wrapped.groupName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      link.download = `${safeName || "chat"}-wrapped.png`;
      link.href = dataUrl;
      link.click();
      setStatus("idle");
    } catch (err) {
      console.error("Failed to generate share image:", err);
      setStatus("error");
    }
  }

  return (
    <CardShell
      ref={cardRef}
      gradient="wa-card-surface"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00A884] text-sm font-black text-[#06130D]">
          WA
        </div>
        <div className="min-w-0">
          <p className="wa-kicker">
            {stats.dateRange.end.getFullYear()} recap
          </p>
          <h2 className="truncate text-3xl font-semibold leading-tight">
            {groupName}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="wa-soft-panel rounded-2xl p-3">
          <p className="text-2xl font-semibold tabular-nums">
            {stats.totalMessages.toLocaleString()}
          </p>
          <p className="text-xs text-[#8696A0]">messages</p>
        </div>
        <div className="wa-soft-panel rounded-2xl p-3">
          <p className="text-2xl font-semibold tabular-nums">{stats.members.length}</p>
          <p className="text-xs text-[#8696A0]">members</p>
        </div>
        <div className="wa-soft-panel rounded-2xl p-3">
          <p className="truncate text-lg font-semibold">
            {stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "None"}
          </p>
          <p className="text-xs text-[#8696A0]">top sender</p>
        </div>
        <div className="wa-soft-panel rounded-2xl p-3">
          <p className="truncate text-lg font-semibold">
            {stats.airballs[0]?.name ? cleanDisplayCopy(stats.airballs[0].name) : "None"}
          </p>
          <p className="text-xs text-[#8696A0]">silence starts</p>
        </div>
      </div>

      <div className="wa-panel rounded-3xl p-4">
        <p className="wa-kicker">
          Most Memorable Chat
        </p>
        <p className="mt-2 text-lg font-semibold leading-snug">
          {cleanDisplayCopy(wrapped.momentOfTheYear.title)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={status === "working"}
        data-export-ignore="true"
        className="wa-action rounded-full px-5 py-2.5 text-sm font-bold shadow-lg disabled:opacity-60"
      >
        {status === "working" ? "Preparing" : "Download image"}
      </button>
      {status === "error" && (
        <p data-html2canvas-ignore="true" className="text-center text-xs text-red-200">
          Couldn&apos;t generate the image. Try again or take a screenshot.
        </p>
      )}

      <p className="text-center text-xs text-[#8696A0]">
        WhatsApp Wrapped | share this to the chat
      </p>
    </CardShell>
  );
}
