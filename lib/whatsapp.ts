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

// WhatsApp dark theme bubbles.
export const WHATSAPP_SENT_BUBBLE = "bg-[#005C4B] text-[#E9EDEF]";
export const WHATSAPP_RECEIVED_BUBBLE = "bg-[#202C33] text-[#E9EDEF]";
