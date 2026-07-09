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

interface Footprint extends Point {
  id: number;
}

interface MuseumExperienceProps {
  stats: ChatStats;
  wrapped: WrappedResult;
  mediaHighlights: MediaHighlight[];
  /** Restore previously discovered wings (room ids). */
  initialVisitedRooms?: string[];
  /** Restore previously inspected exhibit ids. */
  initialInspected?: string[];
  /** Fired whenever discovery progress changes, for persistence. */
  onProgressChange?: (visitedRooms: string[], inspected: string[]) => void;
}

const WORLD = { w: 1280, h: 920 };
const START: Point = { x: 640, y: 468 };
const PLAYER_RADIUS = 17;
const SPEED = 4.4;
const INSPECT_DISTANCE = 112;
const TORCH_RADIUS = 300;

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
    { id: "quote", title: "Quote Vault", label: "WING 01", x: 70, y: 96, w: 294, h: 214, accent: "#53BDEB" },
    { id: "canon", title: "Canon Gallery", label: "WING 02", x: 426, y: 72, w: 428, h: 246, accent: "#25D366" },
    {
      id: "photos",
      title: hasPhotos ? "Camera Room" : "Evidence Wall",
      label: "WING 03",
      x: 916,
      y: 96,
      w: 294,
      h: 214,
      accent: "#6BCF9C",
    },
    { id: "stats", title: "Stats Arcade", label: "WING 04", x: 70, y: 388, w: 312, h: 240, accent: "#FFA000" },
    { id: "archive", title: "Archive Hall", label: "LOBBY", x: 456, y: 360, w: 368, h: 238, accent: "#00A884" },
    { id: "gag", title: "Joke Reliquary", label: "WING 05", x: 898, y: 388, w: 332, h: 240, accent: "#D291E4" },
    { id: "cast", title: "Cast Wing", label: "WING 06", x: 384, y: 708, w: 512, h: 166, accent: "#EF798A" },
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
    id: "evidence",
    roomId: "photos",
    kind: "photos",
    title: "Evidence Wall",
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
    <div className="border border-[#2A3942] bg-[#111B21]/82 p-3">
      <p className="truncate text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8696A0]">{label}</p>
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
      className="flex h-11 w-11 touch-none items-center justify-center border border-[#2A3942] bg-[#141F19]/95 font-mono text-sm font-bold text-[#E9EDE9] shadow-lg active:bg-[#00A884] active:text-[#06130D]"
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
    <div className="grid grid-cols-3 gap-1">
      <span />
      <ControlButton direction="up" label="W" press={press} release={release} />
      <span />
      <ControlButton direction="left" label="A" press={press} release={release} />
      <span className="h-11 w-11 border border-[#2A3942]/60 bg-[#0D1512]/80" />
      <ControlButton direction="right" label="D" press={press} release={release} />
      <span />
      <ControlButton direction="down" label="S" press={press} release={release} />
      <span />
    </div>
  );
}

function RoomView({ room, visited }: { room: Room; visited: boolean }) {
  return (
    <div
      className="absolute overflow-hidden border-2 transition-colors duration-700"
      style={{
        left: room.x,
        top: room.y,
        width: room.w,
        height: room.h,
        borderColor: visited ? room.accent : "#22302A",
        background: `linear-gradient(135deg, ${room.accent}${visited ? "24" : "10"}, rgba(9,14,11,0.98))`,
        boxShadow: visited ? `inset 0 0 60px ${room.accent}14` : undefined,
      }}
    >
      {/* parquet floor */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* baseboard */}
      <div
        className="absolute inset-x-0 top-0 h-[6px]"
        style={{ backgroundColor: visited ? room.accent : "#22302A", opacity: 0.55 }}
      />
      <div className="absolute left-3 top-3 border border-current/0 bg-[#06130D]/80 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.22em] text-[#8FA396]">
        {room.label}
      </div>
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#E9EDE9]/80">
          {room.title}
        </span>
        {visited && (
          <span
            className="shrink-0 font-mono text-[9px] font-bold tracking-[0.14em]"
            style={{ color: room.accent }}
          >
            LOGGED
          </span>
        )}
      </div>
    </div>
  );
}

function CorridorView({ zone }: { zone: Zone }) {
  return (
    <div
      className="absolute border border-[#1C2822] bg-[#0C1310]"
      style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
    </div>
  );
}

