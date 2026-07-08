"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  ChatStats,
  ConversationTurn,
  PersonalityEvidence,
  WrappedResult,
} from "@/lib/types";
import type { MediaHighlight } from "@/lib/media";
import { cleanDisplayCopy } from "@/lib/copy";
import {
  whatsappNameColor,
  WHATSAPP_RECEIVED_BUBBLE,
  WHATSAPP_SENT_BUBBLE,
} from "@/lib/whatsapp";

type Direction = "up" | "down" | "left" | "right";
type RoomId = "archive" | "canon" | "quote" | "photos" | "stats" | "gag" | "cast";
type ExhibitKind =
  | "archive"
  | "moment"
  | "quote"
  | "photos"
  | "stats"
  | "gag"
  | "cast";

interface Point {
  x: number;
  y: number;
}

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Room extends Zone {
  id: RoomId;
  title: string;
  label: string;
  accent: string;
  bg: string;
}

interface Exhibit extends Zone {
  id: string;
  roomId: RoomId;
  kind: ExhibitKind;
  title: string;
  subtitle: string;
  accent: string;
  imageUrl?: string;
  personalityIndex?: number;
}

interface MuseumExperienceProps {
  stats: ChatStats;
  wrapped: WrappedResult;
  mediaHighlights: MediaHighlight[];
}

const WORLD = { w: 1280, h: 920 };
const START: Point = { x: 640, y: 468 };
const PLAYER_RADIUS = 17;
const SPEED = 4.2;
const INSPECT_DISTANCE = 112;

