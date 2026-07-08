"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Step-by-step guide for exporting a WhatsApp chat, rendered as an
 * editorial "procedure record". Each step ships with a stylized,
 * CSS-drawn WhatsApp UI vignette - no screenshots needed.
 */

type Platform = "ios" | "android" | "desktop";

/* ---------- Mini WhatsApp UI vignettes (pure CSS, no images) ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mx-auto w-full max-w-[240px] select-none border border-[#2A3530] bg-[#0B141A] font-sans shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
    >
      {children}
    </div>
  );
}

function WaChatHeader({ highlight }: { highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-2 ${
        highlight ? "bg-[#25D366]/15 outline outline-1 outline-[#25D366]" : "bg-[#1F2C34]"
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-[9px] font-bold text-[#062E1C]">
        TL
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-semibold text-[#E9EDEF]">
          The Lads
        </span>
        <span className="block text-[8px] text-[#8696A0]">
          tap here for group info
        </span>
      </span>
      <span className="text-[10px] tracking-widest text-[#8696A0]">⋮</span>
    </div>
  );
}

function VignetteOpenChat({ platform }: { platform: Platform }) {
  return (
    <PhoneFrame>
      <WaChatHeader highlight={platform === "ios"} />
      <div className="flex flex-col gap-1.5 p-2.5">
        <span className="w-3/4 rounded-md rounded-tl-none bg-[#1F2C34] px-2 py-1 text-[8px] text-[#E9EDEF]">
          who is bringing the speaker
        </span>
        <span className="ml-auto w-2/3 rounded-md rounded-tr-none bg-[#005C4B] px-2 py-1 text-[8px] text-[#E9EDEF]">
          new lore just dropped
        </span>
        <span className="w-1/2 rounded-md rounded-tl-none bg-[#1F2C34] px-2 py-1 text-[8px] text-[#E9EDEF]">
          LOOOL
        </span>
      </div>
      {platform === "android" && (
        <div className="border-t border-[#2A3530] px-2.5 py-1.5">
          <span className="mono-label text-[8px] text-[#25D366]">
            TAP ⋮ IN THE TOP RIGHT
          </span>
        </div>
      )}
    </PhoneFrame>
  );
}

function VignetteMenu({ platform }: { platform: Platform }) {
  const rows =
    platform === "ios"
      ? ["Media, links, and docs", "Starred messages", "Export chat"]
      : ["Group info", "More  ›", "Export chat"];
  return (
    <PhoneFrame>
      <WaChatHeader />
      <div className="p-2.5">
        <div className="border border-[#2A3530] bg-[#111B21]">
          {rows.map((row) => (
            <div
              key={row}
              className={`px-2.5 py-2 text-[9px] ${
                row === "Export chat"
                  ? "bg-[#25D366]/15 font-semibold text-[#25D366] outline outline-1 outline-[#25D366]"
                  : "border-b border-[#2A3530] text-[#E9EDEF]"
              }`}
            >
              {row}
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

function VignetteMediaChoice() {
  return (
    <PhoneFrame>
      <div className="p-2.5">
        <p className="px-1 pb-2 text-center text-[9px] text-[#8696A0]">
          Attaching media generates a larger file
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="bg-[#25D366]/15 px-2.5 py-2 text-center text-[9px] font-semibold text-[#25D366] outline outline-1 outline-[#25D366]">
            Without media
          </span>
          <span className="border border-[#2A3530] bg-[#111B21] px-2.5 py-2 text-center text-[9px] text-[#E9EDEF]">
            Attach media
          </span>
        </div>
        <p className="px-1 pt-2 text-center text-[8px] leading-relaxed text-[#8696A0]">
          either works - media unlocks the photo hall
        </p>
      </div>
    </PhoneFrame>
  );
}

function VignetteShare() {
  return (
    <PhoneFrame>
      <div className="p-2.5">
        <div className="flex items-center gap-2 border border-[#2A3530] bg-[#111B21] px-2.5 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#25D366] font-mono text-[9px] font-bold text-[#062E1C]">
            .zip
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[9px] font-semibold text-[#E9EDEF]">
              WhatsApp Chat - The Lads
            </span>
            <span className="block text-[8px] text-[#8696A0]">
              save to Files / Drive, or send to yourself
            </span>
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {["Files", "Drive", "Mail", "..."].map((app) => (
            <span
              key={app}
              className={`py-1.5 text-center text-[8px] ${
                app === "Files"
                  ? "bg-[#25D366]/15 font-semibold text-[#25D366] outline outline-1 outline-[#25D366]"
                  : "border border-[#2A3530] text-[#8696A0]"
              }`}
            >
              {app}
            </span>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------------------- Desktop vignettes (CSS-drawn) ---------------------- */

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mx-auto w-full max-w-[240px] select-none border border-[#2A3530] bg-[#0B141A] font-sans shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-1 border-b border-[#2A3530] bg-[#1F2C34] px-2 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#EF798A]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#FFA000]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
      </div>
      {children}
    </div>
  );
}

function VignetteDesktopNoExport() {
  return (
    <DesktopFrame>
      <div className="p-2.5">
        <div className="border border-[#2A3530] bg-[#111B21]">
          {["Group info", "Select messages", "Close chat"].map((row) => (
            <div
              key={row}
              className="border-b border-[#2A3530] px-2.5 py-2 text-[9px] text-[#E9EDEF] last:border-b-0"
            >
              {row}
            </div>
          ))}
        </div>
        <p className="px-1 pt-2 text-center text-[8px] leading-relaxed text-[#8696A0]">
          no Export chat here - it lives on your phone
        </p>
      </div>
    </DesktopFrame>
  );
}

