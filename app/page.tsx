"use client";

import { useState } from "react";
import Upload from "@/components/Upload";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import CardDeck from "@/components/CardDeck";
import TitleCard from "@/components/cards/TitleCard";
import YapperCard from "@/components/cards/YapperCard";
import GhostCard from "@/components/cards/GhostCard";
import MomentCard from "@/components/cards/MomentCard";
import RunningGagCard from "@/components/cards/RunningGagCard";
import PersonalityCard from "@/components/cards/PersonalityCard";
import QuoteCard from "@/components/cards/QuoteCard";
import FinaleCard from "@/components/cards/FinaleCard";
import ShareCard from "@/components/cards/ShareCard";
import { parseWhatsAppChat } from "@/lib/parser";
import { computeChatStats, chunkMessagesByMonth } from "@/lib/stats";
import { generateMockWrappedResult } from "@/lib/mockData";
import { extractMonth, synthesize } from "@/lib/analyzeClient";
import type { ChatStats, MonthlyExtraction, WrappedResult } from "@/lib/types";

type AppState =
  | { phase: "upload"; error: string | null }
  | { phase: "analyzing"; label: string }
  | { phase: "ready"; stats: ChatStats; wrapped: WrappedResult };

const MAX_MONTHS = 24;
const FUN_EMOJI = ["💀", "👀", "😭", "🔥", "🕵️"];

async function runRealAnalysis(
  groupName: string | null,
  members: string[],
  chunks: { monthLabel: string; messages: import("@/lib/types").ChatMessage[] }[],
  onProgress: (label: string) => void
): Promise<WrappedResult> {
  const recentChunks = chunks.slice(-MAX_MONTHS);
  const extractions: MonthlyExtraction[] = [];

  for (let i = 0; i < recentChunks.length; i++) {
    const chunk = recentChunks[i];
    const emoji = FUN_EMOJI[i % FUN_EMOJI.length];
    onProgress(`Reading ${chunk.monthLabel}... ${emoji}`);
    try {
      const extraction = await extractMonth(chunk.monthLabel, chunk.messages);
      extractions.push(extraction);
    } catch (err) {
      console.warn(`Skipping ${chunk.monthLabel}: analysis failed`, err);
    }
  }

  if (extractions.length === 0) {
    throw new Error("No months could be analyzed.");
  }

  onProgress("Tallying the receipts...");
  const resolvedGroupName = groupName ?? "The Group Chat";
  return synthesize(resolvedGroupName, members, extractions);
}

export default function Home() {
  const [state, setState] = useState<AppState>({ phase: "upload", error: null });

  async function handleFile(file: File) {
    setState({ phase: "analyzing", label: "Reading your chat..." });

    const text = await file.text();
    const parsed = parseWhatsAppChat(text);

    if (parsed.messages.length === 0) {
      setState({
        phase: "upload",
        error:
          parsed.warnings[0] ??
          "Couldn't read that file. Make sure it's a WhatsApp .txt export.",
      });
      return;
    }

    const stats = computeChatStats(parsed.messages);
    const chunks = chunkMessagesByMonth(parsed.messages);

    let wrapped: WrappedResult;
    try {
      wrapped = await runRealAnalysis(
        parsed.groupName,
        parsed.members,
        chunks,
        (label) => setState({ phase: "analyzing", label })
      );
    } catch (err) {
      console.warn("Falling back to mock analysis:", err);
      setState({ phase: "analyzing", label: "Writing the awards speech..." });
      wrapped = generateMockWrappedResult(parsed.groupName, stats);
    }

    setState({ phase: "ready", stats, wrapped });
  }

  if (state.phase === "upload") {
    return <Upload onFile={handleFile} error={state.error} />;
  }

  if (state.phase === "analyzing") {
    return <AnalyzingScreen label={state.label} />;
  }

  const { stats, wrapped } = state;
  const year = stats.dateRange.end.getFullYear();

  const cards = [
    <TitleCard
      key="title"
      groupName={wrapped.groupName}
      memberCount={stats.members.length}
      messageCount={stats.totalMessages}
      year={year}
    />,
    stats.yapper && (
      <YapperCard
        key="yapper"
        name={stats.yapper.name}
        messageCount={stats.yapper.messageCount}
      />
    ),
    stats.ghost && (
      <GhostCard
        key="ghost"
        name={stats.ghost.name}
        longestSilenceHours={stats.ghost.longestSilenceHours}
      />
    ),
    <MomentCard key="moment" moment={wrapped.momentOfTheYear} />,
    <RunningGagCard key="gag" gag={wrapped.runningGag} />,
    ...wrapped.personalities.map((p, i) => (
      <PersonalityCard key={`personality-${p.member}`} personality={p} index={i} />
    )),
    <QuoteCard key="quote" quote={wrapped.quoteOfTheYear} />,
    <FinaleCard
      key="finale"
      groupName={wrapped.groupName}
      closingSpeech={wrapped.closingSpeech}
    />,
    <ShareCard key="share" stats={stats} wrapped={wrapped} />,
  ].filter(Boolean) as React.ReactNode[];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setState({ phase: "upload", error: null })}
        aria-label="Start over"
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
      >
        ✕ Start over
      </button>
      <CardDeck cards={cards} />
    </div>
  );
}
