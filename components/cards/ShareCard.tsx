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
  const year = stats.dateRange.end.getFullYear();

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
      className="bg-[#25D366] text-[#04140A]"
      eyebrow="The verdict"
    >
      {/* Poster masthead */}
      <div>
        <p className="text-[24vw] font-black leading-[0.82] tracking-tighter tabular-nums sm:text-9xl">
          {year}
        </p>
        <h2 className="mt-1 text-balance text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl">
          {groupName}
        </h2>
        <p className="mono-label mt-2 opacity-70">Wrapped &middot; case closed</p>
      </div>

      {/* Ledger */}
      <div className="border-t-2 border-[#04140A]">
        <div className="flex items-baseline justify-between border-b border-[#04140A]/30 py-2.5">
          <p className="mono-label opacity-70">Messages</p>
          <p className="font-mono text-xl font-bold tabular-nums">
            {stats.totalMessages.toLocaleString()}
          </p>
        </div>
        <div className="flex items-baseline justify-between border-b border-[#04140A]/30 py-2.5">
          <p className="mono-label opacity-70">Members</p>
          <p className="font-mono text-xl font-bold tabular-nums">
            {stats.members.length}
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b border-[#04140A]/30 py-2.5">
          <p className="mono-label shrink-0 opacity-70">Top sender</p>
          <p className="truncate text-base font-black uppercase tracking-tight">
            {stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "None"}
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-[#04140A] py-2.5">
          <p className="mono-label shrink-0 opacity-70">Moment</p>
          <p className="truncate text-base font-black uppercase tracking-tight">
            {cleanDisplayCopy(wrapped.momentOfTheYear.title)}
          </p>
        </div>
      </div>

      <div data-export-ignore="true" className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={status === "working"}
          className="mono-label bg-[#04140A] px-6 py-3.5 text-[#25D366] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
        >
          {status === "working" ? "Preparing…" : "↓ Download poster"}
        </button>
        {status === "error" && (
          <p className="font-mono text-xs">
            Couldn&apos;t generate the image. Try again or take a screenshot.
          </p>
        )}
      </div>

      <p className="mono-label opacity-70">
        WhatsApp Wrapped &middot; send it back to the chat
      </p>
    </CardShell>
  );
}
