"use client";

import { useState, type ReactNode } from "react";
import CardDeck from "@/components/CardDeck";
import MuseumExperience from "@/components/MuseumExperience";
import type { ChatStats, WrappedResult } from "@/lib/types";
import type { MediaHighlight } from "@/lib/media";
import { cleanDisplayCopy } from "@/lib/copy";

type Mode = "lobby" | "wrapped" | "museum";

interface ExperienceSwitcherProps {
  cards: ReactNode[];
  stats: ChatStats;
  wrapped: WrappedResult;
  mediaHighlights: MediaHighlight[];
  onReset: () => void;
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-[#00A884] text-[#06130D]"
          : "border border-[#2A3942] bg-[#202C33]/92 text-[#E9EDEF]"
      }`}
    >
      {children}
    </button>
  );
}

function TopNav({
  mode,
  setMode,
  onReset,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  onReset: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1.1rem)] z-50 flex items-center justify-between gap-2 px-3">
      <div className="pointer-events-auto flex gap-1 rounded-full border border-[#2A3942] bg-[#111B21]/88 p-1 shadow-lg backdrop-blur-md">
        <ModeButton active={mode === "lobby"} onClick={() => setMode("lobby")}>
          Lobby
        </ModeButton>
        <ModeButton active={mode === "wrapped"} onClick={() => setMode("wrapped")}>
          Story
        </ModeButton>
        <ModeButton active={mode === "museum"} onClick={() => setMode("museum")}>
          Museum
        </ModeButton>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="pointer-events-auto rounded-full border border-[#2A3942] bg-[#202C33]/92 px-3 py-2 text-xs font-semibold text-[#E9EDEF] shadow-lg backdrop-blur-md"
      >
        Reset
      </button>
    </div>
  );
}

function RecapLobby({
  stats,
  wrapped,
  onWrapped,
  onMuseum,
}: {
  stats: ChatStats;
  wrapped: WrappedResult;
  onWrapped: () => void;
  onMuseum: () => void;
}) {
  const groupName = cleanDisplayCopy(wrapped.groupName);
  const topSender = stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "None";
  const topMoment = cleanDisplayCopy(wrapped.momentOfTheYear.title);

  return (
    <div className="wa-screen flex h-dvh w-full flex-col items-center justify-center px-5 pb-7 pt-[calc(env(safe-area-inset-top)+5rem)] text-[#E9EDEF]">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="wa-panel overflow-hidden rounded-[2rem]">
          <div className="flex items-center gap-3 border-b border-[#2A3942] bg-[#202C33] px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884] text-sm font-black text-[#06130D]">
              WA
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{groupName}</p>
              <p className="text-xs text-[#8696A0]">
                {stats.dateRange.end.getFullYear()} archive ready
              </p>
            </div>
          </div>

          <div className="wa-wallpaper flex min-h-[48vh] flex-col justify-between gap-6 p-5">
            <div className="flex flex-col gap-3">
              <p className="wa-kicker">Recap Lobby</p>
              <h1 className="text-4xl font-semibold leading-tight">
                The chat has entered the archive.
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="wa-soft-panel rounded-2xl p-3">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCount(stats.totalMessages)}
                </p>
                <p className="text-xs text-[#8696A0]">messages</p>
              </div>
              <div className="wa-soft-panel rounded-2xl p-3">
                <p className="truncate text-lg font-semibold">{topSender}</p>
                <p className="text-xs text-[#8696A0]">top sender</p>
              </div>
              <div className="wa-soft-panel col-span-2 rounded-2xl p-3">
                <p className="truncate text-lg font-semibold">{topMoment}</p>
                <p className="text-xs text-[#8696A0]">featured exhibit</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onWrapped}
            className="wa-panel rounded-3xl p-4 text-left transition-transform active:scale-[0.98]"
          >
            <p className="wa-kicker">Story</p>
            <p className="mt-2 text-xl font-semibold">Wrapped Deck</p>
            <p className="mt-1 text-xs leading-5 text-[#8696A0]">
              Awards, quotes, stats
            </p>
          </button>

          <button
            type="button"
            onClick={onMuseum}
            className="rounded-3xl border border-[#00A884]/60 bg-[#003F34] p-4 text-left shadow-[0_18px_60px_rgba(0,168,132,0.18)] transition-transform active:scale-[0.98]"
          >
            <p className="wa-kicker">Museum</p>
            <p className="mt-2 text-xl font-semibold">Lore Tour</p>
            <p className="mt-1 text-xs leading-5 text-[#D9FDD3]">
              Rooms, receipts, photos
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExperienceSwitcher({
  cards,
  stats,
  wrapped,
  mediaHighlights,
  onReset,
}: ExperienceSwitcherProps) {
  const [mode, setMode] = useState<Mode>("lobby");

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0B141A]">
      <TopNav mode={mode} setMode={setMode} onReset={onReset} />
      {mode === "lobby" && (
        <RecapLobby
          stats={stats}
          wrapped={wrapped}
          onWrapped={() => setMode("wrapped")}
          onMuseum={() => setMode("museum")}
        />
      )}
      {mode === "wrapped" && <CardDeck cards={cards} />}
      {mode === "museum" && (
        <MuseumExperience
          stats={stats}
          wrapped={wrapped}
          mediaHighlights={mediaHighlights}
        />
      )}
    </div>
  );
}
