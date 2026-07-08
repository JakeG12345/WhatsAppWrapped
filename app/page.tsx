"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Upload from "@/components/Upload";
import YearPicker from "@/components/YearPicker";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import ExperienceSwitcher from "@/components/ExperienceSwitcher";
import DistrictExperience, { type DistrictSaveState } from "@/components/DistrictExperience";
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
import { buildMediaHighlights, revokeMediaHighlights } from "@/lib/media";
import {
  deserializeEntry,
  loadGuestDistrict,
  newEntryId,
  saveGuestDistrict,
  serializeEntry,
  type ArchiveEntry,
} from "@/lib/archive";
import {
  getSessionUser,
  loadDistrict,
  saveEntry,
  saveProgress,
  deleteEntry as deleteEntryAction,
} from "@/app/actions/district";
import type {
  ChatMessage,
  ChunkExtraction,
  ParseResult,
  WrappedResult,
  YearSummary,
} from "@/lib/types";

type AnalyzingStage = "reading" | "tallying" | "writing";

type AppState =
  | { phase: "district" }
  | { phase: "upload"; error: string | null }
  | { phase: "pickYear"; parsed: ParseResult; years: YearSummary[]; zipData: Uint8Array | null }
  | { phase: "analyzing"; stage: AnalyzingStage; totalMessages: number }
  | { phase: "viewing"; entryId: string };

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

  let completed = 0;

  const settled = await mapWithConcurrency(recentChunks, CONCURRENCY, async (chunk) => {
    try {
      const extraction = await extractChunk(chunk.chunkLabel, chunk.messages);
      completed++;
      return extraction;
    } catch (err) {
      completed++;
      console.warn(
        `[runRealAnalysis] (${completed}/${recentChunks.length}) FAILED ${chunk.chunkLabel} - skipping`,
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
  const [state, setState] = useState<AppState>({ phase: "district" });
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [saveState, setSaveState] = useState<DistrictSaveState>({ kind: "guest" });
  // Debounces museum progress writes to the server per entry.
  const progressTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // ---------------------------------------------------------------------
  // Hydration: guest entries from localStorage, then (if signed in) merge
  // with the server district. Local-only entries get pushed up; server
  // entries win on conflict since they may carry progress from elsewhere.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const guestEntries = loadGuestDistrict();

      let sessionUser: { id: string; name: string } | null = null;
      let serverEntries: ArchiveEntry[] | null = null;
      try {
        sessionUser = await getSessionUser();
        if (sessionUser) {
          const raw = await loadDistrict();
          serverEntries = raw ? raw.map(deserializeEntry) : [];
        }
      } catch (err) {
        console.warn("Could not reach the archive server - staying in guest mode.", err);
      }

      if (cancelled) return;

      if (sessionUser && serverEntries) {
        setUser(sessionUser);
        const serverIds = new Set(serverEntries.map((e) => e.id));
        const localOnly = guestEntries.filter((e) => !serverIds.has(e.id));
        const merged = [...serverEntries, ...localOnly];
        setEntries(merged);
        setSaveState({ kind: "saved", userName: sessionUser.name });
        // Push local-only entries up so the account owns them.
        for (const entry of localOnly) {
          saveEntry(serializeEntry(entry)).catch((err) =>
            console.warn("Failed to sync a local chat to your account:", err)
          );
        }
      } else {
        setEntries(guestEntries);
        setSaveState({ kind: "guest" });
      }
      setHydrated(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Guests keep their district in localStorage across visits.
  useEffect(() => {
    if (!hydrated) return;
    saveGuestDistrict(entries);
  }, [entries, hydrated]);

  const persistEntry = useCallback(
    (entry: ArchiveEntry) => {
      if (!user) return;
      setSaveState({ kind: "saving" });
      saveEntry(serializeEntry(entry))
        .then((res) => {
          setSaveState(
            res.ok
              ? { kind: "saved", userName: user.name }
              : { kind: "error", message: "Save failed - your session may have expired." }
          );
        })
        .catch(() => {
          setSaveState({ kind: "error", message: "Save failed - check your connection." });
        });
    },
    [user]
  );

  // -----------------------------------------------------------------------
  // Analysis pipeline (unchanged mechanics; now lands in the district).
  // -----------------------------------------------------------------------
  async function startAnalysis(
    parsed: ParseResult,
    messages: ChatMessage[],
    zipData: Uint8Array | null,
    year: number | null
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

    // Only possible when the upload was a zip with media included - a
    // plain .txt (or a zip with media excluded) yields an empty gallery.
    // Session-only: blob URLs are never persisted.
    const mediaHighlights = buildMediaHighlights(messages, zipData);

    const entry: ArchiveEntry = {
      id: newEntryId(),
      chatName: wrapped.groupName,
      year,
      stats,
      wrapped,
      mediaHighlights,
      progress: { discoveredWings: [], inspectedExhibits: [] },
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => [...prev, entry]);
    persistEntry(entry);
    setState({ phase: "viewing", entryId: entry.id });
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
      const onlyYear = years.length === 1 ? years[0].year : null;
      await startAnalysis(parsed, parsed.messages, zipData, onlyYear);
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
    startAnalysis(parsed, messages, zipData, selection === "all" ? null : selection);
  }

  // -----------------------------------------------------------------------
  // Museum progress: update local state immediately, debounce server writes.
  // -----------------------------------------------------------------------
  const handleMuseumProgress = useCallback(
    (entryId: string, visitedRooms: string[], inspected: string[]) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, progress: { discoveredWings: visitedRooms, inspectedExhibits: inspected } }
            : e
        )
      );

      if (!user) return;
      const timers = progressTimers.current;
      const existing = timers.get(entryId);
      if (existing) clearTimeout(existing);
      timers.set(
        entryId,
        setTimeout(() => {
          timers.delete(entryId);
          saveProgress(entryId, {
            discoveredWings: visitedRooms,
            inspectedExhibits: inspected,
          }).catch((err) => console.warn("Failed to save museum progress:", err));
        }, 1200)
      );
    },
    [user]
  );

  function handleDeleteEntry(entryId: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) revokeMediaHighlights(entry.mediaHighlights);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (user) {
      deleteEntryAction(entryId).catch((err) =>
        console.warn("Failed to delete the chat from your account:", err)
      );
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (state.phase === "upload" || (state.phase === "district" && hydrated && entries.length === 0)) {
    return (
      <Upload
        onFile={handleFile}
        error={state.phase === "upload" ? state.error : null}
        onBack={
          state.phase === "upload" && entries.length > 0
            ? () => setState({ phase: "district" })
            : undefined
        }
      />
    );
  }

  if (state.phase === "district") {
    if (!hydrated) {
      return (
        <main className="grain flex h-dvh items-center justify-center bg-background">
          <p className="mono-label text-muted">Opening the archive district&hellip;</p>
        </main>
      );
    }
    return (
      <DistrictExperience
        entries={entries}
        saveState={saveState}
        onEnterMuseum={(entry) => setState({ phase: "viewing", entryId: entry.id })}
        onAddChat={() => setState({ phase: "upload", error: null })}
        onSignIn={() => {
          window.location.href = "/sign-in";
        }}
        onDeleteEntry={handleDeleteEntry}
      />
    );
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

  const entry = entries.find((e) => e.id === state.entryId);
  if (!entry) {
    // Entry was deleted out from under the view - fall back to the district.
    setState({ phase: "district" });
    return null;
  }

  const { stats, wrapped, mediaHighlights } = entry;
  const year = entry.year ?? stats.dateRange.end.getFullYear();

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
    // Only present when the upload was a zip with media included - a plain
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
    <ExperienceSwitcher
      key={entry.id}
      cards={cards}
      stats={stats}
      wrapped={wrapped}
      mediaHighlights={mediaHighlights}
      exitLabel="District"
      museumProgress={entry.progress}
      onMuseumProgressChange={(visitedRooms, inspected) =>
        handleMuseumProgress(entry.id, visitedRooms, inspected)
      }
      onReset={() => setState({ phase: "district" })}
    />
  );
}
