// Shared WhatsApp-style visual tokens used by every card that renders real
// message text as chat bubbles (MemorableChatCard, RunningGagCard,
// QuoteCard, PersonalityCard) — keeps sender name colors consistent
// wherever a "group chat name label" appears.

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

// Received bubble: white with dark text. Sent ("me") bubble: WhatsApp's
// light green with dark text. Both match the real app's light theme.
export const WHATSAPP_SENT_BUBBLE = "bg-[#DCF8C6] text-gray-900";
export const WHATSAPP_RECEIVED_BUBBLE = "bg-white text-gray-900";
