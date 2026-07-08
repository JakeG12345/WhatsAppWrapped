import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionPrompt, buildSynthesisPrompt, RETRY_REMINDER } from "@/lib/prompts";
import type { ChatMessage, ChunkExtraction, WrappedResult } from "@/lib/types";

// Extraction is mechanical (find + label real events/quotes verbatim) and
// runs many times in parallel per request, so it's on Haiku — measured 4s
// vs 20-40s on Sonnet for the same chunk. Synthesis is the one genuinely
// creative call (the roast/curator voice) and runs once total, so it
// stays on Sonnet for quality.
const EXTRACTION_MODEL = "claude-haiku-4-5";
const SYNTHESIS_MODEL = "claude-sonnet-4-6";

interface ChunkRequestBody {
  action: "extractChunk";
  chunkLabel: string;
  messages: { sender: string; text: string; timestamp: string; isMedia: boolean }[];
}

interface SynthesizeRequestBody {
  action: "synthesize";
  groupName: string;
  members: string[];
  extractions: ChunkExtraction[];
}

type RequestBody = ChunkRequestBody | SynthesizeRequestBody;

function isChunkExtraction(x: unknown): x is ChunkExtraction {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.chunkLabel === "string" &&
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

async function callClaudeForJson<T>(
  client: Anthropic,
  label: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  validate: (x: unknown) => x is T,
  effort?: "low" | "medium" | "high"
): Promise<T> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  // Haiku 4.5 doesn't support the effort parameter — only include
  // output_config when a caller explicitly opts in (Sonnet calls).
  const outputConfig = effort ? { output_config: { effort } } : {};

  log(`${label} → calling Claude`, {
    model,
    maxTokens,
    effort: effort ?? "(unset)",
    promptChars: userPrompt.length,
  });
  const t0 = Date.now();
  const first = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    ...outputConfig,
  });
  log(`${label} ← first response in ${Date.now() - t0}ms`, {
    stopReason: first.stop_reason,
    usage: first.usage,
  });
  const firstText = extractText(first);
  log(`${label} received text (attempt 1)`, { chars: firstText.length });
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
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    ...outputConfig,
  });
  log(`${label} ← retry response in ${Date.now() - t1}ms`, {
    stopReason: retry.stop_reason,
    usage: retry.usage,
  });
  const retryText = extractText(retry);
  log(`${label} received text (attempt 2)`, { chars: retryText.length });
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
    if (body.action === "extractChunk") {
      const label = `extractChunk:${body.chunkLabel}`;
      log(`${label} request received`, { messageCount: body.messages.length });
      const messages: ChatMessage[] = body.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        isMedia: m.isMedia,
        timestamp: new Date(m.timestamp),
      }));
      const prompt = buildExtractionPrompt(body.chunkLabel, messages);
      const result = await callClaudeForJson(
        client,
        label,
        EXTRACTION_MODEL,
        SYSTEM_PROMPT,
        prompt,
        4096,
        isChunkExtraction
        // no effort param — Haiku 4.5 doesn't support output_config.effort
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
        SYNTHESIS_MODEL,
        SYSTEM_PROMPT,
        prompt,
        8192,
        isWrappedResult,
        "low"
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
