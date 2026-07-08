// Cross-chat people merging: the connective tissue of the Archive District.
//
// People are matched across chats by normalized display name. That's the
// only identity signal a WhatsApp export gives us (numbers are only present
// for non-contacts, and inconsistently), so we normalize hard and accept
// that "Tom" in two different chats is treated as the same statue.

import type { ArchiveEntry } from "@/lib/archive";
import type { MemberStats, PersonalityEvidence, QuoteCandidate } from "@/lib/types";

export interface PersonChatRecord {
  entryId: string;
  chatName: string;
  memberStats: MemberStats;
  /** This person's share of the chat's messages, 0-1. */
  share: number;
  rank: number; // 1 = top sender in that chat
  archetype: PersonalityEvidence | null;
  quote: QuoteCandidate | null;
}

export interface DistrictPerson {
  id: string;
  displayName: string;
  totalMessages: number;
  totalWords: number;
  chats: PersonChatRecord[];
  /** People in 2+ chats get statues on the district roads. */
  isConnector: boolean;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[~\u2069\u2066\u200e\u200f]/g, "") // strip WhatsApp direction marks
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDistrictPeople(entries: ArchiveEntry[]): DistrictPerson[] {
  const byKey = new Map<string, DistrictPerson>();

  for (const entry of entries) {
    const chatTotal = Math.max(1, entry.stats.totalMessages);
    const ranked = [...entry.stats.members].sort((a, b) => b.messageCount - a.messageCount);

    for (const member of entry.stats.members) {
      const key = normalizeName(member.name);
      if (!key) continue;

      const archetype =
        entry.wrapped.personalities.find((p) => normalizeName(p.member) === key) ?? null;
      const quote =
        normalizeName(entry.wrapped.quoteOfTheYear.sender) === key
          ? entry.wrapped.quoteOfTheYear
          : null;

      const record: PersonChatRecord = {
        entryId: entry.id,
        chatName: entry.chatName,
        memberStats: member,
        share: member.messageCount / chatTotal,
        rank: ranked.findIndex((m) => m.name === member.name) + 1,
        archetype,
        quote,
      };

      const existing = byKey.get(key);
      if (existing) {
        existing.totalMessages += member.messageCount;
        existing.totalWords += member.wordCount;
        existing.chats.push(record);
        // Prefer the longest display name seen (most likely full contact name).
        if (member.name.length > existing.displayName.length) {
          existing.displayName = member.name;
        }
      } else {
        byKey.set(key, {
          id: key.replace(/[^a-z0-9]+/g, "-"),
          displayName: member.name,
          totalMessages: member.messageCount,
          totalWords: member.wordCount,
          chats: [record],
          isConnector: false,
        });
      }
    }
  }

  const people = Array.from(byKey.values());
  for (const person of people) {
    person.isConnector = person.chats.length >= 2;
    person.chats.sort((a, b) => b.memberStats.messageCount - a.memberStats.messageCount);
  }
  return people.sort((a, b) => b.totalMessages - a.totalMessages);
}

/** People who bridge 2+ chats, most active first - these become statues. */
export function districtConnectors(people: DistrictPerson[]): DistrictPerson[] {
  return people.filter((p) => p.isConnector);
}
