import type {
  ChatMessage,
  ChatStats,
  DayCount,
  EmojiCount,
  HourCount,
  MemberStats,
  SilenceGap,
  YearSummary,
} from "./types";

const EMOJI_REGEX =
  /\p{Extended_Pictographic}(\uFE0F)?(\u200D\p{Extended_Pictographic}(\uFE0F)?)*/gu;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function extractEmojis(text: string): string[] {
  return text.match(EMOJI_REGEX) ?? [];
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function topN(counts: Map<string, number>, n: number): EmojiCount[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([emoji, count]) => ({ emoji, count }));
}

export function computeChatStats(messages: ChatMessage[]): ChatStats {
  if (messages.length === 0) {
    throw new Error("Cannot compute stats for an empty message list");
  }

  const hourCounts = new Array<number>(24).fill(0);
  const dayCounts = new Array<number>(7).fill(0);
  const emojiOverall = new Map<string, number>();

  const perMember = new Map<
    string,
    {
      messageCount: number;
      wordCount: number;
      mediaCount: number;
      emojis: Map<string, number>;
      timestamps: Date[];
      doubleTextCount: number;
    }
  >();

  let lastSender: string | null = null;

  for (const msg of messages) {
    hourCounts[msg.timestamp.getHours()]++;
    dayCounts[msg.timestamp.getDay()]++;

    if (!perMember.has(msg.sender)) {
      perMember.set(msg.sender, {
        messageCount: 0,
        wordCount: 0,
        mediaCount: 0,
        emojis: new Map(),
        timestamps: [],
        doubleTextCount: 0,
      });
    }
    const m = perMember.get(msg.sender)!;
    m.messageCount++;
    m.timestamps.push(msg.timestamp);
    if (msg.isMedia) {
      m.mediaCount++;
    } else {
      m.wordCount += countWords(msg.text);
      for (const emoji of extractEmojis(msg.text)) {
        emojiOverall.set(emoji, (emojiOverall.get(emoji) ?? 0) + 1);
        m.emojis.set(emoji, (m.emojis.get(emoji) ?? 0) + 1);
      }
    }

    if (lastSender === msg.sender) {
      m.doubleTextCount++;
    }
    lastSender = msg.sender;
  }

  let longestSilence: SilenceGap | null = null;
  for (let i = 1; i < messages.length; i++) {
    const hours =
      (messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime()) /
      3_600_000;
    if (!longestSilence || hours > longestSilence.hours) {
      longestSilence = {
        startAt: messages[i - 1].timestamp,
        endAt: messages[i].timestamp,
        hours,
        brokenBy: messages[i].sender,
      };
    }
  }

  // "Airball": a message nobody replied to for AIRBALL_GAP_HOURS+ - the
  // conversation just went quiet after it. Every member starts at 0 so
  // the full ranking (including zero-airball members) is available.
  const AIRBALL_GAP_HOURS = 2;
  const airballCounts = new Map<string, number>();
  for (const name of perMember.keys()) airballCounts.set(name, 0);
  for (let i = 0; i < messages.length - 1; i++) {
    const gapHours =
      (messages[i + 1].timestamp.getTime() - messages[i].timestamp.getTime()) /
      3_600_000;
    if (gapHours >= AIRBALL_GAP_HOURS) {
      const sender = messages[i].sender;
      airballCounts.set(sender, (airballCounts.get(sender) ?? 0) + 1);
    }
  }
  const airballs = Array.from(airballCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const members: MemberStats[] = Array.from(perMember.entries()).map(
    ([name, data]) => {
      let longestSilenceHours = 0;
      for (let i = 1; i < data.timestamps.length; i++) {
        const gap =
          (data.timestamps[i].getTime() - data.timestamps[i - 1].getTime()) /
          3_600_000;
        if (gap > longestSilenceHours) longestSilenceHours = gap;
      }
      return {
        name,
        messageCount: data.messageCount,
        wordCount: data.wordCount,
        mediaCount: data.mediaCount,
        topEmojis: topN(data.emojis, 3),
        doubleTextCount: data.doubleTextCount,
        longestSilenceHours,
      };
    }
  );
  members.sort((a, b) => b.messageCount - a.messageCount);

  const hourHistogram: HourCount[] = hourCounts.map((count, hour) => ({
    hour,
    count,
  }));
  const dayHistogram: DayCount[] = dayCounts.map((count, i) => ({
    day: DAY_NAMES[i],
    count,
  }));

  const busiestHour = hourHistogram.reduce((max, h) =>
    h.count > max.count ? h : max
  );
  const busiestDay = dayHistogram.reduce((max, d) =>
    d.count > max.count ? d : max
  );

  const yapperMember = members[0] ?? null;
  const doubleTexterMember = members.reduce<MemberStats | null>(
    (max, m) => (!max || m.doubleTextCount > max.doubleTextCount ? m : max),
    null
  );

  return {
    totalMessages: messages.length,
    totalWords: members.reduce((sum, m) => sum + m.wordCount, 0),
    totalMedia: members.reduce((sum, m) => sum + m.mediaCount, 0),
    dateRange: {
      start: messages[0].timestamp,
      end: messages[messages.length - 1].timestamp,
    },
    members,
    topEmojisOverall: topN(emojiOverall, 10),
    busiestHour,
    busiestDay,
    hourHistogram,
    dayHistogram,
    longestSilence,
    yapper: yapperMember
      ? { name: yapperMember.name, messageCount: yapperMember.messageCount }
      : null,
    doubleTexter: doubleTexterMember
      ? { name: doubleTexterMember.name, count: doubleTexterMember.doubleTextCount }
      : null,
    airballs,
  };
}

function formatChunkLabel(messages: ChatMessage[]): string {
  const start = messages[0].timestamp;
  const end = messages[messages.length - 1].timestamp;
  const full = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const short = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (start.toDateString() === end.toDateString()) return full(start);
  const startStr = start.getFullYear() === end.getFullYear() ? short(start) : full(start);
  return `${startStr} to ${full(end)}`;
}

// Splits messages into fixed-size batches rather than calendar months, so
// prompt size and Claude call latency stay consistent regardless of how
// bursty any given period of the chat was (a single frantic week could
// otherwise dwarf a whole quiet month in one request).
export function chunkMessagesByCount(
  messages: ChatMessage[],
  chunkSize = 300
): { chunkLabel: string; messages: ChatMessage[] }[] {
  const chunks: { chunkLabel: string; messages: ChatMessage[] }[] = [];
  for (let i = 0; i < messages.length; i += chunkSize) {
    const slice = messages.slice(i, i + chunkSize);
    chunks.push({ chunkLabel: formatChunkLabel(slice), messages: slice });
  }
  return chunks;
}

// Assumes `messages` is already sorted chronologically (parseWhatsAppChat
// guarantees this), so each year's bucket is chronological too.
export function summarizeByYear(messages: ChatMessage[]): YearSummary[] {
  const byYear = new Map<number, ChatMessage[]>();
  for (const msg of messages) {
    const year = msg.timestamp.getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(msg);
  }

  return Array.from(byYear.entries())
    .map(([year, msgs]) => ({
      year,
      messageCount: msgs.length,
      memberCount: new Set(msgs.map((m) => m.sender)).size,
      dateRange: { start: msgs[0].timestamp, end: msgs[msgs.length - 1].timestamp },
    }))
    .sort((a, b) => b.year - a.year);
}
