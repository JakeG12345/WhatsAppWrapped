"use client";

import { useState } from "react";
import Upload from "@/components/Upload";
import YearPicker from "@/components/YearPicker";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import CardDeck from "@/components/CardDeck";
import TitleCard from "@/components/cards/TitleCard";
import MostMessagesCard from "@/components/cards/MostMessagesCard";
import MostAirballsCard from "@/components/cards/MostAirballsCard";
import MemorableChatCard from "@/components/cards/MemorableChatCard";
import RunningGagCard from "@/components/cards/RunningGagCard";
import PersonalityCard from "@/components/cards/PersonalityCard";
import QuoteCard from "@/components/cards/QuoteCard";
import CameraRollCard from "@/components/cards/CameraRollCard";
import ShareCard from "@/components/cards/ShareCard";
import { parseWhatsAppChat, extractNameFromFilename } from "@/lib/parser";
import { computeChatStats, chunkMessagesByCount, summarizeByYear } from "@/lib/stats";
import { generateMockWrappedResult } from "@/lib/mockData";
import { extractChunk, synthesize } from "@/lib/analyzeClient";
import { extractChatTextFromZip, isZipFile } from "@/lib/zip";
import { buildMediaHighlights, revokeMediaHighlights, type MediaHighlight } from "@/lib/media";
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
  | { phase: "pickYear"; parsed: ParseResult; years: YearSummary[]; zipData: Uint8Array | null }
  | { phase: "analyzing"; stage: AnalyzingStage; totalMessages: number }
  | {
      phase: "ready";
      stats: ChatStats;
      wrapped: WrappedResult;
      mediaHighlights: MediaHighlight[];
    };

// Small chunks + high concurrency + a fast extraction model (Haiku, see
// app/api/analyze/route.ts) - this beat one giant no-batching call on
// wall-clock time, since chunk calls run in parallel instead of one call
// paying for the entire chat's worth of prefill serially.
//
// Chunk size scales with chat length instead of being fixed: a fixed size
// means long chats just produce more chunks, and MAX_CHUNKS capping them
// to the most recent N throws away coverage without bounding wall time
// (still MAX_CHUNKS / CONCURRENCY rounds either way). Scaling chunk size so
// the chunk *count* stays near TARGET_CHUNKS keeps both the call count and
// the round count roughly constant regardless of chat size.
const TARGET_CHUNKS = 16;
const MIN_CHUNK_SIZE = 150;
const MAX_CHUNK_SIZE = 800;
const MAX_CHUNKS = 24;
// >= MAX_CHUNKS so extraction is always exactly one parallel round, never
// several sequential batches - wall time is bounded by the single slowest
// chunk call, not (chunks / concurrency) rounds of them.
const CONCURRENCY = MAX_CHUNKS;

function dynamicChunkSize(messageCount: number): number {
  return Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, Math.ceil(messageCount / TARGET_CHUNKS)));
}

