import type { ChatMessage, MonthlyExtraction, WrappedResult } from "./types";

async function postAnalyze<T>(body: unknown): Promise<T> {
  const label =
    (body as { action?: string; monthLabel?: string }).action === "extractMonth"
      ? `extractMonth:${(body as { monthLabel?: string }).monthLabel}`
      : "synthesize";
  const t0 = performance.now();
  console.log(`[analyzeClient] → POST /api/analyze (${label})`, body);
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
  console.log(`[analyzeClient] ← (${label}) done in ${ms}ms`, data.result);
  return data.result as T;
}

export function extractMonth(
  monthLabel: string,
  messages: ChatMessage[]
): Promise<MonthlyExtraction> {
  return postAnalyze<MonthlyExtraction>({
    action: "extractMonth",
    monthLabel,
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
  extractions: MonthlyExtraction[]
): Promise<WrappedResult> {
  return postAnalyze<WrappedResult>({
    action: "synthesize",
    groupName,
    members,
    extractions,
  });
}
