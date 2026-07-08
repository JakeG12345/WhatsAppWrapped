import type { ChatMessage, MonthlyExtraction, WrappedResult } from "./types";

async function postAnalyze<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed with status ${res.status}`);
  }
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
