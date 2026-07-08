"use client";

import { useCallback, useRef, useState } from "react";

interface UploadProps {
  onFile: (file: File) => void;
  error?: string | null;
}

export default function Upload({ onFile, error }: UploadProps) {
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
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800 px-8 text-white">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
          WhatsApp Wrapped
        </p>
        <h1 className="text-4xl font-black leading-tight">
          Your group chat,
          <br />
          finally read properly.
        </h1>
        <p className="max-w-xs text-sm text-white/70">
          Upload your exported WhatsApp chat and get an animated recap of
          your year — moments, running gags, personalities, receipts.
        </p>
      </div>

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
        className={`flex w-full max-w-sm cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-white bg-white/20"
            : "border-white/40 bg-white/5 hover:bg-white/10"
        }`}
      >
        <span className="text-4xl">📄</span>
        <span className="text-sm font-semibold">
          Drop your chat export here
        </span>
        <span className="text-xs text-white/60">or tap to choose a .txt file</span>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {error && (
        <p className="max-w-sm text-center text-sm font-medium text-red-200">
          {error}
        </p>
      )}

      <p className="max-w-xs text-center text-[11px] text-white/40">
        Your chat is parsed in your browser. Only anonymised excerpts are
        sent to Claude for analysis — nothing is stored.
      </p>
    </div>
  );
}
