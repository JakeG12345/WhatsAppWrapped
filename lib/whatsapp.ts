// Shared WhatsApp-style visual tokens used by every card that renders real
// message text as chat bubbles. Sender name colors stay consistent anywhere
// a group chat name label appears.

export const WHATSAPP_NAME_COLORS = [
  "text-[#53BDEB]",
  "text-[#FFA000]",
  "text-[#D291E4]",
  "text-[#6BCF9C]",
  "text-[#EF798A]",
];

export function whatsappNameColor(sender: string, senderOrder: string[]): string {
  const idx = senderOrder.indexOf(sender);
  return WHATSAPP_NAME_COLORS[idx % WHATSAPP_NAME_COLORS.length];
}

// WhatsApp dark theme bubbles - the incoming tone is nudged toward the
// app's greener near-black base so transcripts sit naturally on it.
export const WHATSAPP_SENT_BUBBLE = "bg-[#005C4B] text-[#E9EDE9]";
export const WHATSAPP_RECEIVED_BUBBLE = "bg-[#1D2620] text-[#E9EDE9]";
