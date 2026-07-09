"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { ChatStats, WrappedResult } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";

type SnapshotFormat = "mobile" | "desktop";

interface SnapshotProps {
  stats: ChatStats;
  wrapped: WrappedResult;
}

const POSTER_SIZE: Record<SnapshotFormat, { width: number; height: number }> = {
  mobile: { width: 1080, height: 1920 },
  desktop: { width: 1600, height: 1200 },
};

type FileShareNavigator = Navigator & {
  canShare?: (data: { files?: File[]; title?: string; text?: string }) => boolean;
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
};

function preferredFormat(): SnapshotFormat {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches
    ? "mobile"
    : "desktop";
}

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "chat";
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function PosterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#04140A]/20 bg-[#04140A]/10 p-6">
      <p className="truncate text-[42px] font-black leading-none tabular-nums">{value}</p>
      <p className="mt-3 font-mono text-[17px] font-bold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
    </div>
  );
}

export function SnapshotPoster({
  stats,
  wrapped,
  format,
}: SnapshotProps & { format: SnapshotFormat }) {
  const { width, height } = POSTER_SIZE[format];
  const portrait = format === "mobile";
  const groupName = cleanDisplayCopy(wrapped.groupName);
  const year = stats.dateRange.end.getFullYear();
  const topSender = stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "None";
  const momentTitle = cleanDisplayCopy(wrapped.momentOfTheYear.title);
  const gagName = cleanDisplayCopy(wrapped.runningGag.name);
  const quote = cleanDisplayCopy(wrapped.quoteOfTheYear.text);
  const quoteSender = cleanDisplayCopy(wrapped.quoteOfTheYear.sender);

  return (
    <div
      className="relative isolate overflow-hidden bg-[#25D366] text-[#04140A]"
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(4,20,10,0.25) 2px, transparent 2px), linear-gradient(90deg, rgba(4,20,10,0.25) 2px, transparent 2px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className={portrait ? "flex h-full flex-col p-[72px]" : "grid h-full grid-cols-[0.9fr_1.1fr] gap-12 p-[72px]"}>
        <section className="flex min-h-0 flex-col">
          <p className="font-mono text-[22px] font-bold uppercase tracking-[0.22em] opacity-70">
            {year} Wrapper
          </p>
          <h1 className={`${portrait ? "mt-12 text-[102px]" : "mt-10 text-[86px]"} text-balance font-black uppercase leading-[0.86] tracking-normal`}>
            {groupName}
          </h1>
          <p className="mt-7 font-mono text-[24px] font-bold uppercase tracking-[0.16em] opacity-70">
            Case closed
          </p>

          <div className={`${portrait ? "mt-16" : "mt-12"} grid grid-cols-2 gap-5`}>
            <PosterStat label="messages" value={stats.totalMessages.toLocaleString()} />
            <PosterStat label="members" value={stats.members.length.toLocaleString()} />
            <PosterStat label="top sender" value={topSender} />
            <PosterStat label="gag sightings" value={wrapped.runningGag.mentions.length.toString()} />
          </div>
        </section>

        <section className={`${portrait ? "mt-auto" : ""} flex min-h-0 flex-col justify-end gap-6`}>
          <div className="border-2 border-[#04140A] p-8">
            <p className="font-mono text-[18px] font-bold uppercase tracking-[0.18em] opacity-70">
              Featured exhibit
            </p>
            <p className="mt-5 text-[46px] font-black uppercase leading-[0.95] tracking-normal">
              {momentTitle}
            </p>
          </div>

          <div className="border-2 border-[#04140A] bg-[#04140A] p-8 text-[#25D366]">
            <p className="font-mono text-[18px] font-bold uppercase tracking-[0.18em] opacity-70">
              Running gag
            </p>
            <p className="mt-4 text-[38px] font-black uppercase leading-none tracking-normal">
              {gagName}
            </p>
          </div>

          <div className="ml-auto max-w-[88%] rounded-[42px] rounded-br-[10px] bg-[#005C4B] p-7 text-right text-[#E9EDE9] shadow-xl">
            <p className="text-[20px] font-bold text-[#D9FDD3]">{quoteSender}</p>
            <p className="mt-3 text-[34px] font-bold leading-[1.12]">{quote}</p>
          </div>

          <p className="text-center font-mono text-[18px] font-bold uppercase tracking-[0.18em] opacity-70">
            WhatsApp Wrapped
          </p>
        </section>
      </div>
    </div>
  );
}

function SnapshotPreview({ stats, wrapped }: SnapshotProps) {
  const groupName = cleanDisplayCopy(wrapped.groupName);
  return (
    <div className="relative mx-auto aspect-[9/16] max-h-[44vh] w-full max-w-[17rem] overflow-hidden border-2 border-[#04140A] bg-[#25D366] p-5 text-[#04140A] shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
        {stats.dateRange.end.getFullYear()} Wrapper
      </p>
      <h3 className="mt-6 text-4xl font-black uppercase leading-[0.9] tracking-normal">
        {groupName}
      </h3>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="border border-[#04140A]/30 p-3">
          <p className="text-xl font-black tabular-nums">{stats.totalMessages.toLocaleString()}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">messages</p>
        </div>
        <div className="border border-[#04140A]/30 p-3">
          <p className="text-xl font-black tabular-nums">{stats.members.length}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">members</p>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 border-2 border-[#04140A] p-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-70">
          Featured exhibit
        </p>
        <p className="mt-2 text-lg font-black uppercase leading-none">
          {cleanDisplayCopy(wrapped.momentOfTheYear.title)}
        </p>
      </div>
    </div>
  );
}

export default function SnapshotExportPanel({
  stats,
  wrapped,
  className = "",
}: SnapshotProps & { className?: string }) {
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function handleSave() {
    const format = preferredFormat();
    const target = format === "mobile" ? mobileRef.current : desktopRef.current;
    if (!target) return;

    setStatus("working");
    try {
      const dataUrl = await toPng(target, { cacheBust: true, pixelRatio: 1 });
      const filename = `${safeFileName(wrapped.groupName)}-wrapper.png`;

      if (format === "mobile") {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], filename, { type: "image/png" });
        const nav = navigator as FileShareNavigator;
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          await nav.share({
            files: [file],
            title: `${cleanDisplayCopy(wrapped.groupName)} Wrapper`,
            text: "Saved from the archive.",
          });
          setStatus("idle");
          return;
        }
      }

      downloadDataUrl(dataUrl, filename);
      setStatus("idle");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      console.error("Failed to generate wrapper poster:", err);
      setStatus("error");
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <SnapshotPreview stats={stats} wrapped={wrapped} />

      <button
        type="button"
        onClick={handleSave}
        disabled={status === "working"}
        className="mono-label w-full max-w-xs bg-[#04140A] px-5 py-3.5 text-[#25D366] shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "working" ? "Preparing..." : "Save poster"}
      </button>

      {status === "error" && (
        <p className="max-w-xs text-center font-mono text-xs leading-5 text-red-200">
          Couldn&apos;t make the poster. Try again.
        </p>
      )}

      <div aria-hidden="true" className="pointer-events-none fixed left-[-20000px] top-0">
        <div ref={mobileRef}>
          <SnapshotPoster stats={stats} wrapped={wrapped} format="mobile" />
        </div>
        <div ref={desktopRef}>
          <SnapshotPoster stats={stats} wrapped={wrapped} format="desktop" />
        </div>
      </div>
    </div>
  );
}
