// Core domain types shared across the parser, stats engine, API route, and UI.

export interface ChatMessage {
  timestamp: Date;
  sender: string;
  text: string;
  isMedia: boolean;
}

export interface ParseResult {
  messages: ChatMessage[];
  members: string[];
  groupName: string | null;
  warnings: string[];
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
  ghost: { name: string; longestSilenceHours: number } | null;
  doubleTexter: { name: string; count: number } | null;
}

// ---- LLM analysis output shapes (strict JSON contracts) ----

export interface MomentCandidate {
  title: string;
  date: string; // best-guess date string, e.g. "March 2026"
  narrative: string; // museum-plaque style description
  peopleInvolved: string[];
  evidenceQuotes: string[];
}

export interface RunningGagCandidate {
  name: string;
  originDate: string;
  originQuote: string;
  timesReferenced: number;
  description: string;
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

// Output of a single monthly extraction call
export interface MonthlyExtraction {
  monthLabel: string;
  moments: MomentCandidate[];
  runningGags: RunningGagCandidate[];
  standoutQuotes: QuoteCandidate[];
  personalityEvidence: PersonalityEvidence[];
}

// Output of the final synthesis call — drives the card deck directly
export interface WrappedResult {
  groupName: string;
  momentOfTheYear: MomentCandidate;
  runningGag: RunningGagCandidate;
  personalities: PersonalityEvidence[];
  quoteOfTheYear: QuoteCandidate;
  closingSpeech: string;
}

export type AnalysisProgressStage =
  | { kind: "parsing" }
  | { kind: "chunk"; monthLabel: string; index: number; total: number }
  | { kind: "synthesizing" }
  | { kind: "done" }
  | { kind: "error"; message: string };