const CORRIDORS: Zone[] = [
  { x: 300, y: 178, w: 680, h: 76 },
  { x: 584, y: 238, w: 112, h: 500 },
  { x: 318, y: 468, w: 646, h: 84 },
];

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${suffix}`;
}

function initials(name: string): string {
  return cleanDisplayCopy(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function buildRooms(hasPhotos: boolean): Room[] {
  return [
    {
      id: "quote",
      title: "Quote Vault",
      label: "QUOTE",
      x: 70,
      y: 96,
      w: 294,
      h: 214,
      accent: "#53BDEB",
      bg: "linear-gradient(135deg, rgba(83,189,235,0.15), rgba(17,27,33,0.98))",
    },
    {
      id: "canon",
      title: "Canon Gallery",
      label: "CANON",
      x: 426,
      y: 72,
      w: 428,
      h: 246,
      accent: "#25D366",
      bg: "linear-gradient(135deg, rgba(37,211,102,0.17), rgba(17,27,33,0.98))",
    },
    {
      id: "photos",
      title: hasPhotos ? "Camera Room" : "Receipt Wall",
      label: hasPhotos ? "PHOTOS" : "RECEIPTS",
      x: 916,
      y: 96,
      w: 294,
      h: 214,
      accent: "#6BCF9C",
      bg: "linear-gradient(135deg, rgba(107,207,156,0.15), rgba(17,27,33,0.98))",
    },
    {
      id: "stats",
      title: "Stats Arcade",
      label: "STATS",
      x: 70,
      y: 388,
      w: 312,
      h: 240,
      accent: "#FFA000",
      bg: "linear-gradient(135deg, rgba(255,160,0,0.16), rgba(17,27,33,0.98))",
    },
    {
      id: "archive",
      title: "Archive Hall",
      label: "LOBBY",
      x: 456,
      y: 360,
      w: 368,
      h: 238,
      accent: "#00A884",
      bg: "linear-gradient(135deg, rgba(0,168,132,0.18), rgba(17,27,33,0.98))",
    },
    {
      id: "gag",
      title: "Joke Reliquary",
      label: "JOKE",
      x: 898,
      y: 388,
      w: 332,
      h: 240,
      accent: "#D291E4",
      bg: "linear-gradient(135deg, rgba(210,145,228,0.16), rgba(17,27,33,0.98))",
    },
    {
      id: "cast",
      title: "Cast Wing",
      label: "CAST",
      x: 384,
      y: 708,
      w: 512,
      h: 166,
      accent: "#EF798A",
      bg: "linear-gradient(135deg, rgba(239,121,138,0.15), rgba(17,27,33,0.98))",
    },
  ];
}

function buildWalkZones(rooms: Room[]): Zone[] {
  return [...rooms, ...CORRIDORS];
}

function isInsideZone(point: Point, zone: Zone, inset = 0): boolean {
  return (
    point.x >= zone.x + inset &&
    point.x <= zone.x + zone.w - inset &&
    point.y >= zone.y + inset &&
    point.y <= zone.y + zone.h - inset
  );
}

function findRoom(point: Point, rooms: Room[]): Room | null {
  return rooms.find((room) => isInsideZone(point, room, 0)) ?? null;
}

function isWalkable(point: Point, zones: Zone[]): boolean {
  return zones.some((zone) => isInsideZone(point, zone, PLAYER_RADIUS));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centerOf(zone: Zone): Point {
  return { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
}

function buildExhibits(
  stats: ChatStats,
  wrapped: WrappedResult,
  mediaHighlights: MediaHighlight[]
): Exhibit[] {
  const photoExhibits = mediaHighlights.slice(0, 6).map((highlight, index) => ({
    id: `photo-${index}`,
    roomId: "photos" as const,
    kind: "photos" as const,
    title: index === 0 ? "Camera Wall" : `Photo ${index + 1}`,
    subtitle: cleanDisplayCopy(highlight.sender),
    x: 944 + (index % 3) * 78,
    y: 142 + Math.floor(index / 3) * 74,
    w: 62,
    h: 58,
    accent: "#6BCF9C",
    imageUrl: highlight.url,
  }));

  const fallbackPhotoExhibit: Exhibit = {
    id: "receipts",
    roomId: "photos",
    kind: "photos",
    title: "Receipt Wall",
    subtitle: stats.topEmojisOverall.length > 0 ? "Emoji evidence" : "Text-only export",
    x: 978,
    y: 148,
    w: 160,
    h: 104,
    accent: "#6BCF9C",
  };

  const castExhibits = wrapped.personalities.slice(0, 5).map((personality, index) => ({
    id: `cast-${personality.member}`,
    roomId: "cast" as const,
    kind: "cast" as const,
    title: cleanDisplayCopy(personality.member),
    subtitle: cleanDisplayCopy(personality.archetype),
    x: 424 + index * 90,
    y: 760,
    w: 68,
    h: 70,
    accent: ["#25D366", "#53BDEB", "#FFA000", "#D291E4", "#EF798A"][index % 5],
    personalityIndex: index,
  }));

  return [
    {
      id: "archive-pass",
      roomId: "archive",
      kind: "archive",
      title: "Museum Pass",
      subtitle: cleanDisplayCopy(wrapped.groupName),
      x: 500,
      y: 414,
      w: 122,
      h: 88,
      accent: "#00A884",
    },
    {
      id: "archive-sign",
      roomId: "archive",
      kind: "archive",
      title: `${formatCount(stats.totalMessages)} messages`,
      subtitle: `${stats.members.length} members`,
      x: 660,
      y: 414,
      w: 122,
      h: 88,
      accent: "#00A884",
    },
    {
      id: "canon-event",
      roomId: "canon",
      kind: "moment",
      title: cleanDisplayCopy(wrapped.momentOfTheYear.title),
      subtitle: cleanDisplayCopy(wrapped.momentOfTheYear.date),
      x: 522,
      y: 116,
      w: 236,
      h: 160,
      accent: "#25D366",
    },
    {
      id: "quote-frame",
      roomId: "quote",
      kind: "quote",
      title: "Quote of the Year",
      subtitle: cleanDisplayCopy(wrapped.quoteOfTheYear.sender),
      x: 128,
      y: 146,
      w: 178,
      h: 112,
      accent: "#53BDEB",
    },
    ...(mediaHighlights.length > 0 ? photoExhibits : [fallbackPhotoExhibit]),
    {
      id: "stats-machine",
      roomId: "stats",
      kind: "stats",
      title: "Leaderboard Cabinet",
      subtitle: stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "Top sender",
      x: 126,
      y: 438,
      w: 210,
      h: 142,
      accent: "#FFA000",
    },
    {
      id: "gag-case",
      roomId: "gag",
      kind: "gag",
      title: cleanDisplayCopy(wrapped.runningGag.name),
      subtitle: `${wrapped.runningGag.mentions.length} sightings`,
      x: 952,
      y: 434,
      w: 222,
      h: 150,
      accent: "#D291E4",
    },
    ...castExhibits,
  ];
}

function getDirectionFromKey(key: string): Direction | null {
  const map: Record<string, Direction> = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
  };
  return map[key] ?? null;
}

function MessageBubble({
  turn,
  isMe,
  senderOrder,
}: {
  turn: ConversationTurn;
  isMe: boolean;
  senderOrder: string[];
}) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm ${
          isMe ? `rounded-br-md ${WHATSAPP_SENT_BUBBLE}` : `rounded-bl-md ${WHATSAPP_RECEIVED_BUBBLE}`
        }`}
      >
        <p className={`text-xs font-semibold ${whatsappNameColor(turn.sender, senderOrder)}`}>
          {cleanDisplayCopy(turn.sender)}
        </p>
        <p className="text-sm leading-relaxed">{cleanDisplayCopy(turn.text)}</p>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#2A3942] bg-[#111B21]/82 p-3">
      <p className="truncate text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[#8696A0]">{label}</p>
    </div>
  );
}

