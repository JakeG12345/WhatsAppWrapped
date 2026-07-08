"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatStats, ConversationTurn, PersonalityEvidence, WrappedResult } from "@/lib/types";
import type { MediaHighlight } from "@/lib/media";
import { cleanDisplayCopy } from "@/lib/copy";
import {
  whatsappNameColor,
  WHATSAPP_RECEIVED_BUBBLE,
  WHATSAPP_SENT_BUBBLE,
} from "@/lib/whatsapp";

type RoomId = "archive" | "stats" | "canon" | "gag" | "cast" | "quote" | "photos";
type Direction = "up" | "down" | "left" | "right";

interface MuseumRoom {
  id: RoomId;
  title: string;
  shortTitle: string;
  kicker: string;
  x: number;
  y: number;
  accent: string;
  connections: Partial<Record<Direction, RoomId>>;
}

interface MuseumExperienceProps {
  stats: ChatStats;
  wrapped: WrappedResult;
  mediaHighlights: MediaHighlight[];
}

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

function buildRooms(hasPhotos: boolean): MuseumRoom[] {
  return [
    {
      id: "quote",
      title: "Quote Vault",
      shortTitle: "Quote",
      kicker: "Exhibit 01",
      x: 20,
      y: 18,
      accent: "border-[#53BDEB]",
      connections: { right: "canon", down: "stats" },
    },
    {
      id: "canon",
      title: "Canon Gallery",
      shortTitle: "Canon",
      kicker: "Exhibit 02",
      x: 50,
      y: 18,
      accent: "border-[#25D366]",
      connections: { left: "quote", right: "photos", down: "archive" },
    },
    {
      id: "photos",
      title: hasPhotos ? "Camera Room" : "Receipt Wall",
      shortTitle: hasPhotos ? "Photos" : "Receipts",
      kicker: "Exhibit 03",
      x: 80,
      y: 18,
      accent: "border-[#6BCF9C]",
      connections: { left: "canon", down: "gag" },
    },
    {
      id: "stats",
      title: "Stats Arcade",
      shortTitle: "Stats",
      kicker: "Exhibit 04",
      x: 20,
      y: 55,
      accent: "border-[#FFA000]",
      connections: { up: "quote", right: "archive" },
    },
    {
      id: "archive",
      title: "Archive Hall",
      shortTitle: "Lobby",
      kicker: "Main Hall",
      x: 50,
      y: 55,
      accent: "border-[#00A884]",
      connections: { up: "canon", left: "stats", right: "gag", down: "cast" },
    },
    {
      id: "gag",
      title: "Joke Reliquary",
      shortTitle: "Joke",
      kicker: "Exhibit 05",
      x: 80,
      y: 55,
      accent: "border-[#D291E4]",
      connections: { up: "photos", left: "archive" },
    },
    {
      id: "cast",
      title: "Cast Wing",
      shortTitle: "Cast",
      kicker: "Exhibit 06",
      x: 50,
      y: 84,
      accent: "border-[#EF798A]",
      connections: { up: "archive" },
    },
  ];
}

