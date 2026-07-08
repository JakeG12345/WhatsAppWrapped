import type { ChatStats, WrappedResult } from "./types";

const ARCHETYPES = [
  { name: "The Instigator", roast: (n: string) => `${n} starts more than they finish, and the group is worse off for it — in the best way.` },
  { name: "The Peacemaker Who Makes It Worse", roast: (n: string) => `${n} steps in to de-escalate and somehow adds three new arguments to the pile.` },
  { name: "The Lurker", roast: (n: string) => `${n} reads everything, reacts to nothing, and resurfaces exactly when it's most chaotic.` },
  { name: "The Narrator", roast: (n: string) => `${n} treats every group event like it needs a play-by-play, whether anyone asked or not.` },
  { name: "The Chronically Online One", roast: (n: string) => `${n} has never once been the first to see a message, and has never once cared.` },
  { name: "The Group Therapist", roast: (n: string) => `${n} shows up with "let's all just talk about this" energy nobody requested.` },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateMockWrappedResult(
  groupName: string | null,
  stats: ChatStats
): WrappedResult {
  const topMembers = stats.members.slice(0, 5);
  const yapperName = stats.yapper?.name ?? topMembers[0]?.name ?? "Someone";
  const secondName = topMembers[1]?.name ?? yapperName;
  const topEmoji = stats.topEmojisOverall[0]?.emoji ?? "💀";
  const resolvedGroupName = groupName ?? "The Group Chat";

  return {
    groupName: resolvedGroupName,
    momentOfTheYear: {
      title: `The ${topEmoji} Incident`,
      date: `${stats.busiestDay.day}, ${new Date().getFullYear()}`,
      narrative: `On what began as an unremarkable ${stats.busiestDay.day}, ${yapperName} and ${secondName} triggered a chain of ${stats.busiestHour.count}+ messages in a single hour. Historians remain divided on what actually happened. The chat has not been the same since. [Mock data — real chat analysis will replace this]`,
      peopleInvolved: [yapperName, secondName],
      evidenceQuotes: ["this is fine", "wait what", "I'm actually deceased"],
    },
    runningGag: {
      name: `The ${topEmoji} Reference`,
      originDate: "Early in the chat's history",
      originQuote: "someone said something and it just... stuck",
      timesReferenced: stats.topEmojisOverall[0]?.count ?? 12,
      description: `A bit that should have died in its first week and instead became structural. [Mock data — real chat analysis will replace this]`,
    },
    personalities: topMembers.map((m, i) => {
      const archetype = pick(ARCHETYPES, i);
      return {
        member: m.name,
        archetype: archetype.name,
        roastLine: archetype.roast(m.name),
        evidenceQuotes: [],
      };
    }),
    quoteOfTheYear: {
      sender: yapperName,
      text: "I'm not saying it was me, I'm saying no one can prove it wasn't",
      date: `${stats.dateRange.start.toLocaleDateString()}`,
      context: "Said with no prompting, in the middle of an unrelated conversation. [Mock data]",
    },
    closingSpeech: `And so we come to the end of another year in "${resolvedGroupName}." ${stats.totalMessages.toLocaleString()} messages. ${stats.members.length} people who could have called each other but didn't. To ${yapperName}, our most prolific correspondent — thank you for carrying this chat on your back. To everyone else — we see you, lurking. See you next year. [Mock data — real chat analysis will replace this]`,
  };
}