function ControlButton({
  direction,
  label,
  press,
  release,
}: {
  direction: Direction;
  label: string;
  press: (direction: Direction) => void;
  release: (direction: Direction) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Move ${direction}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        press(direction);
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        release(direction);
      }}
      onPointerCancel={() => release(direction)}
      onPointerLeave={() => release(direction)}
      className="flex h-11 w-11 touch-none items-center justify-center rounded-2xl border border-[#2A3942] bg-[#202C33]/95 text-base font-black text-[#E9EDEF] shadow-lg active:bg-[#00A884] active:text-[#06130D]"
    >
      {label}
    </button>
  );
}

function Controls({
  press,
  release,
}: {
  press: (direction: Direction) => void;
  release: (direction: Direction) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <span />
      <ControlButton direction="up" label="^" press={press} release={release} />
      <span />
      <ControlButton direction="left" label="<" press={press} release={release} />
      <span className="h-11 w-11 rounded-2xl border border-[#2A3942] bg-[#111B21]/80" />
      <ControlButton direction="right" label=">" press={press} release={release} />
      <span />
      <ControlButton direction="down" label="v" press={press} release={release} />
      <span />
    </div>
  );
}

function RoomView({ room }: { room: Room }) {
  return (
    <div
      className="absolute overflow-hidden rounded-[2rem] border-2 shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
      style={{
        left: room.x,
        top: room.y,
        width: room.w,
        height: room.h,
        borderColor: room.accent,
        background: room.bg,
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute left-4 top-3 rounded-full bg-[#0B141A]/78 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-[#AEBAC1]">
        {room.label}
      </div>
      <div className="absolute bottom-3 left-4 right-4 truncate text-sm font-semibold text-[#E9EDEF]">
        {room.title}
      </div>
    </div>
  );
}

function CorridorView({ zone }: { zone: Zone }) {
  return (
    <div
      className="absolute rounded-[1.6rem] border border-[#2A3942] bg-[#101B21]"
      style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h }}
    />
  );
}

function MiniMessageWall({
  turns,
}: {
  turns: ConversationTurn[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {turns.slice(0, 3).map((turn, index) => (
        <div
          key={`${turn.sender}-${index}`}
          className={`max-w-[90%] rounded-xl px-2 py-1 text-[10px] leading-tight ${
            index % 2 === 0 ? "ml-auto bg-[#005C4B]" : "bg-[#202C33]"
          }`}
        >
          <span className="font-semibold">{cleanDisplayCopy(turn.sender)}: </span>
          <span>{cleanDisplayCopy(turn.text)}</span>
        </div>
      ))}
    </div>
  );
}

function ExhibitObject({
  exhibit,
  wrapped,
  stats,
  isNear,
  onInspect,
}: {
  exhibit: Exhibit;
  wrapped: WrappedResult;
  stats: ChatStats;
  isNear: boolean;
  onInspect: (exhibit: Exhibit) => void;
}) {
  const base =
    "absolute z-20 overflow-hidden rounded-2xl border bg-[#111B21]/94 p-2 text-left shadow-[0_12px_35px_rgba(0,0,0,0.32)] backdrop-blur-sm transition";
  const ring = isNear ? "scale-[1.03] border-[#D9FDD3]" : "border-[#2A3942]";

  return (
    <button
      type="button"
      onClick={() => onInspect(exhibit)}
      className={`${base} ${ring}`}
      style={{
        left: exhibit.x,
        top: exhibit.y,
        width: exhibit.w,
        height: exhibit.h,
        boxShadow: isNear
          ? `0 0 0 3px ${exhibit.accent}55, 0 18px 44px rgba(0,0,0,0.36)`
          : undefined,
      }}
    >
      {exhibit.kind === "moment" && (
        <>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#25D366]">
            Canon Event
          </p>
          <MiniMessageWall turns={wrapped.momentOfTheYear.exchange} />
        </>
      )}

      {exhibit.kind === "quote" && (
        <div className="flex h-full flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#53BDEB]">
            Quote
          </p>
          <p
            className="mt-2 text-sm font-semibold leading-tight"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {cleanDisplayCopy(wrapped.quoteOfTheYear.text)}
          </p>
        </div>
      )}

      {exhibit.kind === "photos" && exhibit.imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={exhibit.imageUrl}
            alt={exhibit.subtitle}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[9px] font-bold text-white">
            {exhibit.subtitle}
          </div>
        </>
      )}

      {exhibit.kind === "photos" && !exhibit.imageUrl && (
        <div className="flex h-full flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6BCF9C]">
            Receipts
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {stats.topEmojisOverall.slice(0, 6).map((emoji) => (
              <span key={emoji.emoji} className="rounded-full bg-[#202C33] px-2 py-1 text-xs">
                {emoji.emoji}
              </span>
            ))}
          </div>
        </div>
      )}

      {exhibit.kind === "stats" && (
        <div className="flex h-full flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FFA000]">
            Arcade
          </p>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCount(stats.totalMessages)}
            </p>
            <p className="text-xs text-[#AEBAC1]">messages</p>
          </div>
          <p className="truncate text-xs text-[#8696A0]">
            {stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "No winner"}
          </p>
        </div>
      )}

      {exhibit.kind === "gag" && (
        <div className="flex h-full flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D291E4]">
            Joke Case
          </p>
          <p className="mt-2 text-xl font-semibold leading-tight">
            {cleanDisplayCopy(wrapped.runningGag.name)}
          </p>
          <p className="mt-1 text-xs text-[#AEBAC1]">
            {wrapped.runningGag.mentions.length} sightings
          </p>
        </div>
      )}

      {exhibit.kind === "archive" && (
        <div className="flex h-full flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00A884]">
            Pass
          </p>
          <p className="mt-2 truncate text-lg font-semibold">{exhibit.title}</p>
          <p className="truncate text-xs text-[#AEBAC1]">{exhibit.subtitle}</p>
        </div>
      )}

      {exhibit.kind === "cast" && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-[#06130D]"
            style={{ backgroundColor: exhibit.accent }}
          >
            {initials(exhibit.title)}
          </div>
          <p className="mt-1 max-w-full truncate text-xs font-semibold">{exhibit.title}</p>
        </div>
      )}
    </button>
  );
}