function MiniMessageWall({ turns }: { turns: ConversationTurn[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {turns.slice(0, 3).map((turn, index) => (
        <div
          key={`${turn.sender}-${index}`}
          className={`max-w-[90%] rounded-lg px-2 py-1 text-[10px] leading-tight ${
            index % 2 === 0 ? "ml-auto bg-[#005C4B]" : "bg-[#1D2620]"
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
  isInspected,
  onInspect,
}: {
  exhibit: Exhibit;
  wrapped: WrappedResult;
  stats: ChatStats;
  isNear: boolean;
  isInspected: boolean;
  onInspect: (exhibit: Exhibit) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onInspect(exhibit);
      }}
      className={`absolute z-20 overflow-visible border bg-[#101813]/95 p-2 text-left shadow-[0_12px_35px_rgba(0,0,0,0.4)] transition-transform ${
        isNear ? "scale-[1.04] border-[#D9FDD3]" : "border-[#26332C]"
      }`}
      style={{
        left: exhibit.x,
        top: exhibit.y,
        width: exhibit.w,
        height: exhibit.h,
        boxShadow: isNear
          ? `0 0 0 3px ${exhibit.accent}66, 0 18px 44px rgba(0,0,0,0.4)`
          : undefined,
      }}
    >
      {/* pulsing interaction ring */}
      {isNear && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-3 animate-ping border"
          style={{ borderColor: `${exhibit.accent}88`, animationDuration: "1.6s" }}
        />
      )}

      {/* inspected stamp */}
      {isInspected && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-2 z-10 flex h-5 w-5 rotate-12 items-center justify-center border font-mono text-[9px] font-bold"
          style={{
            borderColor: exhibit.accent,
            color: exhibit.accent,
            backgroundColor: "#06130D",
          }}
        >
          ✓
        </span>
      )}

      <div className="h-full w-full overflow-hidden">
        {exhibit.kind === "moment" && (
          <>
            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
              Canon Event
            </p>
            <MiniMessageWall turns={wrapped.momentOfTheYear.exchange} />
          </>
        )}

        {exhibit.kind === "quote" && (
          <div className="flex h-full flex-col justify-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#53BDEB]">
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
            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 font-mono text-[8px] font-bold text-white">
              {exhibit.subtitle}
            </div>
          </>
        )}

        {exhibit.kind === "photos" && !exhibit.imageUrl && (
          <div className="flex h-full flex-col justify-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#6BCF9C]">
              Evidence
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {stats.topEmojisOverall.slice(0, 6).map((emoji) => (
                <span key={emoji.emoji} className="rounded-full bg-[#1D2620] px-2 py-1 text-xs">
                  {emoji.emoji}
                </span>
              ))}
            </div>
          </div>
        )}

        {exhibit.kind === "stats" && (
          <div className="flex h-full flex-col justify-between">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFA000]">
              Arcade
            </p>
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatCount(stats.totalMessages)}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8FA396]">messages</p>
            </div>
            <p className="truncate font-mono text-[10px] text-[#8696A0]">
              {stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "No winner"}
            </p>
          </div>
        )}

        {exhibit.kind === "gag" && (
          <div className="flex h-full flex-col justify-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#D291E4]">
              Joke Case
            </p>
            <p className="mt-2 text-xl font-bold leading-tight">
              {cleanDisplayCopy(wrapped.runningGag.name)}
            </p>
            <p className="mt-1 font-mono text-[10px] text-[#8FA396]">
              {wrapped.runningGag.mentions.length} sightings
            </p>
          </div>
        )}

        {exhibit.kind === "archive" && (
          <div className="flex h-full flex-col justify-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#00A884]">
              Pass
            </p>
            <p className="mt-2 truncate text-lg font-bold">{exhibit.title}</p>
            <p className="truncate font-mono text-[10px] text-[#8FA396]">{exhibit.subtitle}</p>
          </div>
        )}

        {exhibit.kind === "cast" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold text-[#06130D]"
              style={{ backgroundColor: exhibit.accent }}
            >
              {initials(exhibit.title)}
            </div>
            <p className="mt-1 max-w-full truncate text-xs font-semibold">{exhibit.title}</p>
          </div>
        )}
      </div>
    </button>
  );
}

function PersonalityDetail({ personality }: { personality: PersonalityEvidence }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="border border-[#2A3942] bg-[#111B21] p-4">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#25D366]">
          {cleanDisplayCopy(personality.member)}
        </p>
        <h3 className="mt-2 text-3xl font-black uppercase leading-tight tracking-tight">
          {cleanDisplayCopy(personality.archetype)}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#AEBAC1]">
          {cleanDisplayCopy(personality.roastLine)}
        </p>
      </div>
      {personality.evidenceQuotes.slice(0, 3).map((quote, index) => (
        <div
          key={`${quote}-${index}`}
          className={`max-w-[88%] rounded-2xl rounded-bl-md px-3 py-2 text-sm leading-relaxed ${WHATSAPP_RECEIVED_BUBBLE}`}
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
      <div className="grid grid-cols-2 gap-2">
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
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8696A0]">
            {cleanDisplayCopy(wrapped.momentOfTheYear.date)}
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase leading-tight tracking-tight">
            {cleanDisplayCopy(wrapped.momentOfTheYear.title)}
          </h3>
        </div>
        <div className="wa-message-scroll flex max-h-[46vh] flex-col gap-2 overflow-y-auto border border-[#2A3942] p-3">
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
        <span className="border border-[#2A3942] bg-[#111B21] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8696A0]">
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
              className="relative aspect-square overflow-hidden border border-[#2A3942] bg-[#111B21]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={highlight.url}
                alt={`Photo from ${cleanDisplayCopy(highlight.sender)}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 left-1 max-w-[80%] truncate bg-black/60 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-white">
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
          This export has no image files, so the wall is built from message evidence instead.
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
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="total words" value={formatCount(stats.totalWords)} />
          <StatTile label="media posts" value={formatCount(stats.totalMedia)} />
          <StatTile label="busiest day" value={stats.busiestDay.day} />
          <StatTile
            label="silence starter"
            value={stats.airballs[0]?.name ? cleanDisplayCopy(stats.airballs[0].name) : "None"}
          />
        </div>
        <div className="border border-[#2A3942] bg-[#111B21] p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFA000]">
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
                    <span className="shrink-0 tabular-nums text-[#AEBAC1]">
                      {formatCount(member.messageCount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden bg-[#1D2620]">
                    <div className="h-full bg-[#00A884]" style={{ width }} />
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
          <h3 className="text-3xl font-black uppercase leading-tight tracking-tight">
            {cleanDisplayCopy(wrapped.runningGag.name)}
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-[#8696A0]">
            {wrapped.runningGag.mentions.length} recorded sightings
          </p>
        </div>
        <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto">
          {wrapped.runningGag.mentions.map((mention, index) => (
            <div key={`${mention.sender}-${index}`} className="border border-[#2A3942] bg-[#111B21] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">
                  {cleanDisplayCopy(mention.sender)}
                </p>
                <p className="shrink-0 font-mono text-[10px] text-[#8696A0]">
                  {cleanDisplayCopy(mention.date)}
                </p>
              </div>
              <p className="text-sm leading-6 text-[#E9EDEF]">{cleanDisplayCopy(mention.text)}</p>
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
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[70] mx-auto max-h-[68dvh] max-w-xl overflow-hidden border border-[#2A3942] bg-[#0C1310]/98 text-[#E9EDEF] shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: `${exhibit.accent}44`, backgroundColor: `${exhibit.accent}12` }}
      >
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: exhibit.accent }}>
            Exhibit record
          </p>
          <p className="truncate text-sm font-bold">{cleanDisplayCopy(exhibit.title)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 border border-[#2A3942] bg-[#111B21] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#E9EDEF]"
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

function MiniMap({
  rooms,
  visitedRooms,
  player,
}: {
  rooms: Room[];
  visitedRooms: Set<RoomId>;
  player: Point;
}) {
  const scale = 0.078;
  return (
    <div
      className="relative overflow-hidden border border-[#2A3942] bg-[#06130D]/92 shadow-lg backdrop-blur-md"
      style={{ width: WORLD.w * scale, height: WORLD.h * scale }}
      aria-hidden
    >
      {rooms.map((room) => (
        <div
          key={room.id}
          className="absolute"
          style={{
            left: room.x * scale,
            top: room.y * scale,
            width: room.w * scale,
            height: room.h * scale,
            backgroundColor: visitedRooms.has(room.id) ? `${room.accent}66` : "#1A241E",
            border: `1px solid ${visitedRooms.has(room.id) ? room.accent : "#26332C"}`,
          }}
        />
      ))}
      <div
        className="absolute h-1.5 w-1.5 rounded-full bg-[#D9FDD3] shadow-[0_0_6px_#25D366]"
        style={{ left: player.x * scale - 3, top: player.y * scale - 3 }}
      />
    </div>
  );
}

function Player({
  position,
  facing,
  moving,
}: {
  position: Point;
  facing: 1 | -1;
  moving: boolean;
}) {
  return (
    <div
      className="absolute z-30"
      style={{ left: position.x - PLAYER_RADIUS, top: position.y - PLAYER_RADIUS }}
    >
      {/* shadow */}
      <div className="absolute left-1/2 top-[30px] h-2 w-7 -translate-x-1/2 rounded-full bg-black/50 blur-[2px]" />
      {/* body */}
      <motion.div
        className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-[#D9FDD3] bg-[#00A884] shadow-[0_0_44px_rgba(0,168,132,0.55)]"
        animate={moving ? { y: [0, -3, 0] } : { y: 0 }}
        transition={
          moving
            ? { duration: 0.34, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : { duration: 0.15 }
        }
      >
        {/* eyes track facing direction */}
        <div
          className="flex gap-1.5 transition-transform duration-150"
          style={{ transform: `translateX(${facing * 3}px)` }}
        >
          <span className="h-2 w-1.5 rounded-full bg-[#06130D]" />
          <span className="h-2 w-1.5 rounded-full bg-[#06130D]" />
        </div>
        {/* curator cap */}
        <span className="absolute -top-1.5 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full bg-[#06130D]" />
      </motion.div>
    </div>
  );
}

export default function MuseumExperience({
  stats,
  wrapped,
  mediaHighlights,
  initialVisitedRooms,
  initialInspected,
  onProgressChange,
}: MuseumExperienceProps) {
  const hasPhotos = mediaHighlights.length > 0;
  const rooms = useMemo(() => buildRooms(hasPhotos), [hasPhotos]);
  const walkZones = useMemo(() => buildWalkZones(rooms), [rooms]);
  const exhibits = useMemo(
    () => buildExhibits(stats, wrapped, mediaHighlights),
    [stats, wrapped, mediaHighlights]
  );

  const [player, setPlayer] = useState<Point>(START);
  const [visitedRooms, setVisitedRooms] = useState<Set<RoomId>>(
    () => new Set(["archive", ...((initialVisitedRooms ?? []) as RoomId[])])
  );
  const [inspected, setInspected] = useState<Set<string>>(
    () => new Set(initialInspected ?? [])
  );
  const [activeExhibit, setActiveExhibit] = useState<Exhibit | null>(null);
  const [lightsOn, setLightsOn] = useState(false);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [roomSplash, setRoomSplash] = useState<Room | null>(null);
  const [celebrated, setCelebrated] = useState(false);

  const playerRef = useRef<Point>(START);
  const heldDirections = useRef(new Set<Direction>());
  const targetRef = useRef<Point | null>(null);
  const sheetOpenRef = useRef(false);
  const lastFootprintRef = useRef<Point>(START);
  const footprintIdRef = useRef(0);
  const worldRef = useRef<HTMLDivElement>(null);
  const splashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenRoomsRef = useRef<Set<RoomId>>(
    new Set(["archive", ...((initialVisitedRooms ?? []) as RoomId[])])
  );

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

  useEffect(() => {
    onProgressChange?.(Array.from(visitedRooms), Array.from(inspected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitedRooms, inspected]);

  useEffect(() => {
    return () => {
      if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current);
    };
  }, []);

  const inspect = useCallback((exhibit: Exhibit) => {
    targetRef.current = null;
    setActiveExhibit(exhibit);
    setInspected((prev) => {
      if (prev.has(exhibit.id)) return prev;
      const next = new Set(prev);
      next.add(exhibit.id);
      return next;
    });
  }, []);

  const press = useCallback((direction: Direction) => {
    targetRef.current = null;
    heldDirections.current.add(direction);
  }, []);

  const release = useCallback((direction: Direction) => {
    heldDirections.current.delete(direction);
  }, []);

  const handleFloorTap = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (sheetOpenRef.current) return;
    // Exhibits are buttons with their own inspect behavior - don't path to them.
    if ((event.target as HTMLElement).closest("button")) return;
    const world = worldRef.current;
    if (!world) return;
    const rect = world.getBoundingClientRect();
    const worldX = ((event.clientX - rect.left) / rect.width) * WORLD.w;
    const worldY = ((event.clientY - rect.top) / rect.height) * WORLD.h;
    targetRef.current = { x: worldX, y: worldY };
  }, []);

  // Movement loop: keys/d-pad take priority, otherwise walk toward tap target.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let wasMoving = false;

    const step = (now: number) => {
      const elapsed = Math.min(40, now - last);
      last = now;

      let didMove = false;

      if (!sheetOpenRef.current) {
        const held = heldDirections.current;
        let dx = 0;
        let dy = 0;

        if (held.size > 0) {
          if (held.has("left")) dx -= 1;
          if (held.has("right")) dx += 1;
          if (held.has("up")) dy -= 1;
          if (held.has("down")) dy += 1;
        } else if (targetRef.current) {
          const target = targetRef.current;
          const prev = playerRef.current;
          const tx = target.x - prev.x;
          const ty = target.y - prev.y;
          if (Math.hypot(tx, ty) < 8) {
            targetRef.current = null;
          } else {
            dx = tx;
            dy = ty;
          }
        }

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
            didMove = true;
            playerRef.current = resolved;
            setPlayer(resolved);
            if (dx !== 0) setFacing(dx > 0 ? 1 : -1);

            // footprint trail
            if (distance(resolved, lastFootprintRef.current) > 30) {
              lastFootprintRef.current = resolved;
              const id = footprintIdRef.current++;
              setFootprints((prevPrints) => [...prevPrints.slice(-9), { ...resolved, id }]);
            }

            const room = findRoom(resolved, rooms);
            if (room && !seenRoomsRef.current.has(room.id)) {
              seenRoomsRef.current.add(room.id);
              setVisitedRooms((prevRooms) => {
                const nextRooms = new Set(prevRooms);
                nextRooms.add(room.id);
                return nextRooms;
              });
              setRoomSplash(room);
              if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current);
              splashTimeoutRef.current = setTimeout(() => setRoomSplash(null), 1600);
            }
          } else {
            // blocked while pathing: give up so we don't grind against walls
            targetRef.current = null;
          }
        }
      }

      if (didMove !== wasMoving) {
        wasMoving = didMove;
        setMoving(didMove);
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
      targetRef.current = null;
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

  const allExhibitsInspected = inspected.size === exhibits.length;
  const showCertificate = allExhibitsInspected && !celebrated && !activeExhibit;

  return (
    <div
      // Camera moves the world via transform; pin focus-scroll to 0,0 so
      // overlays never drift when buttons deep in the world get focused.
      onScroll={(e) => {
        e.currentTarget.scrollLeft = 0;
        e.currentTarget.scrollTop = 0;
      }}
      className="relative h-dvh w-full overflow-hidden bg-[#040A08] text-[#E9EDEF]"
    >
      {/* HUD top */}
      <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.85rem)] z-40 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="border border-[#2A3942] bg-[#06130D]/92 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-lg backdrop-blur-md">
            <span className="text-[#25D366]">{visitedRooms.size}/{rooms.length}</span>
            <span className="text-[#8696A0]"> wings · </span>
            <span className="text-[#25D366]">{inspected.size}/{exhibits.length}</span>
            <span className="text-[#8696A0]"> exhibits</span>
          </div>
          <button
            type="button"
            onClick={() => setLightsOn((prev) => !prev)}
            className={`pointer-events-auto w-fit border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-lg backdrop-blur-md transition-colors ${
              lightsOn
                ? "border-[#25D366] bg-[#25D366] text-[#06130D]"
                : "border-[#2A3942] bg-[#06130D]/92 text-[#8FA396]"
            }`}
          >
            {lightsOn ? "Lights on" : "Lights off"}
          </button>
        </div>
        <MiniMap rooms={rooms} visitedRooms={visitedRooms} player={player} />
      </div>

      {/* world */}
      <div
        className="absolute left-1/2 top-[54%]"
        style={{
          width: WORLD.w,
          height: WORLD.h,
          transform: `translate(${-player.x}px, ${-player.y}px)`,
        }}
        ref={worldRef}
        onPointerDown={handleFloorTap}
      >
        <div
          className="absolute inset-0 cursor-pointer border border-[#14201A] bg-[#050C09]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18px 18px, rgba(37,211,102,0.08) 1px, transparent 1.2px), radial-gradient(circle at 42px 38px, rgba(255,255,255,0.04) 1px, transparent 1.2px)",
            backgroundSize: "56px 56px",
          }}
        />

        {CORRIDORS.map((zone, index) => (
          <CorridorView key={index} zone={zone} />
        ))}

        {rooms.map((room) => (
          <RoomView key={room.id} room={room} visited={visitedRooms.has(room.id)} />
        ))}

        {/* footprints */}
        {footprints.map((print, index) => (
          <span
            key={print.id}
            aria-hidden
            className="pointer-events-none absolute z-10 h-1.5 w-1.5 rounded-full bg-[#25D366]"
            style={{
              left: print.x - 3,
              top: print.y + 12,
              opacity: ((index + 1) / footprints.length) * 0.4,
            }}
          />
        ))}

        {exhibits.map((exhibit) => (
          <ExhibitObject
            key={exhibit.id}
            exhibit={exhibit}
            wrapped={wrapped}
            stats={stats}
            isNear={nearestExhibit?.id === exhibit.id}
            isInspected={inspected.has(exhibit.id)}
            onInspect={inspect}
          />
        ))}

        <Player position={player} facing={facing} moving={moving} />

        {/* torch fog-of-war */}
        {!lightsOn && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40"
            style={{
              background: `radial-gradient(circle ${TORCH_RADIUS}px at ${player.x}px ${player.y}px, transparent 0%, transparent 38%, rgba(3,8,6,0.55) 72%, rgba(3,8,6,0.93) 100%)`,
            }}
          />
        )}
        {/* warm torch glow */}
        {!lightsOn && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40"
            style={{
              background: `radial-gradient(circle 130px at ${player.x}px ${player.y}px, rgba(37,211,102,0.07), transparent 70%)`,
            }}
          />
        )}
      </div>

      {/* room splash */}
      <AnimatePresence>
        {roomSplash && (
          <motion.div
            key={roomSplash.id}
            className="pointer-events-none fixed inset-x-0 top-[30%] z-50 flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <p
              className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: roomSplash.accent }}
            >
              {roomSplash.label} — Discovered
            </p>
            <p
              className="mt-1 text-center text-4xl font-black uppercase tracking-tight text-[#E9EDE9] sm:text-5xl"
              style={{ textShadow: `0 0 60px ${roomSplash.accent}99` }}
            >
              {roomSplash.title}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD bottom */}
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex items-end justify-between gap-3">
        <div className="pointer-events-auto flex flex-col gap-2">
          <p className="w-fit border border-[#2A3942]/70 bg-[#06130D]/85 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5E6E64] backdrop-blur-sm">
            Tap floor or WASD to walk
          </p>
          <Controls press={press} release={release} />
        </div>

        <div className="pointer-events-auto flex max-w-[11rem] flex-col items-end gap-2">
          <AnimatePresence>
            {nearestExhibit && !activeExhibit && (
              <motion.div
                className="border border-[#2A3942] bg-[#06130D]/94 px-3 py-2 text-right shadow-lg backdrop-blur-md"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <p className="truncate text-xs font-bold">{cleanDisplayCopy(nearestExhibit.title)}</p>
                <p className="truncate font-mono text-[10px] text-[#8696A0]">
                  {cleanDisplayCopy(nearestExhibit.subtitle)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            disabled={!nearestExhibit}
            onClick={() => nearestExhibit && inspect(nearestExhibit)}
            className="bg-[#25D366] px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#06130D] shadow-[0_0_40px_rgba(37,211,102,0.3)] transition disabled:border disabled:border-[#2A3942] disabled:bg-[#141F19]/88 disabled:text-[#5E6E64] disabled:shadow-none"
          >
            Inspect
          </button>
        </div>
      </div>

      {/* completion certificate */}
      <AnimatePresence>
        {showCertificate && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm border-2 border-[#25D366] bg-[#06130D] p-6 text-center shadow-[0_0_120px_rgba(37,211,102,0.25)]"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#25D366]">
                Certificate of completion
              </p>
              <p className="mt-4 text-5xl font-black uppercase leading-[0.95] tracking-tight text-[#E9EDE9]">
                Archive cleared
              </p>
              <p className="mt-4 text-sm leading-6 text-[#8FA396]">
                {`Every exhibit in the ${cleanDisplayCopy(wrapped.groupName)} museum has been inspected. The record is complete.`}
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5E6E64]">
                <span>{`${exhibits.length}/${exhibits.length} exhibits`}</span>
                <span>·</span>
                <span>{`${rooms.length}/${rooms.length} wings`}</span>
              </div>
              <button
                type="button"
                onClick={() => setCelebrated(true)}
                className="mt-6 w-full bg-[#25D366] px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#06130D]"
              >
                Keep wandering
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
