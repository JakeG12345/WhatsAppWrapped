"use client";

import { useState } from "react";
import Upload from "@/components/Upload";
import YearPicker from "@/components/YearPicker";
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
import { computeChatStats, chunkMessagesByCount, summarizeByYear } from "@/lib/stats";
import { generateMockWrappedResult } from "@/lib/mockData";
import { extractChunk, synthesize } from "@/lib/analyzeClient";
import type {
  ChatMessage,
  ChatStats,
  ChunkExtraction,
  ParseResult,
  WrappedResult,
  YearSummary,
} from "@/lib/types";

type AnalyzingStage = "reading" | "tallying" | "writing";

type AppState =
  | { phase: "upload"; error: string | null }
  | { phase: "pickYear"; parsed: ParseResult; years: YearSummary[] }
  | { phase: "analyzing"; stage: AnalyzingStage; totalMessages: number }
  | { phase: "ready"; stats: ChatStats; wrapped: WrappedResult };

// Small chunks + high concurrency + a fast extraction model (Haiku, see
// app/api/analyze/route.ts) — this beat one giant no-batching call on
// wall-clock time, since chunk calls run in parallel instead of one call
// paying for the entire chat's worth of prefill serially.
const CHUNK_SIZE = 250;
const MAX_CHUNKS = 40;
const CONCURRENCY = 8;

// Runs async work over `items` with at most `limit` in flight at once —
// per-chunk Claude calls are independent, so running them one-at-a-time
// (as the original sequential loop did) multiplied wall-clock time by the
// number of chunks for no benefit.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function runRealAnalysis(
  groupName: string | null,
  members: string[],
  chunks: { chunkLabel: string; messages: ChatMessage[] }[],
  onStage: (stage: AnalyzingStage) => void
): Promise<WrappedResult> {
  const recentChunks = chunks.slice(-MAX_CHUNKS);

  console.log(
    `[runRealAnalysis] ${chunks.length} chunks total, analyzing most recent ${recentChunks.length} with concurrency ${CONCURRENCY}:`,
    recentChunks.map((c) => `${c.chunkLabel} (${c.messages.length} msgs)`)
  );

  let completed = 0;

  const settled = await mapWithConcurrency(recentChunks, CONCURRENCY, async (chunk) => {
    console.log(
      `[runRealAnalysis] starting ${chunk.chunkLabel} — ${chunk.messages.length} messages`
    );
    const chunkStart = performance.now();
    try {
      const extraction = await extractChunk(chunk.chunkLabel, chunk.messages);
      completed++;
      console.log(
        `[runRealAnalysis] (${completed}/${recentChunks.length}) finished ${chunk.chunkLabel} in ${Math.round(performance.now() - chunkStart)}ms`
      );
      return extraction;
    } catch (err) {
      completed++;
      console.warn(
        `[runRealAnalysis] (${completed}/${recentChunks.length}) FAILED ${chunk.chunkLabel} after ${Math.round(performance.now() - chunkStart)}ms — skipping`,
        err
      );
      return null;
    }
  });

  const extractions: ChunkExtraction[] = settled.filter(
    (x): x is ChunkExtraction => x !== null
  );

  if (extractions.length === 0) {
    throw new Error("No chunks could be analyzed.");
  }

  onStage("tallying");
  const resolvedGroupName = groupName ?? "The Group Chat";
  return synthesize(resolvedGroupName, members, extractions);
}

export default function Home() {
  const [state, setState] = useState<AppState>({ phase: "upload", error: null });

  async function startAnalysis(parsed: ParseResult, messages: ChatMessage[]) {
    const totalMessages = messages.length;
    setState({ phase: "analyzing", stage: "reading", totalMessages });

    const members = Array.from(new Set(messages.map((m) => m.sender)));
    const stats = computeChatStats(messages);
    const chunks = chunkMessagesByCount(messages, CHUNK_SIZE);

    let wrapped: WrappedResult;
    try {
      wrapped = await runRealAnalysis(parsed.groupName, members, chunks, (stage) =>
        setState({ phase: "analyzing", stage, totalMessages })
      );
    } catch (err) {
      console.warn("Falling back to mock analysis:", err);
      setState({ phase: "analyzing", stage: "writing", totalMessages });
      wrapped = generateMockWrappedResult(parsed.groupName, stats);
    }

    setState({ phase: "ready", stats, wrapped });
  }

  async function handleFile(file: File) {
    setState({ phase: "analyzing", stage: "reading", totalMessages: 0 });

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

    const years = summarizeByYear(parsed.messages);
    if (years.length <= 1) {
      await startAnalysis(parsed, parsed.messages);
      return;
    }

    setState({ phase: "pickYear", parsed, years });
  }

  function handleSelectYear(parsed: ParseResult, selection: number | "all") {
    const messages =
      selection === "all"
        ? parsed.messages
        : parsed.messages.filter((m) => m.timestamp.getFullYear() === selection);
    startAnalysis(parsed, messages);
  }

  if (state.phase === "upload") {
    return <Upload onFile={handleFile} error={state.error} />;
  }

  if (state.phase === "pickYear") {
    return (
      <YearPicker
        years={state.years}
        totalMessageCount={state.parsed.messages.length}
        totalMemberCount={state.parsed.members.length}
        onSelect={(selection) => handleSelectYear(state.parsed, selection)}
      />
    );
  }

  if (state.phase === "analyzing") {
    return <AnalyzingScreen stage={state.stage} totalMessages={state.totalMessages} />;
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