function VignetteDesktopInbox() {
  return (
    <DesktopFrame>
      <div className="p-2.5">
        <div className="flex items-center gap-2 bg-[#25D366]/15 px-2.5 py-2 outline outline-1 outline-[#25D366]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#25D366] font-mono text-[9px] font-bold text-[#062E1C]">
            .zip
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[9px] font-semibold text-[#25D366]">
              WhatsApp Chat - The Lads
            </span>
            <span className="block text-[8px] text-[#8696A0]">
              me · just now · Download
            </span>
          </span>
        </div>
        <div className="mt-1.5 border border-[#2A3530] bg-[#111B21] px-2.5 py-2 text-[9px] text-[#8696A0]">
          Weekly five-a-side invoice
        </div>
      </div>
    </DesktopFrame>
  );
}

function VignetteDesktopDrop() {
  return (
    <DesktopFrame>
      <div className="p-2.5">
        <div className="flex flex-col items-center gap-1.5 border-2 border-dashed border-[#25D366] bg-[#25D366]/10 px-2.5 py-4">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#25D366]">
            Exhibit A
          </span>
          <span className="text-[8px] text-[#8696A0]">
            drop the .zip / .txt here
          </span>
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ------------------------------ Steps data ------------------------------ */

function getSteps(platform: Platform) {
  if (platform === "desktop") {
    return [
      {
        title: "Export happens on your phone",
        body: "WhatsApp Web and the desktop app don't offer Export chat - the option only exists in the phone app. Grab your phone for the export itself.",
        vignette: <VignetteDesktopNoExport />,
      },
      {
        title: "Export on the phone",
        body: "On your phone: open the chat, find Export chat (group info on iPhone, three-dot menu then More on Android), and pick a media option.",
        vignette: <VignetteMenu platform="ios" />,
      },
      {
        title: "Send it to this computer",
        body: "Share the export to yourself - email it, save it to Drive or iCloud, or message it to your own number - then download it on this computer.",
        vignette: <VignetteDesktopInbox />,
      },
      {
        title: "Drop it into Exhibit A",
        body: "Come back to this tab and drag the .zip or .txt straight onto the drop zone, or click it to browse for the file.",
        vignette: <VignetteDesktopDrop />,
      },
    ];
  }

  return [
    {
      title: "Open the group chat",
      body:
        platform === "ios"
          ? "In WhatsApp, open the chat you want wrapped, then tap the group name at the top to open its info page."
          : "In WhatsApp, open the chat you want wrapped, then tap the three dots in the top-right corner.",
      vignette: <VignetteOpenChat platform={platform} />,
    },
    {
      title: "Find Export chat",
      body:
        platform === "ios"
          ? "Scroll to the bottom of the group info page and tap Export chat."
          : "In the menu, tap More, then Export chat.",
      vignette: <VignetteMenu platform={platform} />,
    },
    {
      title: "Choose media option",
      body: "Without media is faster and works fully. Attach media if you want the museum's photo hall - the wrapped works either way.",
      vignette: <VignetteMediaChoice />,
    },
    {
      title: "Get it to this device",
      body: "Save the export to Files or Drive, or send it to yourself. Then come back here and drop the .zip or .txt into Exhibit A.",
      vignette: <VignetteShare />,
    },
  ];
}

/* ------------------------------- The sheet ------------------------------ */

export default function ExportTutorial({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform>("ios");
  const closeRef = useRef<HTMLButtonElement>(null);
  const steps = getSteps(platform);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to export a WhatsApp chat"
      className="fixed inset-0 z-50 flex justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-lg flex-col border-x border-border bg-background text-foreground">
        {/* Sheet masthead */}
        <div className="flex items-center justify-between border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:px-6">
          <p className="mono-label text-primary">Procedure 01 — The export</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="mono-label border border-border px-2.5 py-1.5 text-muted transition-colors hover:border-primary hover:text-primary"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <h2 className="text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight">
            Getting the{" "}
            <span className="bg-primary px-1.5 text-primary-ink">evidence.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {platform === "desktop"
              ? "WhatsApp can export any chat as a text file. The export starts on your phone, then lands here."
              : "WhatsApp can export any chat as a text file. Four steps, done on your phone."}
          </p>

          {/* Platform toggle */}
          <div className="mt-5 flex w-max border border-border" role="tablist" aria-label="Device platform">
            {(["ios", "android", "desktop"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={platform === p}
                onClick={() => setPlatform(p)}
                className={`mono-label px-4 py-2 transition-colors ${
                  platform === p
                    ? "bg-primary text-primary-ink"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {p === "ios" ? "iPhone" : p === "android" ? "Android" : "Desktop"}
              </button>
            ))}
          </div>

          {/* Steps */}
          <ol className="mt-6 flex flex-col gap-6">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-1 gap-4 border border-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="mono-label text-muted">
                    Step 0{i + 1} / 04
                  </p>
                  <h3 className="mt-1.5 text-lg font-black uppercase tracking-wide">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
                <div className="w-full sm:w-[200px]">{step.vignette}</div>
              </li>
            ))}
          </ol>

          {/* Footnotes */}
          <div className="mt-6 border-t border-border pt-4">
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              Group chats over 100,000 messages export the most recent
              messages only &middot; exports include messages, not deleted
              ones &middot; your file is parsed in your browser
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full bg-primary px-4 py-3.5 text-center text-sm font-black uppercase tracking-widest text-primary-ink transition-transform hover:-translate-y-0.5"
          >
            Got it — submit the export ↑
          </button>
        </div>
      </div>
    </div>
  );
}