// Runs async work over `items` with at most `limit` in flight at once -
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
      `[runRealAnalysis] starting ${chunk.chunkLabel} - ${chunk.messages.length} messages`
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
        `[runRealAnalysis] (${completed}/${recentChunks.length}) FAILED ${chunk.chunkLabel} after ${Math.round(performance.now() - chunkStart)}ms - skipping`,
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

  async function startAnalysis(
    parsed: ParseResult,
    messages: ChatMessage[],
    zipData: Uint8Array | null
  ) {
    const totalMessages = messages.length;
    setState({ phase: "analyzing", stage: "reading", totalMessages });

    const members = Array.from(new Set(messages.map((m) => m.sender)));
    const stats = computeChatStats(messages);
    const chunks = chunkMessagesByCount(messages, dynamicChunkSize(messages.length));

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

    // Only possible when the upload was a zip with media included — a
    // plain .txt (or a zip with media excluded) yields an empty gallery,
    // and the card just doesn't render (see the deck-building code below).
    const mediaHighlights = buildMediaHighlights(messages, zipData);

    setState({ phase: "ready", stats, wrapped, mediaHighlights });
  }

  async function handleFile(file: File) {
    setState({ phase: "analyzing", stage: "reading", totalMessages: 0 });

    let text: string;
    let zipData: Uint8Array | null = null;
    try {
      if (isZipFile(file)) {
        const extracted = await extractChatTextFromZip(file);
        text = extracted.text;
        zipData = extracted.zipData;
      } else {
        text = await file.text();
      }
    } catch (err) {
      console.warn("Failed to read uploaded file:", err);
      setState({
        phase: "upload",
        error:
          "Couldn't read that zip - make sure it's the export WhatsApp gave you, with the chat .txt file inside.",
      });
      return;
    }

    const parsed = parseWhatsAppChat(text);

    if (parsed.messages.length === 0) {
      setState({
        phase: "upload",
        error:
          parsed.warnings[0] ??
          "Couldn't read that file. Make sure it's a WhatsApp .txt export (or the .zip WhatsApp gives you).",
      });
      return;
    }

    // The transcript only names the chat via a system message ("created
    // group" / "changed the subject to") - 1:1 chats have neither, and
    // iOS zips often contain a genericly-named "_chat.txt" inside. Fall
    // back to the name WhatsApp put in the export's own filename.
    if (!parsed.groupName) {
      parsed.groupName = extractNameFromFilename(file.name);
    }

    const years = summarizeByYear(parsed.messages);
    if (years.length <= 1) {
      await startAnalysis(parsed, parsed.messages, zipData);
      return;
    }

    setState({ phase: "pickYear", parsed, years, zipData });
  }

  function handleSelectYear(
    parsed: ParseResult,
    zipData: Uint8Array | null,
    selection: number | "all"
  ) {
    const messages =
      selection === "all"
        ? parsed.messages
        : parsed.messages.filter((m) => m.timestamp.getFullYear() === selection);
    startAnalysis(parsed, messages, zipData);
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
        onSelect={(selection) => handleSelectYear(state.parsed, state.zipData, selection)}
      />
    );
  }

  if (state.phase === "analyzing") {
    return <AnalyzingScreen stage={state.stage} totalMessages={state.totalMessages} />;
  }

  const { stats, wrapped, mediaHighlights } = state;
  const year = stats.dateRange.end.getFullYear();

  const cards = [
    <TitleCard
      key="title"
      groupName={wrapped.groupName}
      memberCount={stats.members.length}
      messageCount={stats.totalMessages}
      year={year}
    />,
    <MostMessagesCard
      key="most-messages"
      entries={stats.members.map((m) => ({ name: m.name, count: m.messageCount }))}
    />,
    <MostAirballsCard key="most-airballs" entries={stats.airballs} />,
    // Only present when the upload was a zip with media included — a plain
    // .txt export has no image bytes to show at all.
    mediaHighlights.length > 0 && (
      <CameraRollCard key="camera-roll" highlights={mediaHighlights} />
    ),
    <MemorableChatCard key="moment" moment={wrapped.momentOfTheYear} />,
    <RunningGagCard key="gag" gag={wrapped.runningGag} />,
    ...wrapped.personalities.map((p, i) => (
      <PersonalityCard key={`personality-${p.member}`} personality={p} index={i} />
    )),
    <QuoteCard key="quote" quote={wrapped.quoteOfTheYear} />,
    <ShareCard key="share" stats={stats} wrapped={wrapped} />,
  ].filter(Boolean);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          revokeMediaHighlights(mediaHighlights);
          setState({ phase: "upload", error: null });
        }}
        aria-label="Start over"
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.85rem)] z-30 rounded-full border border-[#2A3942] bg-[#202C33]/90 px-3 py-1.5 text-xs font-semibold text-[#E9EDEF] backdrop-blur-sm"
      >
        Reset
      </button>
      <CardDeck cards={cards} />
    </div>
  );
}
