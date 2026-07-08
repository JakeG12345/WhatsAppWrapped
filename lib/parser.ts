import type { ChatMessage, ParseResult } from "./types";

// WhatsApp iOS export: [12/3/26, 9:41:12 PM] Name: message
const IOS_HEADER =
  /^\[(\d{1,2}[./]\d{1,2}[./]\d{2,4}),\s?(\d{1,2}:\d{2}(?::\d{2})?)\s?([AaPp]\.?[Mm]\.?)?\]\s(.*)$/;

// WhatsApp Android export: 12/3/26, 9:41 PM - Name: message
const ANDROID_HEADER =
  /^(\d{1,2}[./]\d{1,2}[./]\d{2,4}),\s?(\d{1,2}:\d{2}(?::\d{2})?)\s?([AaPp]\.?[Mm]\.?)?\s-\s(.*)$/;

// A real chat message line has "Sender: text" after the header. Anything
// without that colon-delimited sender is a system/notice line (joins,
// leaves, encryption notice, subject changes, etc).
const SENDER_SPLIT = /^([^:\n]{1,64}?):\s(.*)$/;

const MEDIA_PLACEHOLDER =
  /^(image|video|audio|gif|sticker|document|contact card) omitted$|^<media omitted>$/i;

const GROUP_NAME_PATTERNS = [
  /created group "(.+)"/i,
  /changed the subject to "(.+)"/i,
  /changed the subject from ".*" to "(.+)"/i,
];

interface RawHeaderMatch {
  dateStr: string;
  timeStr: string;
  meridiem: string | undefined;
  rest: string;
}

function matchHeader(line: string): RawHeaderMatch | null {
  const ios = IOS_HEADER.exec(line);
  if (ios) {
    return { dateStr: ios[1], timeStr: ios[2], meridiem: ios[3], rest: ios[4] };
  }
  const android = ANDROID_HEADER.exec(line);
  if (android) {
    return {
      dateStr: android[1],
      timeStr: android[2],
      meridiem: android[3],
      rest: android[4],
    };
  }
  return null;
}

type DateFormat = "DMY" | "MDY";

function detectDateFormat(dateStrings: string[]): DateFormat {
  for (const d of dateStrings) {
    const [a, b] = d.split(/[./]/).map((n) => parseInt(n, 10));
    if (a > 12) return "DMY";
    if (b > 12) return "MDY";
  }
  return "DMY"; // most common default for non-US exports; ambiguous otherwise
}

function buildDate(
  dateStr: string,
  timeStr: string,
  meridiem: string | undefined,
  format: DateFormat
): Date | null {
  const parts = dateStr.split(/[./]/).map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [a, b, cRaw] = parts;
  const day = format === "DMY" ? a : b;
  const month = format === "DMY" ? b : a;
  const year = cRaw < 100 ? 2000 + cRaw : cRaw;

  const timeParts = timeStr.split(":").map((n) => parseInt(n, 10));
  let hour = timeParts[0];
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? 0;

  if (meridiem) {
    const isPM = meridiem.toLowerCase().startsWith("p");
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  }

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function extractGroupName(rest: string): string | null {
  for (const pattern of GROUP_NAME_PATTERNS) {
    const m = pattern.exec(rest);
    if (m) return m[1];
  }
  return null;
}

interface PendingMessage {
  dateStr: string;
  timeStr: string;
  meridiem: string | undefined;
  sender: string;
  text: string;
  isMedia: boolean;
}

export function parseWhatsAppChat(raw: string): ParseResult {
  const warnings: string[] = [];
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[\u200E\u200F]/g, "")); // strip invisible bidi marks

  const pending: PendingMessage[] = [];
  const dateStrings: string[] = [];
  let groupName: string | null = null;
  const memberOrder: string[] = [];
  const seenMembers = new Set<string>();

  for (const line of lines) {
    if (line.trim() === "") continue;

    const header = matchHeader(line);
    if (!header) {
      // Continuation of a multi-line message, if we have one to attach to.
      if (pending.length > 0) {
        pending[pending.length - 1].text += "\n" + line;
      }
      continue;
    }

    const { dateStr, timeStr, meridiem, rest } = header;
    const senderSplit = SENDER_SPLIT.exec(rest);

    if (!senderSplit) {
      // System/notice line: no "Sender: " prefix.
      const foundGroupName = extractGroupName(rest);
      if (foundGroupName) groupName = foundGroupName;
      continue;
    }

    const sender = senderSplit[1].trim();
    let text = senderSplit[2];
    const isMedia = MEDIA_PLACEHOLDER.test(text.trim());
    if (isMedia) text = text.trim();

    if (!seenMembers.has(sender)) {
      seenMembers.add(sender);
      memberOrder.push(sender);
    }

    dateStrings.push(dateStr);
    pending.push({ dateStr, timeStr, meridiem, sender, text, isMedia });
  }

  if (pending.length === 0) {
    warnings.push(
      "No messages could be parsed. Check that this is a WhatsApp .txt export."
    );
    return { messages: [], members: [], groupName, warnings };
  }

  const format = detectDateFormat(dateStrings);
  const messages: ChatMessage[] = [];

  for (const p of pending) {
    const date = buildDate(p.dateStr, p.timeStr, p.meridiem, format);
    if (!date) {
      warnings.push(`Could not parse date/time: "${p.dateStr} ${p.timeStr}"`);
      continue;
    }
    messages.push({
      timestamp: date,
      sender: p.sender,
      text: p.text,
      isMedia: p.isMedia,
    });
  }

  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return { messages, members: memberOrder, groupName, warnings };
}
