"use server";

// Server actions for persisting the Archive District. Derived results only
// (stats + wrapped + museum progress) are stored - never raw messages.
//
// No RLS on Neon: every query is scoped by the session userId via
// getUserId(). That eq(archiveChats.userId, userId) in every where clause
// is the entire isolation model - do not remove it.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { archiveChats } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { SerializedEntry } from "@/lib/archive";

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function getSessionUser(): Promise<{ id: string; name: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { id: session.user.id, name: session.user.name };
}

export async function loadDistrict(): Promise<SerializedEntry[] | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const rows = await db
    .select()
    .from(archiveChats)
    .where(eq(archiveChats.userId, userId))
    .orderBy(asc(archiveChats.createdAt));

  return rows.map((row) => ({
    id: row.id,
    chatName: row.chatName,
    year: row.year,
    stats: row.stats as SerializedEntry["stats"],
    wrapped: row.wrapped as SerializedEntry["wrapped"],
    progress: {
      discoveredWings: (row.discoveredWings as string[]) ?? [],
      inspectedExhibits: (row.inspectedExhibits as string[]) ?? [],
    },
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function saveEntry(entry: SerializedEntry): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };

  const existing = await db
    .select({ id: archiveChats.id })
    .from(archiveChats)
    .where(and(eq(archiveChats.id, entry.id), eq(archiveChats.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(archiveChats)
      .set({
        chatName: entry.chatName,
        year: entry.year,
        stats: entry.stats,
        wrapped: entry.wrapped,
        discoveredWings: entry.progress.discoveredWings,
        inspectedExhibits: entry.progress.inspectedExhibits,
        updatedAt: new Date(),
      })
      .where(and(eq(archiveChats.id, entry.id), eq(archiveChats.userId, userId)));
  } else {
    await db.insert(archiveChats).values({
      id: entry.id,
      userId,
      chatName: entry.chatName,
      year: entry.year,
      stats: entry.stats,
      wrapped: entry.wrapped,
      discoveredWings: entry.progress.discoveredWings,
      inspectedExhibits: entry.progress.inspectedExhibits,
    });
  }
  return { ok: true };
}

export async function saveProgress(
  entryId: string,
  progress: { discoveredWings: string[]; inspectedExhibits: string[] }
): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };

  await db
    .update(archiveChats)
    .set({
      discoveredWings: progress.discoveredWings,
      inspectedExhibits: progress.inspectedExhibits,
      updatedAt: new Date(),
    })
    .where(and(eq(archiveChats.id, entryId), eq(archiveChats.userId, userId)));
  return { ok: true };
}

export async function deleteEntry(entryId: string): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };

  await db
    .delete(archiveChats)
    .where(and(eq(archiveChats.id, entryId), eq(archiveChats.userId, userId)));
  return { ok: true };
}