function PersonalityDetail({
  personality,
}: {
  personality: PersonalityEvidence;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-[#2A3942] bg-[#111B21] p-4">
        <p className="text-sm font-semibold text-[#25D366]">
          {cleanDisplayCopy(personality.member)}
        </p>
        <h3 className="mt-2 text-3xl font-semibold leading-tight">
          {cleanDisplayCopy(personality.archetype)}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#AEBAC1]">
          {cleanDisplayCopy(personality.roastLine)}
        </p>
      </div>
      {personality.evidenceQuotes.slice(0, 3).map((quote, index) => (
        <div
          key={`${quote}-${index}`}
          className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${WHATSAPP_RECEIVED_BUBBLE}`}
        >
          {cleanDisplayCopy(quote)}
        </div>
      ))}
    </div>
  );
}

function ExhibitDetail({
  exhibit,
  stats,
  wrapped,
  mediaHighlights,
}: {
  exhibit: Exhibit;
  stats: ChatStats;
  wrapped: WrappedResult;
  mediaHighlights: MediaHighlight[];
}) {
  const momentSenders = Array.from(
    new Set(wrapped.momentOfTheYear.exchange.map((turn) => turn.sender))
  );
  const firstMomentSender = wrapped.momentOfTheYear.exchange[0]?.sender;
  const personality =
    typeof exhibit.personalityIndex === "number"
      ? wrapped.personalities[exhibit.personalityIndex]
      : null;

  if (exhibit.kind === "archive") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="messages" value={formatCount(stats.totalMessages)} />
        <StatTile label="members" value={formatCount(stats.members.length)} />
        <StatTile
          label="top sender"
          value={stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "None"}
        />
        <StatTile label="peak hour" value={formatHour(stats.busiestHour.hour)} />
      </div>
    );
  }

  if (exhibit.kind === "moment") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium text-[#8696A0]">
            {cleanDisplayCopy(wrapped.momentOfTheYear.date)}
          </p>
          <h3 className="mt-1 text-2xl font-semibold leading-tight">
            {cleanDisplayCopy(wrapped.momentOfTheYear.title)}
          </h3>
        </div>
        <div className="wa-message-scroll flex max-h-[46vh] flex-col gap-2 overflow-y-auto rounded-3xl border border-[#2A3942] p-3">
          {wrapped.momentOfTheYear.exchange.map((turn, index) => (
            <MessageBubble
              key={`${turn.sender}-${index}`}
              turn={turn}
              isMe={turn.sender === firstMomentSender}
              senderOrder={momentSenders}
            />
          ))}
        </div>
      </div>
    );
  }

  if (exhibit.kind === "quote") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-[#2A3942] bg-[#111B21] px-3 py-1 text-[10px] font-medium text-[#8696A0]">
          {cleanDisplayCopy(wrapped.quoteOfTheYear.date)}
        </span>
        <div
          className={`max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-left shadow-lg ${WHATSAPP_RECEIVED_BUBBLE}`}
        >
          <p className="text-xs font-semibold text-[#53BDEB]">
            {cleanDisplayCopy(wrapped.quoteOfTheYear.sender)}
          </p>
          <p className="text-xl font-semibold leading-snug">
            {cleanDisplayCopy(wrapped.quoteOfTheYear.text)}
          </p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#8696A0]">
          {cleanDisplayCopy(wrapped.quoteOfTheYear.context)}
        </p>
      </div>
    );
  }

  if (exhibit.kind === "photos") {
    if (mediaHighlights.length > 0) {
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {mediaHighlights.slice(0, 9).map((highlight, index) => (
            <div
              key={`${highlight.sender}-${index}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-[#2A3942] bg-[#111B21]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={highlight.url}
                alt={`Photo from ${cleanDisplayCopy(highlight.sender)}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 left-1 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {cleanDisplayCopy(highlight.sender)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-6 text-[#AEBAC1]">
          This export has no image files, so the wall is built from message receipts instead.
        </p>
        <div className="flex flex-wrap gap-2">
          {stats.topEmojisOverall.length > 0 ? (
            stats.topEmojisOverall.slice(0, 10).map((emoji) => (
              <span
                key={emoji.emoji}
                className="rounded-full border border-[#2A3942] bg-[#111B21] px-3 py-1 text-sm"
              >
                {emoji.emoji} {formatCount(emoji.count)}
              </span>
            ))
          ) : (
            <span className="text-sm text-[#8696A0]">No emoji crown in this export.</span>
          )}
        </div>
      </div>
    );
  }

  if (exhibit.kind === "stats") {
    const topMembers = stats.members.slice(0, 5);
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="total words" value={formatCount(stats.totalWords)} />
          <StatTile label="media posts" value={formatCount(stats.totalMedia)} />
          <StatTile label="busiest day" value={stats.busiestDay.day} />
          <StatTile
            label="silence starter"
            value={stats.airballs[0]?.name ? cleanDisplayCopy(stats.airballs[0].name) : "None"}
          />
        </div>
        <div className="rounded-2xl border border-[#2A3942] bg-[#111B21] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FFA000]">
            Leaderboard
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {topMembers.map((member, index) => {
              const max = Math.max(topMembers[0]?.messageCount ?? 1, 1);
              const width = `${Math.max(8, (member.messageCount / max) * 100)}%`;
              return (
                <div key={member.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">
                      {index + 1}. {cleanDisplayCopy(member.name)}
                    </span>
                    <span className="shrink-0 text-[#AEBAC1]">
                      {formatCount(member.messageCount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#202C33]">
                    <div className="h-full rounded-full bg-[#00A884]" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (exhibit.kind === "gag") {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-3xl font-semibold leading-tight">
            {cleanDisplayCopy(wrapped.runningGag.name)}
          </h3>
          <p className="mt-1 text-sm text-[#8696A0]">
            {wrapped.runningGag.mentions.length} recorded sightings
          </p>
        </div>
        <div className="flex max-h-[46vh] flex-col gap-3 overflow-y-auto">
          {wrapped.runningGag.mentions.map((mention, index) => (
            <div key={`${mention.sender}-${index}`} className="rounded-2xl border border-[#2A3942] bg-[#111B21] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">
                  {cleanDisplayCopy(mention.sender)}
                </p>
                <p className="shrink-0 text-[10px] font-medium text-[#8696A0]">
                  {cleanDisplayCopy(mention.date)}
                </p>
              </div>
              <p className="text-sm leading-6 text-[#E9EDEF]">
                {cleanDisplayCopy(mention.text)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (personality) {
    return <PersonalityDetail personality={personality} />;
  }

  return null;
}

function ExhibitSheet({
  exhibit,
  stats,
  wrapped,
  mediaHighlights,
  onClose,
}: {
  exhibit: Exhibit;
  stats: ChatStats;
  wrapped: WrappedResult;
  mediaHighlights: MediaHighlight[];
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[70] mx-auto max-h-[68dvh] max-w-xl overflow-hidden rounded-[2rem] border border-[#2A3942] bg-[#111B21]/98 text-[#E9EDEF] shadow-[0_28px_90px_rgba(0,0,0,0.56)] backdrop-blur-xl"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#2A3942] bg-[#202C33] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{cleanDisplayCopy(exhibit.title)}</p>
          <p className="truncate text-xs text-[#8696A0]">{cleanDisplayCopy(exhibit.subtitle)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-[#2A3942] bg-[#111B21] px-3 py-1.5 text-xs font-semibold text-[#E9EDEF]"
        >
          Close
        </button>
      </div>
      <div className="max-h-[calc(68dvh-4rem)] overflow-y-auto p-4">
        <ExhibitDetail
          exhibit={exhibit}
          stats={stats}
          wrapped={wrapped}
          mediaHighlights={mediaHighlights}
        />
      </div>
    </motion.div>
  );
}

export default function MuseumExperience({
  stats,
  wrapped,
  mediaHighlights,
}: MuseumExperienceProps) {
  const hasPhotos = mediaHighlights.length > 0;
  const rooms = useMemo(() => buildRooms(hasPhotos), [hasPhotos]);
  const walkZones = useMemo(() => buildWalkZones(rooms), [rooms]);
  const exhibits = useMemo(
    () => buildExhibits(stats, wrapped, mediaHighlights),
    [stats, wrapped, mediaHighlights]
  );

  const [player, setPlayer] = useState<Point>(START);
  const [visitedRooms, setVisitedRooms] = useState<Set<RoomId>>(() => new Set(["archive"]));
  const [inspected, setInspected] = useState<Set<string>>(() => new Set());
  const [activeExhibit, setActiveExhibit] = useState<Exhibit | null>(null);
  const playerRef = useRef<Point>(START);
  const heldDirections = useRef(new Set<Direction>());
  const sheetOpenRef = useRef(false);

  const currentRoom = useMemo(() => findRoom(player, rooms), [player, rooms]);
  const nearestExhibit = useMemo(() => {
    let nearest: { exhibit: Exhibit; distance: number } | null = null;
    for (const exhibit of exhibits) {
      const d = distance(player, centerOf(exhibit));
      if (d > INSPECT_DISTANCE) continue;
      if (!nearest || d < nearest.distance) nearest = { exhibit, distance: d };
    }
    return nearest?.exhibit ?? null;
  }, [exhibits, player]);

  useEffect(() => {
    sheetOpenRef.current = activeExhibit !== null;
  }, [activeExhibit]);

  const inspect = useCallback((exhibit: Exhibit) => {
    setActiveExhibit(exhibit);
    setInspected((prev) => {
      if (prev.has(exhibit.id)) return prev;
      const next = new Set(prev);
      next.add(exhibit.id);
      return next;
    });
  }, []);

  const press = useCallback((direction: Direction) => {
    heldDirections.current.add(direction);
  }, []);

  const release = useCallback((direction: Direction) => {
    heldDirections.current.delete(direction);
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const elapsed = Math.min(40, now - last);
      last = now;

      if (!sheetOpenRef.current) {
        const held = heldDirections.current;
        let dx = 0;
        let dy = 0;
        if (held.has("left")) dx -= 1;
        if (held.has("right")) dx += 1;
        if (held.has("up")) dy -= 1;
        if (held.has("down")) dy += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy) || 1;
          const amount = SPEED * (elapsed / 16.67);

          const prev = playerRef.current;
          const next = {
            x: clamp(prev.x + (dx / len) * amount, PLAYER_RADIUS, WORLD.w - PLAYER_RADIUS),
            y: clamp(prev.y + (dy / len) * amount, PLAYER_RADIUS, WORLD.h - PLAYER_RADIUS),
          };
          let resolved = prev;
          if (isWalkable(next, walkZones)) {
            resolved = next;
          } else {
            const xOnly = { x: next.x, y: prev.y };
            const yOnly = { x: prev.x, y: next.y };
            if (isWalkable(xOnly, walkZones)) resolved = xOnly;
            else if (isWalkable(yOnly, walkZones)) resolved = yOnly;
          }

          if (resolved !== prev) {
            playerRef.current = resolved;
            setPlayer(resolved);
            const room = findRoom(resolved, rooms);
            if (room) {
              setVisitedRooms((prevRooms) => {
                if (prevRooms.has(room.id)) return prevRooms;
                const nextRooms = new Set(prevRooms);
                nextRooms.add(room.id);
                return nextRooms;
              });
            }
          }
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [rooms, walkZones]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeExhibit) {
        event.preventDefault();
        setActiveExhibit(null);
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && nearestExhibit && !activeExhibit) {
        event.preventDefault();
        inspect(nearestExhibit);
        return;
      }

      const direction = getDirectionFromKey(event.key);
      if (!direction || activeExhibit) return;
      event.preventDefault();
      heldDirections.current.add(direction);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = getDirectionFromKey(event.key);
      if (!direction) return;
      heldDirections.current.delete(direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeExhibit, inspect, nearestExhibit]);

  const roomName = currentRoom?.title ?? "Museum Floor";
  const allRoomsVisited = visitedRooms.size === rooms.length;
  const allExhibitsInspected = inspected.size === exhibits.length;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0B141A] text-[#E9EDEF]">
      <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.85rem)] z-40 flex items-center justify-between gap-3">
        <div className="min-w-0 rounded-full border border-[#2A3942] bg-[#111B21]/90 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md">
          <span className="text-[#25D366]">{visitedRooms.size}/{rooms.length}</span>
          <span className="text-[#8696A0]"> rooms </span>
          <span className="text-[#25D366]">{inspected.size}/{exhibits.length}</span>
          <span className="text-[#8696A0]"> exhibits</span>
        </div>
        <div className="min-w-0 truncate rounded-full border border-[#2A3942] bg-[#111B21]/90 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md">
          {roomName}
        </div>
      </div>

      <div
        className="absolute left-1/2 top-[54%]"
        style={{
          width: WORLD.w,
          height: WORLD.h,
          transform: `translate(${-player.x}px, ${-player.y}px)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-[3rem] border border-[#1D2C33] bg-[#071015]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18px 18px, rgba(37,211,102,0.09) 1px, transparent 1.2px), radial-gradient(circle at 42px 38px, rgba(255,255,255,0.045) 1px, transparent 1.2px)",
            backgroundSize: "56px 56px",
          }}
        />

        {CORRIDORS.map((zone, index) => (
          <CorridorView key={index} zone={zone} />
        ))}

        {rooms.map((room) => (
          <RoomView key={room.id} room={room} />
        ))}

        {exhibits.map((exhibit) => (
          <ExhibitObject
            key={exhibit.id}
            exhibit={exhibit}
            wrapped={wrapped}
            stats={stats}
            isNear={nearestExhibit?.id === exhibit.id}
            onInspect={inspect}
          />
        ))}

        <motion.div
          className="absolute z-30 flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-[#D9FDD3] bg-[#00A884] text-[9px] font-black text-[#06130D] shadow-[0_14px_38px_rgba(0,168,132,0.42)]"
          animate={{ left: player.x - 17, top: player.y - 17 }}
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.5 }}
        >
          YOU
        </motion.div>
      </div>

      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex items-end justify-between gap-3">
        <div className="pointer-events-auto">
          <Controls press={press} release={release} />
        </div>

        <div className="pointer-events-auto flex max-w-[11rem] flex-col items-end gap-2">
          <AnimatePresence>
            {nearestExhibit && !activeExhibit && (
              <motion.div
                className="rounded-2xl border border-[#2A3942] bg-[#111B21]/92 px-3 py-2 text-right text-xs shadow-lg backdrop-blur-md"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <p className="truncate font-semibold">{cleanDisplayCopy(nearestExhibit.title)}</p>
                <p className="truncate text-[#8696A0]">{cleanDisplayCopy(nearestExhibit.subtitle)}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            disabled={!nearestExhibit}
            onClick={() => nearestExhibit && inspect(nearestExhibit)}
            className="rounded-full bg-[#00A884] px-5 py-3 text-sm font-black text-[#06130D] shadow-lg transition disabled:border disabled:border-[#2A3942] disabled:bg-[#202C33]/88 disabled:text-[#8696A0]"
          >
            Inspect
          </button>
        </div>
      </div>

      {(allRoomsVisited || allExhibitsInspected) && !activeExhibit && (
        <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+8.2rem)] z-40 -translate-x-1/2 rounded-full border border-[#00A884]/50 bg-[#003F34]/92 px-4 py-2 text-xs font-semibold text-[#D9FDD3] shadow-lg backdrop-blur-md">
          {allExhibitsInspected ? "Archive fully inspected" : "All rooms discovered"}
        </div>
      )}

      <AnimatePresence>
        {activeExhibit && (
          <ExhibitSheet
            exhibit={activeExhibit}
            stats={stats}
            wrapped={wrapped}
            mediaHighlights={mediaHighlights}
            onClose={() => setActiveExhibit(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
