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

async function callClaudeForJson<T>(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  validate: (x: unknown) => x is T
): Promise<T> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

  const first = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  const firstText = extractText(first);
  const firstParsed = parseJson(firstText);
  if (validate(firstParsed)) return firstParsed;

  messages.push({ role: "assistant", content: firstText });
  messages.push({ role: "user", content: RETRY_REMINDER });

  const retry = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  const retryText = extractText(retry);
  const retryParsed = parseJson(retryText);
  if (validate(retryParsed)) return retryParsed;

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

  try {
    if (body.action === "extractMonth") {
      const messages: ChatMessage[] = body.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        isMedia: m.isMedia,
        timestamp: new Date(m.timestamp),
      }));
      const prompt = buildExtractionPrompt(body.monthLabel, messages);
      const result = await callClaudeForJson(
        client,
        SYSTEM_PROMPT,
        prompt,
        4096,
        isMonthlyExtraction
      );
      return Response.json({ result });
    }

    if (body.action === "synthesize") {
      const prompt = buildSynthesisPrompt(
        body.groupName,
        body.members,
        JSON.stringify(body.extractions)
      );
      const result = await callClaudeForJson(
        client,
        SYSTEM_PROMPT,
        prompt,
        8192,
        isWrappedResult
      );
      return Response.json({ result });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Claude.";
    return Response.json({ error: message }, { status: 502 });
  }
}
