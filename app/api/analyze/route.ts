import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionPrompt, buildSynthesisPrompt, RETRY_REMINDER } from "@/lib/prompts";
import type { ChatMessage, MonthlyExtraction, WrappedResult } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";

interface ChunkRequestBody {
  action: "extractMonth";
  monthLabel: string;
  messages: { sender: string; text: string; timestamp: string; isMedia: boolean }[];
}

interface SynthesizeRequestBody {
  action: "synthesize";
  groupName: string;
  members: string[];
  extractions: MonthlyExtraction[];
}

type RequestBody = ChunkRequestBody | SynthesizeRequestBody;

function isMonthlyExtraction(x: unknown): x is MonthlyExtraction {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.monthLabel === "string" &&
    Array.isArray(o.moments) &&
    Array.isArray(o.runningGags) &&
    Array.isArray(o.standoutQuotes) &&
    Array.isArray(o.personalityEvidence)
  );
}

function isWrappedResult(x: unknown): x is WrappedResult {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.groupName === "string" &&
    typeof o.momentOfTheYear === "object" &&
    typeof o.runningGag === "object" &&
    Array.isArray(o.personalities) &&
    typeof o.quoteOfTheYear === "object" &&
    typeof o.closingSpeech === "string"
  );
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

function log(label: string, ...args: unknown[]) {
  console.log(`[analyze] ${label}`, ...args);
}

function preview(text: string, max = 1200): string {
  return text.length > max ? `${text.slice(0, max)}…(${text.length} chars total)` : text;
}

async function callClaudeForJson<T>(
  client: Anthropic,
  label: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  validate: (x: unknown) => x is T,
  effort: "low" | "medium" | "high" = "medium"
): Promise<T> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

  log(`${label} → calling Claude`, {
    model: MODEL,
    maxTokens,
    effort,
    promptChars: userPrompt.length,
  });
  const t0 = Date.now();
  const first = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    output_config: { effort },
  });
  log(`${label} ← first response in ${Date.now() - t0}ms`, {
    stopReason: first.stop_reason,
    usage: first.usage,
  });
  const firstText = extractText(first);
  log(`${label} raw text (attempt 1):`, preview(firstText));
  const firstParsed = parseJson(firstText);
  if (validate(firstParsed)) {
    log(`${label} ✓ parsed + validated on attempt 1`);
    return firstParsed;
  }
  log(`${label} ✗ attempt 1 failed to parse/validate — retrying`, {
    parsedButInvalidShape: firstParsed !== null,
  });

  messages.push({ role: "assistant", content: firstText });
  messages.push({ role: "user", content: RETRY_REMINDER });

  const t1 = Date.now();
  const retry = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    output_config: { effort },
  });
  log(`${label} ← retry response in ${Date.now() - t1}ms`, {
    stopReason: retry.stop_reason,
    usage: retry.usage,
  });
  const retryText = extractText(retry);
  log(`${label} raw text (attempt 2):`, preview(retryText));
  const retryParsed = parseJson(retryText);
  if (validate(retryParsed)) {
    log(`${label} ✓ parsed + validated on attempt 2 (retry)`);
    return retryParsed;
  }

  log(`${label} ✗ attempt 2 also failed — giving up`, {
    parsedButInvalidShape: retryParsed !== null,
  });
  throw new Error("Claude did not return valid JSON matching the expected schema after retry.");
}

const SYSTEM_PROMPT =
  "You are a precise data-extraction and creative-writing assistant. You always respond with strictly valid JSON and nothing else.";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const client = new Anthropic();
  const requestStart = Date.now();

  try {
    if (body.action === "extractMonth") {
      const label = `extractMonth:${body.monthLabel}`;
      log(`${label} request received`, { messageCount: body.messages.length });
      const messages: ChatMessage[] = body.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        isMedia: m.isMedia,
        timestamp: new Date(m.timestamp),
      }));
      const prompt = buildExtractionPrompt(body.monthLabel, messages);
      const result = await callClaudeForJson(
        client,
        label,
        SYSTEM_PROMPT,
        prompt,
        4096,
        isMonthlyExtraction,
        "low"
      );
      log(`${label} done in ${Date.now() - requestStart}ms`, {
        moments: result.moments.length,
        runningGags: result.runningGags.length,
        standoutQuotes: result.standoutQuotes.length,
        personalityEvidence: result.personalityEvidence.length,
      });
      return Response.json({ result });
    }

    if (body.action === "synthesize") {
      const label = "synthesize";
      log(`${label} request received`, {
        groupName: body.groupName,
        members: body.members.length,
        extractions: body.extractions.length,
      });
      const prompt = buildSynthesisPrompt(
        body.groupName,
        body.members,
        JSON.stringify(body.extractions)
      );
      const result = await callClaudeForJson(
        client,
        label,
        SYSTEM_PROMPT,
        prompt,
        8192,
        isWrappedResult
      );
      log(`${label} done in ${Date.now() - requestStart}ms`);
      return Response.json({ result });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    log("✗ request failed", err instanceof Error ? err.stack ?? err.message : err);
    const message = err instanceof Error ? err.message : "Unknown error calling Claude.";
    return Response.json({ error: message }, { status: 502 });
  }
}
