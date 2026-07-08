// Quick manual smoke test for the parser, run with:
//   npx tsx scripts/test-parser.mjs
import { parseWhatsAppChat } from "../lib/parser.ts";
import { computeChatStats, chunkMessagesByCount } from "../lib/stats.ts";

const iosSample = `[1/3/26, 9:41:12 PM] Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[1/3/26, 9:41:12 PM] Alex: yo has anyone seen the kebab shop closed sign
[1/3/26, 9:42:03 PM] Sam: LMAO what
[1/3/26, 9:42:10 PM] Sam: explain
[1/3/26, 9:43:00 PM] Alex: it's a whole
saga
I'll explain tomorrow 💀
[1/3/26, 9:50:00 PM] Priya: <Media omitted>
[1/3/26, 9:50:30 PM] Priya: 😂😂😂
[2/3/26, 8:00:00 AM] Alex changed the subject to "Kebab Incident Survivors"
[2/3/26, 8:01:00 AM] Sam: still thinking about this ngl
[15/3/26, 11:59:59 PM] Priya: happy pi day eve`;

const androidSample = `3/1/26, 9:41 PM - Messages to this chat and calls are now secured with end-to-end encryption.
3/1/26, 9:41 PM - Alex: yo has anyone seen the kebab shop closed sign
3/1/26, 9:42 PM - Sam: LMAO what
3/1/26, 9:43 PM - Alex added Priya
3/1/26, 9:44 PM - Priya: image omitted
3/1/26, 9:45 PM - Priya: lol`;

function run(label, raw) {
  console.log(`\n=== ${label} ===`);
  const result = parseWhatsAppChat(raw);
  console.log("groupName:", result.groupName);
  console.log("members:", result.members);
  console.log("warnings:", result.warnings);
  console.log(
    "messages:",
    result.messages.map(
      (m) => `[${m.timestamp.toISOString()}] ${m.sender}${m.isMedia ? " (media)" : ""}: ${m.text.replace(/\n/g, "\\n")}`
    )
  );

  if (result.messages.length > 0) {
    const stats = computeChatStats(result.messages);
    console.log("stats.totalMessages:", stats.totalMessages);
    console.log("stats.yapper:", stats.yapper);
    console.log("stats.airballs:", stats.airballs);
    console.log("stats.doubleTexter:", stats.doubleTexter);
    console.log("stats.topEmojisOverall:", stats.topEmojisOverall);
    console.log("stats.longestSilence:", stats.longestSilence);
    console.log(
      "chunks:",
      chunkMessagesByCount(result.messages, 5).map((c) => `${c.chunkLabel}: ${c.messages.length}`)
    );
  }
}

run("iOS format (DMY)", iosSample);
run("Android format (MDY)", androidSample);
