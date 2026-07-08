"use client";

import { useCallback, useRef, useState } from "react";

interface UploadProps {
  onFile: (file: File) => void;
  error?: string | null;
  /** When set, shows a back button returning to the Archive District. */
  onBack?: () => void;
  /** Signed-in curator name; when null/undefined a sign-in link is shown. */
  userName?: string | null;
}

const MARQUEE_ITEMS = [
  "MOST MESSAGES",
  "LEFT ON READ",
  "QUOTE OF THE YEAR",
  "RUNNING GAGS",
  "PERSONALITY AWARDS",
  "THE RECEIPTS",
];

export default function Upload({ onFile, error, onBack, userName }: UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      onFile(file);
    },
    [onFile]
  );

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Masthead */}
      <header className="flex items-center justify-between border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:px-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mono-label text-muted transition-colors hover:text-foreground"
          >
            ← District
          </button>
        ) : (
          <p className="mono-label text-muted">WhatsApp Wrapped</p>
        )}
        <span className="flex items-center gap-4">
          {userName ? (
            <p className="mono-label text-primary">{userName}</p>
          ) : (
            <a
              href="/sign-in"
              className="mono-label border border-border px-2.5 py-1.5 text-muted transition-colors hover:border-primary hover:text-primary"
            >
              Sign in
            </a>
          )}
          <p className="mono-label text-muted">Vol. {new Date().getFullYear()}</p>
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-6 sm:px-6">
        {/* Headline block */}
        <div>
          <p className="mono-label text-primary">The annual report</p>
          <h1 className="mt-3 text-balance text-[13vw] font-black uppercase leading-[0.92] tracking-tight sm:text-6xl">
            Your chat,
            <br />
            on the{" "}
            <span className="bg-primary px-2 text-primary-ink">record.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Feed it a WhatsApp export. Get back the moments, running jokes,
            quotes, and awards your group chat earned this year.
          </p>
        </div>

        {/* Drop zone as an evidence ticket */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`group mt-8 flex cursor-pointer flex-col border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-surface hover:border-primary"
          }`}
        >
          <div className="flex items-center justify-between border-b border-dashed border-inherit px-4 py-2">
            <span className="mono-label text-muted">Exhibit A</span>
            <span className="mono-label text-muted">.txt / .zip</span>
          </div>
          <div className="flex items-center gap-4 px-4 py-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary font-mono text-xl font-bold text-primary-ink transition-transform group-hover:-rotate-3">
              ↑
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold uppercase tracking-wide">
                Submit the export
              </span>
              <span className="mt-0.5 block font-mono text-xs text-muted">
                tap to browse, or drop it here
              </span>
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.zip,text/plain,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 border-l-2 border-red-400 bg-red-950/40 px-3 py-2.5 font-mono text-xs leading-relaxed text-red-200"
          >
            {error}
          </p>
        )}

        <p className="mt-5 font-mono text-[10px] leading-relaxed text-muted">
          Parsed in your browser &middot; sent only for analysis &middot; never
          stored
        </p>
      </div>

      {/* Marquee footer strip */}
      <div
        aria-hidden="true"
        className="overflow-hidden border-t border-primary/40 bg-primary py-2 text-primary-ink"
      >
        <div className="marquee-track flex w-max whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {MARQUEE_ITEMS.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="mono-label px-5 py-1"
                >
                  {item} <span className="px-2">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
