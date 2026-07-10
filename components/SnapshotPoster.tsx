"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { ChatStats, WrappedResult } from "@/lib/types";
import { cleanDisplayCopy } from "@/lib/copy";

type SnapshotFormat = "mobile" | "desktop";

interface SnapshotProps {
  stats: ChatStats;
  wrapped: WrappedResult;
}

const MOBILE_QUERY = "(max-width: 767px), (pointer: coarse)";

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
  return window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop";
}

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "chat";
}

function clampText(value: string, max: number): string {
  const clean = cleanDisplayCopy(value).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function formatDuration(hours: number): string {
  if (hours >= 48) return `${Math.round(hours / 24)}d`;
  if (hours >= 1) return `${Math.round(hours)}h`;
  return `${Math.max(1, Math.round(hours * 60))}m`;
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

function PosterTile({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={dark ? "bg-[#04140A] p-6 text-[#25D366]" : "bg-[#25D366] p-6 text-[#04140A]"}>
      <p className="truncate text-[42px] font-black leading-none tabular-nums">{value}</p>
      <p className="mt-3 font-mono text-[16px] font-bold uppercase tracking-[0.16em] opacity-70">
        {label}
      </p>
    </div>
  );
}

function PosterBubble({
  sender,
  quote,
  compact = false,
}: {
  sender: string;
  quote: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`ml-auto max-w-[90%] rounded-[46px] rounded-br-[12px] bg-[#005C4B] text-right text-[#E9EDE9] shadow-[0_30px_70px_rgba(0,0,0,0.25)] ${
        compact ? "p-7" : "p-9"
      }`}
    >
      <p className="text-[21px] font-bold text-[#D9FDD3]">{sender}</p>
      <p className={`${compact ? "mt-3 text-[31px]" : "mt-4 text-[38px]"} font-bold leading-[1.1]`}>
        {quote}
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
  const year = stats.dateRange.end.getFullYear();
  const groupName = clampText(wrapped.groupName, portrait ? 44 : 38);
  const topSender = stats.yapper?.name ? clampText(stats.yapper.name, 20) : "None";
  const momentTitle = clampText(wrapped.momentOfTheYear.title, portrait ? 72 : 58);
  const gagName = clampText(wrapped.runningGag.name, portrait ? 46 : 34);
  const quote = clampText(wrapped.quoteOfTheYear.text, portrait ? 132 : 104);
  const quoteSender = clampText(wrapped.quoteOfTheYear.sender, 22);
  const silence = stats.longestSilence ? formatDuration(stats.longestSilence.hours) : "0h";
  const topEmoji = stats.topEmojisOverall[0]?.emoji ?? "WA";

  return (
    <div
      className="relative isolate overflow-hidden bg-[#0A0E0B] text-[#E9EDE9]"
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 -z-10 opacity-55"
        style={{
          backgroundColor: "#08100C",
          backgroundImage:
            "radial-gradient(circle at 18px 18px, rgba(37,211,102,0.18) 1px, transparent 1.4px), radial-gradient(circle at 42px 38px, rgba(255,255,255,0.08) 1px, transparent 1.4px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-10 bg-[#25D366]" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[#25D366]" />

      <div className={portrait ? "flex h-full flex-col p-[74px] pt-[94px]" : "grid h-full grid-cols-[0.92fr_1.08fr] gap-12 p-[78px] pt-[98px]"}>
        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b-2 border-[#25D366] pb-5">
            <p className="font-mono text-[22px] font-bold uppercase tracking-[0.2em] text-[#25D366]">
              {year} Wrapped
            </p>
            <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#25D366] text-[22px] font-black text-[#04140A]">
              {topEmoji}
            </div>
          </div>

          <h1
            className={`${portrait ? "mt-12 text-[108px]" : "mt-10 text-[92px]"} font-black uppercase leading-[0.82] tracking-normal text-[#E9EDE9]`}
            style={{ wordBreak: "break-word" }}
          >
            {groupName}
          </h1>

          <div className={`${portrait ? "mt-14" : "mt-10"} grid grid-cols-2 gap-5 text-[#04140A]`}>
            <PosterTile label="messages" value={stats.totalMessages.toLocaleString()} />
            <PosterTile label="members" value={stats.members.length.toLocaleString()} />
            <PosterTile label="top sender" value={topSender} dark />
            <PosterTile label="quiet spell" value={silence} />
          </div>

          {!portrait && (
            <div className="mt-auto border-2 border-[#25D366] p-8">
              <p className="font-mono text-[18px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
                Running gag
              </p>
              <p className="mt-4 text-[42px] font-black uppercase leading-none tracking-normal">
                {gagName}
              </p>
            </div>
          )}
        </section>

        <section className={`${portrait ? "mt-auto" : ""} flex min-h-0 flex-col justify-end gap-6`}>
          <div className="bg-[#25D366] p-8 text-[#04140A] shadow-[0_26px_80px_rgba(37,211,102,0.22)]">
            <p className="font-mono text-[18px] font-bold uppercase tracking-[0.18em] opacity-70">
              Moment of the year
            </p>
            <p className={`${portrait ? "mt-5 text-[58px]" : "mt-5 text-[52px]"} font-black uppercase leading-[0.92] tracking-normal`}>
              {momentTitle}
            </p>
          </div>

          <PosterBubble sender={quoteSender} quote={quote} compact={portrait} />

          {portrait && (
            <div className="border-2 border-[#25D366] p-7">
              <p className="font-mono text-[17px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
                Running gag
              </p>
              <p className="mt-4 text-[42px] font-black uppercase leading-none tracking-normal">
                {gagName}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t-2 border-[#25D366] pt-5">
            <p className="font-mono text-[18px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
              Case closed
            </p>
            <p className="font-mono text-[18px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
              WhatsApp Wrapped
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function SnapshotPreview({ stats, wrapped }: SnapshotProps) {
  const year = stats.dateRange.end.getFullYear();
  const groupName = clampText(wrapped.groupName, 32);
  const momentTitle = clampText(wrapped.momentOfTheYear.title, 42);

  return (
    <div className="relative mx-auto aspect-[9/16] max-h-[45vh] w-full max-w-[17rem] overflow-hidden border-2 border-[#25D366] bg-[#0A0E0B] p-5 text-[#E9EDE9] shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12px 12px, rgba(37,211,102,0.18) 1px, transparent 1.2px), radial-gradient(circle at 34px 30px, rgba(255,255,255,0.08) 1px, transparent 1.2px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#25D366]">
          {year} Wrapped
        </p>
        <h3 className="mt-5 text-4xl font-black uppercase leading-[0.86] tracking-normal">
          {groupName}
        </h3>

        <div className="mt-6 grid grid-cols-2 gap-2 text-[#04140A]">
          <div className="bg-[#25D366] p-3">
            <p className="text-xl font-black tabular-nums">{stats.totalMessages.toLocaleString()}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">messages</p>
          </div>
          <div className="bg-[#25D366] p-3">
            <p className="text-xl font-black tabular-nums">{stats.members.length}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">members</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 bg-[#25D366] p-3 text-[#04140A]">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] opacity-70">
          Moment of the year
        </p>
        <p className="mt-2 text-lg font-black uppercase leading-none">{momentTitle}</p>
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
  const [format, setFormat] = useState<SnapshotFormat>("desktop");

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setFormat(media.matches ? "mobile" : "desktop");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  async function handleSave() {
    const nextFormat = preferredFormat();
    const target = nextFormat === "mobile" ? mobileRef.current : desktopRef.current;
    if (!target) return;

    setStatus("working");
    try {
      const dataUrl = await toPng(target, { cacheBust: true, pixelRatio: 1 });
      const filename = `${safeFileName(wrapped.groupName)}-wrapped.png`;

      if (nextFormat === "mobile") {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], filename, { type: "image/png" });
        const nav = navigator as FileShareNavigator;
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          await nav.share({
            files: [file],
            title: `${cleanDisplayCopy(wrapped.groupName)} Wrapped`,
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
      console.error("Failed to generate wrapped poster:", err);
      setStatus("error");
    }
  }

  const idleLabel = format === "mobile" ? "Save image" : "Download PNG";

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <SnapshotPreview stats={stats} wrapped={wrapped} />

      <button
        type="button"
        onClick={handleSave}
        disabled={status === "working"}
        className="mono-label w-full max-w-xs bg-[#04140A] px-5 py-3.5 text-[#25D366] shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "working" ? "Preparing..." : idleLabel}
      </button>

      {status === "error" && (
        <p className="max-w-xs text-center font-mono text-xs leading-5 text-red-200">
          Couldn&apos;t make the image. Try again.
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
