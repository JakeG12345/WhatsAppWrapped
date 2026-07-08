// Core domain types shared across the parser, stats engine, API route, and UI.

export interface ChatMessage {
  timestamp: Date;
  sender: string;
  text: string;
  isMedia: boolean;
  // Filename from a "<attached: X>" reference, if this message had one and
  // the export zip included media — lets the UI look up the real image.
  mediaFilename?: string;
}

export interface ParseResult {
  messages: ChatMessage[];
  members: string[];
  groupName: string | null;
  warnings: string[];
}

export interface YearSummary {
  year: number;
  messageCount: number;
  memberCount: number;
  dateRange: { start: Date; end: Date };
}

export interface EmojiCount {
  emoji: string;
  count: number;
}

export interface MemberStats {
  name: string;
  messageCount: number;
  wordCount: number;
  mediaCount: number;
  topEmojis: EmojiCount[];
  doubleTextCount: number; // consecutive messages from this person with no reply in between
  longestSilenceHours: number; // longest gap before someone else replied to them... simplified below
}

export interface HourCount {
  hour: number; // 0-23
  count: number;
}

export interface DayCount {
  day: string; // Mon..Sun
  count: number;
}

export interface SilenceGap {
  startAt: Date;
  endAt: Date;
  hours: number;
  brokenBy: string;
}

export interface ChatStats {
  totalMessages: number;
  totalWords: number;
  totalMedia: number;
  dateRange: { start: Date; end: Date };
  members: MemberStats[];
  topEmojisOverall: EmojiCount[];
  busiestHour: HourCount;
  busiestDay: DayCount;
  hourHistogram: HourCount[];
  dayHistogram: DayCount[];
  longestSilence: SilenceGap | null;
  yapper: { name: string; messageCount: number } | null;
  doubleTexter: { name: string; count: number } | null;
  // Messages that sat unanswered for AIRBALL_GAP_HOURS+ before anyone replied -
  // full ranking, all members, sorted descending.
  airballs: { name: string; count: number }[];
}

// ---- LLM analysis output shapes (strict JSON contracts) ----

// A verbatim message - never rewritten or paraphrased by the model, just
// copied exactly from the transcript with its real sender.
export interface ConversationTurn {
  sender: string;
  text: string;
}

export interface MomentCandidate {
  title: string;
  date: string; // best-guess date string, e.g. "March 2026"
  peopleInvolved: string[];
  // The actual back-and-forth, verbatim and in order - 4-10 consecutive
  // real messages. This is what renders on the card, not a written summary.
  exchange: ConversationTurn[];
}

export interface GagMention {
  sender: string;
  text: string; // verbatim quote
  date: string;
}

export interface RunningGagCandidate {
  name: string; // short label for the joke/phrase - not a description
  // Every verbatim instance the joke/phrase was referenced, chronological.
  // mentions[0] is the origin; mentions.length is the reference count.
  mentions: GagMention[];
}

export interface QuoteCandidate {
  sender: string;
  text: string;
  date: string;
  context: string;
}

export interface PersonalityEvidence {
  member: string;
  archetype: string;
  roastLine: string;
  evidenceQuotes: string[];
}

// Output of a single chunk (fixed-size message batch) extraction call
export interface ChunkExtraction {
  chunkLabel: string;
  moments: MomentCandidate[];
  runningGags: RunningGagCandidate[];
  standoutQuotes: QuoteCandidate[];
  personalityEvidence: PersonalityEvidence[];
}

// Output of the final synthesis call - drives the card deck directly
export interface WrappedResult {
  groupName: string;
  momentOfTheYear: MomentCandidate;
  runningGag: RunningGagCandidate;
  personalities: PersonalityEvidence[];
  quoteOfTheYear: QuoteCandidate;
}

export type AnalysisProgressStage =
  | { kind: "parsing" }
  | { kind: "chunk"; chunkLabel: string; index: number; total: number }
  | { kind: "synthesizing" }
  | { kind: "done" }
  | { kind: "error"; message: string };
