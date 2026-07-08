// The Archive District domain model: multiple analyzed chats living together
// as museums in one walkable overworld.
//
// Each analyzed chat becomes an ArchiveEntry holding derived results only
// (stats + wrapped) - never raw messages. Entries survive JSON round-trips
// (Neon jsonb / localStorage) via the serialize/deserialize pair below,
// which is needed because ChatStats carries real Date objects.

import type { ChatStats, WrappedResult } from "@/lib/types";
import type { MediaHighlight } from "@/lib/media";

export interface MuseumProgress {
  discoveredWings: string[];
  inspectedExhibits: string[];
}

export interface ArchiveEntry {
  id: string;
  chatName: string;
  /** Year the recap covers, or null for an all-time archive. */
  year: number | null;
  stats: ChatStats;
  wrapped: WrappedResult;
  /**
   * Session-only: blob URLs from a zip upload. Never persisted - photos
   * exist only while the tab that uploaded the zip is alive.
   */
  mediaHighlights: MediaHighlight[];
  progress: MuseumProgress;
  createdAt: string;
}

export function newEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Serialization: ChatStats <-> plain JSON (Dates become ISO strings)
// ---------------------------------------------------------------------------

type JsonStats = Omit<ChatStats, "dateRange" | "longestSilence"> & {
  dateRange: { start: string; end: string };
  longestSilence:
    | (Omit<NonNullable<ChatStats["longestSilence"]>, "startAt" | "endAt"> & {
        startAt: string;
        endAt: string;
      })
    | null;
};

export interface SerializedEntry {
  id: string;
  chatName: string;
  year: number | null;
  stats: JsonStats;
  wrapped: WrappedResult;
  progress: MuseumProgress;
  createdAt: string;
}

export function serializeEntry(entry: ArchiveEntry): SerializedEntry {
  const { stats } = entry;
  return {
    id: entry.id,
    chatName: entry.chatName,
    year: entry.year,
    stats: {
      ...stats,
      dateRange: {
        start: stats.dateRange.start.toISOString(),
        end: stats.dateRange.end.toISOString(),
      },
      longestSilence: stats.longestSilence
        ? {
            ...stats.longestSilence,
            startAt: stats.longestSilence.startAt.toISOString(),
            endAt: stats.longestSilence.endAt.toISOString(),
          }
        : null,
    },
    wrapped: entry.wrapped,
    progress: entry.progress,
    createdAt: entry.createdAt,
  };
}

export function deserializeEntry(raw: SerializedEntry): ArchiveEntry {
  return {
    id: raw.id,
    chatName: raw.chatName,
    year: raw.year,
    stats: {
      ...raw.stats,
      dateRange: {
        start: new Date(raw.stats.dateRange.start),
        end: new Date(raw.stats.dateRange.end),
      },
      longestSilence: raw.stats.longestSilence
        ? {
            ...raw.stats.longestSilence,
            startAt: new Date(raw.stats.longestSilence.startAt),
            endAt: new Date(raw.stats.longestSilence.endAt),
          }
        : null,
    },
    wrapped: raw.wrapped,
    // Photos can't be revived from persistence - blob URLs die with the tab.
    mediaHighlights: [],
    progress: raw.progress ?? { discoveredWings: [], inspectedExhibits: [] },
    createdAt: raw.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Guest persistence: localStorage
// ---------------------------------------------------------------------------

const GUEST_KEY = "wa-archive-district-v1";

export function loadGuestDistrict(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SerializedEntry[];
    return parsed.map(deserializeEntry);
  } catch {
    return [];
  }
}

export function saveGuestDistrict(entries: ArchiveEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(entries.map(serializeEntry)));
  } catch {
    // Storage full or unavailable - guest mode simply won't persist.
  }
}

export function clearGuestDistrict() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_KEY);
  } catch {
    // ignore
  }
}
