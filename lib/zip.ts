import { unzipSync, strFromU8 } from "fflate";

export function isZipFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

const IMAGE_EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export interface ExtractedChat {
  text: string;
  // Raw zip bytes, kept around for a later selective media pass - decoding
  // the whole zip once and re-scanning it for a handful of chosen images
  // is cheap; eagerly decompressing every photo in a large export is not.
  zipData: Uint8Array;
}

// WhatsApp's "Export chat" produces a .zip containing the transcript as a
// .txt file, plus any attached media. This pulls just the .txt entry out
// client-side (filtered so media inside the zip is never decompressed here)
// - the zip never leaves the browser, same privacy guarantee as a plain
// .txt upload.
export async function extractChatTextFromZip(file: File): Promise<ExtractedChat> {
  const buffer = await file.arrayBuffer();
  const zipData = new Uint8Array(buffer);

  const entries = unzipSync(zipData, {
    filter: (entry) => entry.name.toLowerCase().endsWith(".txt"),
  });

  const txtNames = Object.keys(entries);
  if (txtNames.length === 0) {
    throw new Error("No .txt chat file found inside the zip.");
  }

  // WhatsApp zips contain exactly one chat .txt; if there happen to be
  // several, take the largest - the real transcript, not a stray note.
  const chosen = txtNames.reduce((best, name) =>
    entries[name].length > entries[best].length ? name : best
  );

  return { text: strFromU8(entries[chosen]), zipData };
}

// Selectively decompresses only the named files (e.g. a sampled handful of
// photos for a "camera roll" card) - never the whole media library, which
// for a real export can be hundreds of megabytes.
export function extractMediaFilesFromZip(
  zipData: Uint8Array,
  filenames: string[]
): Map<string, Blob> {
  const wanted = new Set(filenames);
  const entries = unzipSync(zipData, {
    filter: (entry) => wanted.has(entry.name),
  });

  const result = new Map<string, Blob>();
  for (const [name, bytes] of Object.entries(entries)) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const mime = IMAGE_EXTENSION_MIME[ext];
    if (!mime) continue; // skip anything that isn't a supported image type
    result.set(name, new Blob([bytes], { type: mime }));
  }
  return result;
}
