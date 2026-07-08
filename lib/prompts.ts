import type { ChatMessage } from "./types";

const JSON_RULES = `Respond with ONLY raw JSON matching the schema below. No markdown code fences, no backticks, no commentary before or after, no trailing commas. Output must start with { and end with }.`;

const TONE_RULES = `Voice: museum-curator meets awards-show host. Affectionate roasting, never cruel — do not mock anyone's appearance, mental health, grief, illness, relationships, or other sensitive/personal topics. Be SPECIFIC: use real names, real dates, and real quotes from the transcript. Ban generic observations like "they talk a lot" or "the group is close" — every line must reference something that actually happened in the chat.`;

function formatMessages(messages: ChatMessage[], maxChars = 14000): string {
  const lines: string[] = [];
  let total = 0;
  for (const m of messages) {
    const time = m.timestamp.toISOString().slice(0, 16).replace("T", " ");
    const text = m.isMedia ? "[media]" : m.text.replace(/\n/g, " ");
    const line = `${time} ${m.sender}: ${text}`;
    if (total + line.length > maxChars) {
      lines.push(`...(${messages.length - lines.length} more messages truncated)`);
      break;
    }
    lines.push(line);
    total += line.length;
  }
  return lines.join("\n");
}

const EXTRACTION_SCHEMA = `{
  "chunkLabel": string,
  "moments": [{ "title": string, "date": string, "narrative": string (2-4 sentences, museum-plaque style), "peopleInvolved": string[], "evidenceQuotes": string[] (verbatim quotes from the transcript) }],
  "runningGags": [{ "name": string, "originDate": string, "originQuote": string (verbatim), "timesReferenced": number, "description": string }],
  "standoutQuotes": [{ "sender": string, "text": string (verbatim), "date": string, "context": string }],
  "personalityEvidence": [{ "member": string, "archetype": string (2-4 word noun phrase), "roastLine": string (one sentence), "evidenceQuotes": string[] (verbatim) }]
}`;

export function buildExtractionPrompt(chunkLabel: string, messages: ChatMessage[]): string {
  return `You are analyzing one segment (${chunkLabel}) of a WhatsApp group chat export to extract material for an end-of-year "Wrapped" recap. This segment is a fixed-size batch of consecutive messages, not necessarily a full calendar period — treat it as a contiguous slice of the conversation.

${TONE_RULES}

Find, if present in this segment's messages:
- Notable "moments": arguments, running bits that started, chaotic events, plans that went wrong. Only include real events with evidence — do not invent.
- Running gags: jokes, phrases, or bits that got referenced more than once.
- Standout quotes: the most unhinged, funny, or memorable single messages.
- Personality evidence: behavior patterns for specific members (e.g. always double-texts, always the voice of reason, always derails the topic).

If nothing notable happened in a category, return an empty array for it — do not fabricate content to fill it.

${JSON_RULES}

Schema:
${EXTRACTION_SCHEMA}

Transcript for ${chunkLabel}:
${formatMessages(messages)}`;
}

const SYNTHESIS_SCHEMA = `{
  "groupName": string,
  "momentOfTheYear": { "title": string, "date": string, "narrative": string, "peopleInvolved": string[], "evidenceQuotes": string[] },
  "runningGag": { "name": string, "originDate": string, "originQuote": string, "timesReferenced": number, "description": string },
  "personalities": [{ "member": string, "archetype": string, "roastLine": string, "evidenceQuotes": string[] }],
  "quoteOfTheYear": { "sender": string, "text": string, "date": string, "context": string },
  "closingSpeech": string (3-5 sentences, Oscars-style closing remarks addressed to the group)
}`;

export function buildSynthesisPrompt(
  groupName: string,
  members: string[],
  extractionsJson: string
): string {
  return `You are the head curator producing the final "Wrapped" recap for a WhatsApp group chat called "${groupName}". Below is JSON extracted separately from each segment of the chat (moments, running gags, standout quotes, personality evidence per member). Segments are consecutive fixed-size batches of messages in chronological order, not calendar months.

${TONE_RULES}

Your job:
1. Pick the single best "moment of the year" across the WHOLE chat — the most specific, evidence-backed, funniest or most dramatic one. Write its narrative like a museum exhibit plaque.
2. Pick the single best running gag across the whole chat (prefer ones referenced many times or that returned after a long absence).
3. Produce one personality card per member listed below (members: ${members.join(", ")}). Merge evidence across segments for the same person. If a member has thin evidence, still give them a plausible archetype grounded in whatever evidence exists — never leave a member out.
4. Pick the single most unhinged/memorable quote of the year.
5. Write a short Oscars-style closing speech from the curator to the group, referencing at least one specific person or moment by name.

${JSON_RULES}

Schema:
${SYNTHESIS_SCHEMA}

Segment extraction data:
${extractionsJson}`;
}

export const RETRY_REMINDER = `Your previous response was not valid JSON matching the required schema. Respond again with ONLY raw JSON — no markdown fences, no backticks, no commentary, no trailing commas.`;
