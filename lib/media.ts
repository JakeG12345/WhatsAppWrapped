import type { ChatMessage } from "./types";
import { extractMediaFilesFromZip } from "./zip";

export interface MediaHighlight {
  url: string;
  sender: string;
}

// Picks up to `count` media messages evenly spread across the chat's
// timeline (messages is assumed chronologically sorted, which
// parseWhatsAppChat guarantees) - a "highlights reel" feel rather than
// just the first N images sent.
function sampleMediaMessages(messages: ChatMessage[], count: number): ChatMessage[] {
  const withMedia = messages.filter((m) => m.mediaFilename);
  if (withMedia.length <= count) return withMedia;

  const step = withMedia.length / count;
  const sampled: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    sampled.push(withMedia[Math.floor(i * step)]);
  }
  return sampled;
}

// Builds a small "camera roll" of real photos from the export - only
// possible when the upload was a zip with media included (a plain .txt
// has no image bytes at all, and zipData is null in that case).
export function buildMediaHighlights(
  messages: ChatMessage[],
  zipData: Uint8Array | null,
  count = 9
): MediaHighlight[] {
  if (!zipData) return [];

  const sampled = sampleMediaMessages(messages, count);
  if (sampled.length === 0) return [];

  const filenames = sampled.map((m) => m.mediaFilename!);
  const blobs = extractMediaFilesFromZip(zipData, filenames);

  const highlights: MediaHighlight[] = [];
  for (const message of sampled) {
    const blob = blobs.get(message.mediaFilename!);
    if (!blob) continue; // e.g. a non-image attachment type we don't render
    highlights.push({ url: URL.createObjectURL(blob), sender: message.sender });
  }
  return highlights;
}

// Object URLs live until explicitly revoked or the page unloads - release
// them when starting over so a long session doesn't accumulate blob memory.
export function revokeMediaHighlights(highlights: MediaHighlight[]): void {
  for (const h of highlights) URL.revokeObjectURL(h.url);
}
