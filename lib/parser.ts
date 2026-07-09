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

// Exact-match placeholders for a message that IS the media, with no caption.
const MEDIA_PLACEHOLDER =
  /^(image|video|audio|gif|sticker|document|contact card) omitted$|^<media omitted>$|^you received a view once message\..*$/i;

// Newer exports (media-included) reference attachments inline as
// "<attached: 00000012-STICKER-2026-06-08-19-09-52.webp>" instead of the
// "omitted" placeholders - sometimes alone, sometimes appended to a real
// caption ("nice pic <attached: photo.jpg>"). Stripped out separately so a
// caption survives instead of being nuked to "[media]".
const ATTACHED_REF = /<attached:\s*[^>]+>/gi;

const GROUP_NAME_PATTERNS = [
  /created group "(.+)"/i,
  /changed the subject to "(.+)"/i,
  /changed the subject from ".*" to "(.+)"/i,
];

// Some export versions attribute group-housekeeping events (icon/subject
// changes, member add/remove) to a "Sender: " line instead of the
// no-colon system-line format, e.g. "+61 478 808 918: +61 478 808 918
// changed this group's icon" or "Lior Hedges: Ben Green added Lior
// Hedges" - the real content is a system event, not something that
// sender said. Detected by cross-referencing the message text against
// the ACTUAL sender value (not a generic word match) to avoid false
// positives on real messages that happen to contain "added"/"left"/etc.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STANDALONE_SYSTEM_PATTERNS = [
  /^messages (and calls )?are end-to-end encrypted\b/i,
  /^your security code with .+ changed\.?$/i,
  /^missed (voice|video)? ?call/i,
];

function isSenderAttributedSystemEvent(sender: string, text: string): boolean {
  if (STANDALONE_SYSTEM_PATTERNS.some((p) => p.test(text))) return true;
  const s = escapeRegExp(sender.trim());
  const startsWithSender = new RegExp(
    `^${s}\\s+(changed (this group'?s icon|the group description|the subject|their phone number|to )|created group ".*"|left$|joined using this group'?s invite link)`,
    "i"
  );
  const endsWithSenderAfterVerb = new RegExp(`\\s(added|removed)\\s+${s}$`, "i");
  return startsWithSender.test(text) || endsWithSenderAfterVerb.test(text);
}

interface NormalizedMediaText {
  text: string;
  isMedia: boolean;
  mediaFilename?: string;
}

// Splits a placeholder/attachment marker out of raw message text. Pure
// media (no caption) -> isMedia true, text left as-is. Media with a real
// caption around it -> isMedia false, the "<attached: ...>" noise
// stripped so the caption is what actually reaches stats/Claude. Either
// way, if there was a real "<attached: filename>" reference (media-included
// exports only - the older "omitted" placeholders never carry a filename),
// it's captured so the UI can look up the actual file later.
function normalizeMediaText(rawText: string): NormalizedMediaText {
  const trimmed = rawText.trim();
  const attachedMatch = /<attached:\s*([^>]+)>/i.exec(trimmed);
  const mediaFilename = attachedMatch ? attachedMatch[1].trim() : undefined;

  if (MEDIA_PLACEHOLDER.test(trimmed)) {
    return { text: trimmed, isMedia: true, mediaFilename };
  }
  const withoutAttachedRefs = trimmed.replace(ATTACHED_REF, "").replace(/\s+/g, " ").trim();
  if (withoutAttachedRefs !== trimmed) {
    if (withoutAttachedRefs === "") {
      return { text: trimmed, isMedia: true, mediaFilename };
    }
    return { text: withoutAttachedRefs, isMedia: false, mediaFilename };
  }
  return { text: rawText, isMedia: false };
}

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
  text: string; // raw, not yet media-normalized - continuation lines still append here
}

export function parseWhatsAppChat(raw: string): ParseResult {
  const warnings: string[] = [];
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")); // strip invisible bidi/directional marks (wrap phone-number senders, @mentions)

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
    const rawText = senderSplit[2];

    if (isSenderAttributedSystemEvent(sender, rawText.trim())) {
      // A group-housekeeping event mis-formatted as "Sender: text" by this
      // export version - not something the sender actually said.
      const foundGroupName = extractGroupName(rawText);
      if (foundGroupName) groupName = foundGroupName;
      continue;
    }

    if (!seenMembers.has(sender)) {
      seenMembers.add(sender);
      memberOrder.push(sender);
    }

    dateStrings.push(dateStr);
    pending.push({ dateStr, timeStr, meridiem, sender, text: rawText });
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
    // Normalized here, after continuation lines are fully joined, so an
    // attachment reference on a later line of a multi-line message still
    // gets stripped (see PendingMessage.text comment).
    const { text, isMedia, mediaFilename } = normalizeMediaText(p.text);
    messages.push({
      timestamp: date,
      sender: p.sender,
      text,
      isMedia,
      mediaFilename,
    });
  }

  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return { messages, members: memberOrder, groupName, warnings };
}

// WhatsApp exports as "WhatsApp Chat with <Name>.txt" (or .zip). The
// transcript itself only reveals a name via a "created group" / "changed
// the subject to" system message - for a 1:1 chat there's no such message
// at all, and iOS zips often contain a genericly-named "_chat.txt" inside,
// so the export's own filename is the only place the name lives. Use as a
// fallback when the transcript-derived groupName comes back null.
// Observed real-world conventions: "WhatsApp Chat with <Name>.txt" and
// "WhatsApp Chat - <Name>.zip" (the latter from WhatsApp Desktop / some
// OS share-sheet renames).
const EXPORT_FILENAME_PATTERN = /^whatsapp chat (?:with|-)\s+(.+?)(?:\s*\(\d+\))?\.(txt|zip)$/i;

export function extractNameFromFilename(filename: string): string | null {
  const match = EXPORT_FILENAME_PATTERN.exec(filename.trim());
  return match ? match[1].trim() : null;
}