function makeEdges(rooms: MuseumRoom[]): Array<[MuseumRoom, MuseumRoom]> {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const seen = new Set<string>();
  const edges: Array<[MuseumRoom, MuseumRoom]> = [];

  for (const room of rooms) {
    for (const nextId of Object.values(room.connections)) {
      if (!nextId) continue;
      const next = byId.get(nextId);
      if (!next) continue;
      const key = [room.id, next.id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([room, next]);
    }
  }

  return edges;
}

function DPadButton({
  direction,
  label,
  disabled,
  move,
}: {
  direction: Direction;
  label: string;
  disabled: boolean;
  move: (direction: Direction) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Move ${direction}`}
      disabled={disabled}
      onClick={() => move(direction)}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2A3942] bg-[#202C33]/95 text-sm font-black text-[#E9EDEF] shadow-sm transition disabled:opacity-25"
    >
      {label}
    </button>
  );
}

function DPad({
  connections,
  move,
}: {
  connections: Partial<Record<Direction, RoomId>>;
  move: (direction: Direction) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      <span />
      <DPadButton direction="up" label="^" disabled={!connections.up} move={move} />
      <span />
      <DPadButton direction="left" label="<" disabled={!connections.left} move={move} />
      <span className="h-9 w-9 rounded-xl border border-[#2A3942] bg-[#111B21]/80" />
      <DPadButton direction="right" label=">" disabled={!connections.right} move={move} />
      <span />
      <DPadButton direction="down" label="v" disabled={!connections.down} move={move} />
      <span />
    </div>
  );
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
        className={`max-w-[86%] rounded-2xl px-3 py-2 shadow-sm ${
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
    <div className="wa-soft-panel rounded-2xl p-3">
      <p className="truncate text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[#8696A0]">{label}</p>
    </div>
  );
}

function PersonalityBadge({
  personality,
  index,
}: {
  personality: PersonalityEvidence;
  index: number;
}) {
  const accents = ["#25D366", "#53BDEB", "#FFA000", "#D291E4", "#EF798A"];
  return (
    <div className="wa-soft-panel rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-[#06130D]"
          style={{ backgroundColor: accents[index % accents.length] }}
        >
          {initials(personality.member)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {cleanDisplayCopy(personality.member)}
          </p>
          <p className="truncate text-xs text-[#8696A0]">
            {cleanDisplayCopy(personality.archetype)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#AEBAC1]">
        {cleanDisplayCopy(personality.roastLine)}
      </p>
    </div>
  );
}

export default function MuseumExperience({
  stats,
  wrapped,
  mediaHighlights,
}: MuseumExperienceProps) {
  const hasPhotos = mediaHighlights.length > 0;
  const rooms = useMemo(() => buildRooms(hasPhotos), [hasPhotos]);
  const edges = useMemo(() => makeEdges(rooms), [rooms]);
  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const [currentRoomId, setCurrentRoomId] = useState<RoomId>("archive");
  const [visited, setVisited] = useState<Set<RoomId>>(() => new Set(["archive"]));
  const currentRoom = roomById.get(currentRoomId) ?? rooms[0];
  const allRoomsVisited = visited.size === rooms.length;

  const enterRoom = useCallback((roomId: RoomId) => {
    setCurrentRoomId(roomId);
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(roomId);
      return next;
    });
  }, []);

  const move = useCallback(
    (direction: Direction) => {
      const nextRoom = currentRoom.connections[direction];
      if (nextRoom) enterRoom(nextRoom);
    },
    [currentRoom.connections, enterRoom]
  );

  useEffect(() => {
    const keyToDirection: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = keyToDirection[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move]);

  const momentSenders = Array.from(
    new Set(wrapped.momentOfTheYear.exchange.map((turn) => turn.sender))
  );
  const firstMomentSender = wrapped.momentOfTheYear.exchange[0]?.sender;

  function renderArchiveHall() {
    return (
      <div className="flex flex-col gap-4">
        <div className="wa-message-scroll rounded-3xl border border-[#2A3942] p-3">
          <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-[#005C4B] px-4 py-3 text-right shadow-sm">
            <p className="wa-kicker">Museum Pass</p>
            <p className="mt-2 text-2xl font-semibold leading-tight">
              {cleanDisplayCopy(wrapped.groupName)}
            </p>
            <p className="mt-1 text-sm text-[#D9FDD3]">
              {visited.size} of {rooms.length} rooms stamped
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="messages" value={formatCount(stats.totalMessages)} />
          <StatTile label="members" value={formatCount(stats.members.length)} />
          <StatTile
            label="top sender"
            value={stats.yapper?.name ? cleanDisplayCopy(stats.yapper.name) : "None"}
          />
          <StatTile
            label="peak hour"
            value={formatHour(stats.busiestHour.hour)}
          />
        </div>

        {allRoomsVisited && (
          <div className="rounded-2xl border border-[#00A884]/50 bg-[#003F34] p-3">
            <p className="text-sm font-semibold text-[#D9FDD3]">Archive complete</p>
            <p className="mt-1 text-xs leading-5 text-[#AEBAC1]">
              Every room has a stamp. The chat lore is officially documented.
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderStatsArcade() {
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

        <div className="wa-soft-panel rounded-2xl p-3">
          <p className="wa-kicker">Leaderboard</p>
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
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#111B21]">
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

  function renderCanonGallery() {
    return (
      <div className="flex flex-col gap-4">
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

  function renderJokeReliquary() {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="wa-kicker">Hall of Fame</p>
          <h3 className="mt-2 text-3xl font-semibold leading-tight">
            {cleanDisplayCopy(wrapped.runningGag.name)}
          </h3>
          <p className="mt-1 text-sm text-[#8696A0]">
            {wrapped.runningGag.mentions.length} recorded sightings
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {wrapped.runningGag.mentions.map((mention, index) => (
            <div key={`${mention.sender}-${index}`} className="wa-soft-panel rounded-2xl p-3">
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

  function renderCastWing() {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {wrapped.personalities.map((personality, index) => (
          <PersonalityBadge
            key={personality.member}
            personality={personality}
            index={index}
          />
        ))}
      </div>
    );
  }

  function renderQuoteVault() {
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

  function renderPhotoOrReceiptRoom() {
    if (hasPhotos) {
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {mediaHighlights.map((highlight, index) => (
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
        <div className="wa-soft-panel rounded-2xl p-3">
          <p className="wa-kicker">Emoji Evidence</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.topEmojisOverall.length > 0 ? (
              stats.topEmojisOverall.slice(0, 8).map((emoji) => (
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
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="double texter" value={stats.doubleTexter?.name ? cleanDisplayCopy(stats.doubleTexter.name) : "None"} />
          <StatTile label="double texts" value={formatCount(stats.doubleTexter?.count ?? 0)} />
        </div>
      </div>
    );
  }

  function renderRoomContent() {
    if (currentRoomId === "archive") return renderArchiveHall();
    if (currentRoomId === "stats") return renderStatsArcade();
    if (currentRoomId === "canon") return renderCanonGallery();
    if (currentRoomId === "gag") return renderJokeReliquary();
    if (currentRoomId === "cast") return renderCastWing();
    if (currentRoomId === "quote") return renderQuoteVault();
    return renderPhotoOrReceiptRoom();
  }

  return (
    <div className="wa-screen h-dvh w-full px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+4.8rem)] text-[#E9EDEF]">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 lg:grid lg:grid-cols-[minmax(340px,0.9fr)_minmax(460px,1.1fr)]">
        <section className="wa-panel relative h-[36vh] min-h-[250px] overflow-hidden rounded-[2rem] p-3 lg:h-full">
          <div className="absolute inset-0 wa-wallpaper opacity-70" />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {edges.map(([a, b]) => (
              <line
                key={`${a.id}-${b.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#2A3942"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {rooms.map((room) => {
            const isCurrent = room.id === currentRoomId;
            const isVisited = visited.has(room.id);
            return (
              <button
                key={room.id}
                type="button"
                aria-label={`Enter ${room.title}`}
                onClick={() => enterRoom(room.id)}
                className={`absolute z-10 flex h-12 w-[4.8rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border bg-[#111B21]/95 px-2 text-center shadow-lg backdrop-blur-sm transition ${
                  isCurrent
                    ? "border-[#00A884] text-[#E9EDEF]"
                    : "border-[#2A3942] text-[#AEBAC1]"
                }`}
                style={{ left: `${room.x}%`, top: `${room.y}%` }}
              >
                <span className="truncate text-[10px] font-bold">{room.shortTitle}</span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    isVisited ? "bg-[#25D366]" : "bg-[#2A3942]"
                  }`}
                />
              </button>
            );
          })}

          <motion.div
            className="absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#D9FDD3] bg-[#00A884] text-[10px] font-black text-[#06130D] shadow-[0_12px_30px_rgba(0,168,132,0.35)]"
            animate={{ left: `${currentRoom.x}%`, top: `${currentRoom.y}%` }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            style={{ translateX: "-50%", translateY: "-50%" }}
          >
            YOU
          </motion.div>

          <div className="absolute bottom-3 left-3 z-30 rounded-full border border-[#2A3942] bg-[#111B21]/90 px-3 py-1.5 text-xs font-semibold text-[#AEBAC1] backdrop-blur-sm">
            {visited.size}/{rooms.length} stamps
          </div>
          <div className="absolute bottom-3 right-3 z-30">
            <DPad connections={currentRoom.connections} move={move} />
          </div>
        </section>

        <section className="wa-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem]">
          <div className={`border-b border-[#2A3942] border-l-4 ${currentRoom.accent} bg-[#202C33] px-4 py-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="wa-kicker">{currentRoom.kicker}</p>
                <h2 className="truncate text-2xl font-semibold">{currentRoom.title}</h2>
              </div>
              <span className="shrink-0 rounded-full border border-[#2A3942] bg-[#111B21] px-3 py-1 text-[10px] font-semibold text-[#8696A0]">
                {visited.has(currentRoom.id) ? "Stamped" : "Open"}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRoomId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {renderRoomContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
