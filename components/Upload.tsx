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
    <div className="wa-screen flex h-dvh w-full flex-col items-center justify-center px-5 py-8 text-[#E9EDEF]">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="wa-panel overflow-hidden rounded-[2rem]">
          <div className="flex items-center gap-3 border-b border-[#2A3942] bg-[#202C33] px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884] text-sm font-black text-[#06130D]">
              WA
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">WhatsApp Wrapped</p>
              <p className="text-xs text-[#8696A0]">Private chat recap</p>
            </div>
          </div>

          <div className="wa-wallpaper flex flex-col gap-6 px-5 py-7">
            <div className="flex flex-col gap-3">
              <p className="wa-kicker">Upload export</p>
              <h1 className="text-3xl font-semibold leading-tight">
                Turn a chat export into its yearbook.
              </h1>
              <p className="text-sm leading-6 text-[#AEBAC1]">
                Moments, running jokes, quotes, and awards from the messages
                you choose to upload.
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
              className={`flex cursor-pointer flex-col gap-4 rounded-2xl border p-5 transition-colors ${
                isDragging
                  ? "border-[#25D366] bg-[#00A884]/20"
                  : "border-[#2A3942] bg-[#111B21]/90 hover:border-[#00A884]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00A884] text-xs font-black text-[#06130D]">
                  TXT
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    Choose your WhatsApp export
                  </span>
                  <span className="block text-xs text-[#8696A0]">
                    Supports .txt and the .zip WhatsApp gives you
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
          </div>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-center text-sm font-medium text-red-100">
            {error}
          </p>
        )}

        <p className="px-2 text-center text-xs leading-5 text-[#8696A0]">
          Parsed in your browser. Sent to Claude only for analysis. Never stored.
        </p>
      </div>
    </div>
  );
}
