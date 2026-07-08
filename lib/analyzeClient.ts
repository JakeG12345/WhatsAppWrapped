import type { ChatMessage, ChunkExtraction, WrappedResult } from "./types";

async function postAnalyze<T>(body: unknown): Promise<T> {
  const label =
    (body as { action?: string; chunkLabel?: string }).action === "extractChunk"
      ? `extractChunk:${(body as { chunkLabel?: string }).chunkLabel}`
      : "synthesize";
  const t0 = performance.now();
  const summary =
    (body as { action?: string; messages?: unknown[]; extractions?: unknown[] }).action ===
    "extractChunk"
      ? { messageCount: (body as { messages?: unknown[] }).messages?.length ?? 0 }
      : { extractionCount: (body as { extractions?: unknown[] }).extractions?.length ?? 0 };
  console.log(`[analyzeClient] → POST /api/analyze (${label})`, summary);
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const ms = Math.round(performance.now() - t0);
  if (!res.ok) {
    console.warn(`[analyzeClient] ✗ (${label}) failed after ${ms}ms — status ${res.status}`, data);
    throw new Error(data?.error ?? `Request failed with status ${res.status}`);
  }
  console.log(`[analyzeClient] ← (${label}) done in ${ms}ms`);
  return data.result as T;
}

export function extractChunk(
  chunkLabel: string,
  messages: ChatMessage[]
): Promise<ChunkExtraction> {
  return postAnalyze<ChunkExtraction>({
    action: "extractChunk",
    chunkLabel,
    messages: messages.map((m) => ({
      sender: m.sender,
      text: m.text,
      isMedia: m.isMedia,
      timestamp: m.timestamp.toISOString(),
    })),
  });
}

export function synthesize(
  groupName: string,
  members: string[],
  extractions: ChunkExtraction[]
): Promise<WrappedResult> {
  return postAnalyze<WrappedResult>({
    action: "synthesize",
    groupName,
    members,
    extractions,
  });
}
