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
  /** Label for the exit button (defaults to "Reset"). */
  exitLabel?: string;
  /** Restore museum discovery progress (Archive District persistence). */
  museumProgress?: { discoveredWings: string[]; inspectedExhibits: string[] };
  /** Fired when museum discovery progress changes, for persistence. */
  onMuseumProgressChange?: (visitedRooms: string[], inspected: string[]) => void;
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
      className={`mono-label px-3 py-2 transition-colors ${
        active
          ? "bg-[#25D366] text-[#04140A]"
          : "text-[#7D8880] hover:text-[#E9EDE9]"
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
  exitLabel = "Reset",
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  onReset: () => void;
  exitLabel?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.9rem)] z-50 flex items-center justify-between gap-2 px-3">
      <div className="pointer-events-auto flex border border-[#242C25] bg-[#0A0E0B]/92 shadow-lg backdrop-blur-md">
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
        className="mono-label pointer-events-auto border border-[#242C25] bg-[#0A0E0B]/92 px-3 py-2 text-[#7D8880] shadow-lg backdrop-blur-md transition-colors hover:text-[#E9EDE9]"
      >
        {exitLabel}
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
  const year = stats.dateRange.end.getFullYear();

  return (
    <main className="grain relative flex h-dvh w-full flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] sm:px-6">
        {/* Masthead */}
        <div className="relative z-10">
          <p className="mono-label text-primary">Archive ready &middot; {year}</p>
          <h1 className="mt-2 text-balance text-[13vw] font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">
            {groupName}
          </h1>
        </div>

        {/* Docket */}
        <div className="relative z-10 mt-6 border-t border-border">
          <div className="flex items-baseline justify-between border-b border-border py-2.5">
            <p className="mono-label text-muted">Messages on file</p>
            <p className="font-mono text-lg font-bold tabular-nums">
              {stats.totalMessages.toLocaleString()}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
            <p className="mono-label shrink-0 text-muted">Top sender</p>
            <p className="truncate text-sm font-bold uppercase tracking-wide">
              {topSender}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
            <p className="mono-label shrink-0 text-muted">Featured exhibit</p>
            <p className="truncate text-sm font-bold uppercase tracking-wide">
              {topMoment}
            </p>
          </div>
        </div>

        {/* Two doors */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-px border border-border bg-border">
          <button
            type="button"
            onClick={onWrapped}
            className="group flex flex-col gap-8 bg-primary p-4 text-left text-primary-ink transition-opacity hover:opacity-90"
          >
            <span className="mono-label opacity-70">01 / Story</span>
            <span>
              <span className="block text-2xl font-black uppercase leading-none tracking-tight">
                Wrapped
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
              <span className="mono-label mt-2 block opacity-70">
                Awards &middot; quotes &middot; stats
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onMuseum}
            className="group flex flex-col gap-8 bg-background p-4 text-left transition-colors hover:bg-surface"
          >
            <span className="mono-label text-muted">02 / Museum</span>
            <span>
              <span className="block text-2xl font-black uppercase leading-none tracking-tight">
                Lore tour
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
              <span className="mono-label mt-2 block text-muted">
                Rooms &middot; receipts &middot; photos
              </span>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ExperienceSwitcher({
  cards,
  stats,
  wrapped,
  mediaHighlights,
  onReset,
  exitLabel,
  museumProgress,
  onMuseumProgressChange,
}: ExperienceSwitcherProps) {
  const [mode, setMode] = useState<Mode>("lobby");

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <TopNav mode={mode} setMode={setMode} onReset={onReset} exitLabel={exitLabel} />
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
          initialVisitedRooms={museumProgress?.discoveredWings}
          initialInspected={museumProgress?.inspectedExhibits}
          onProgressChange={onMuseumProgressChange}
        />
      )}
    </div>
  );
}
