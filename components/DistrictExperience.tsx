"use client";

// The Archive District: a walkable overworld where every analyzed chat is a
// museum building, roads connect them through a central plaza, and people
// who appear in multiple chats stand as statues along the way.
//
// Engine patterns (rAF movement, tap-to-move, fog-of-war, minimap, discovery
// splashes) are shared with MuseumExperience - this is the outdoor level.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "@/lib/archive";
import type { DistrictPerson } from "@/lib/people";
import { buildDistrictPeople, districtConnectors } from "@/lib/people";
import { cleanDisplayCopy } from "@/lib/copy";
import GameAvatar from "./GameAvatar";

// ---------------------------------------------------------------------------
// World geometry
// ---------------------------------------------------------------------------

const WORLD = { w: 2400, h: 1600 };
const PLAZA = { x: WORLD.w / 2, y: WORLD.h / 2 };
const PLAZA_R = 170;
const SPEED = 4.6;
const INTERACT_RADIUS = 96;
const TORCH_RADIUS = 240;

const BUILDING = { w: 300, h: 210 };

interface Point {
  x: number;
  y: number;
}

/**
 * Museum lots sit on a ring around the plaza. Slots alternate sides and
 * stagger the radius so the skyline doesn't look like a clock face.
 */
function buildingSlot(index: number, total: number): Point {
  const golden = 2.399963; // radians - keeps any count of buildings spread out
  const angle = -Math.PI / 2 + index * (total <= 6 ? (Math.PI * 2) / Math.max(3, total) : golden);
  const radius = 480 + (index % 2) * 150;
  return {
    x: Math.round(PLAZA.x + Math.cos(angle) * radius),
    y: Math.round(PLAZA.y + Math.sin(angle) * radius * 0.72),
  };
}

interface MuseumLot {
  entry: ArchiveEntry;
  center: Point;
  door: Point;
  accent: string;
}

const LOT_ACCENTS = ["#25D366", "#E9B44C", "#7FB3D5", "#E88D67", "#B8A9E8", "#8FD5A6"];

function clampToWorld(p: Point, margin: number): Point {
  return {
    x: Math.max(margin, Math.min(WORLD.w - margin, p.x)),
    y: Math.max(margin, Math.min(WORLD.h - margin, p.y)),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type DistrictSaveState =
  | { kind: "guest" }
  | { kind: "saving" }
  | { kind: "saved"; userName: string }
  | { kind: "error"; message: string };

interface DistrictExperienceProps {
  entries: ArchiveEntry[];
  saveState: DistrictSaveState;
  onEnterMuseum: (entry: ArchiveEntry) => void;
  onAddChat: () => void;
  onSignIn: () => void;
  onSignOut?: () => void;
  onDeleteEntry?: (entryId: string) => void;
}

type SheetState =
  | { kind: "none" }
  | { kind: "person"; person: DistrictPerson }
  | { kind: "records" };

interface Footprint {
  id: number;
  x: number;
  y: number;
}

export default function DistrictExperience({
  entries,
  saveState,
  onEnterMuseum,
  onAddChat,
  onSignIn,
  onSignOut,
  onDeleteEntry,
}: DistrictExperienceProps) {
  // --- Derived world -------------------------------------------------------
  const lots = useMemo<MuseumLot[]>(
    () =>
      entries.map((entry, i) => {
        const center = clampToWorld(buildingSlot(i, entries.length), 260);
        return {
          entry,
          center,
          door: { x: center.x, y: center.y + BUILDING.h / 2 + 26 },
          accent: LOT_ACCENTS[i % LOT_ACCENTS.length],
        };
      }),
    [entries]
  );

  const people = useMemo(() => buildDistrictPeople(entries), [entries]);
  const connectors = useMemo(() => districtConnectors(people), [people]);

  // Statues stand at the midpoint of the corridor between the two museums
  // the person is most active in (offset perpendicular so they flank the road).
  const statues = useMemo(() => {
    return connectors.slice(0, 10).map((person, i) => {
      const a = lots.find((l) => l.entry.id === person.chats[0]?.entryId);
      const b = lots.find((l) => l.entry.id === person.chats[1]?.entryId);
      const from = a?.door ?? PLAZA;
      const to = b?.door ?? PLAZA;
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      // Perpendicular offset so statues don't sit exactly on the walking line.
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const off = 54 * (i % 2 === 0 ? 1 : -1);
      return {
        person,
        pos: clampToWorld(
          { x: mid.x + (-dy / len) * off, y: mid.y + (dx / len) * off },
          120
        ),
      };
    });
  }, [connectors, lots]);

  const recordsOffice = useMemo<Point>(() => ({ x: PLAZA.x, y: PLAZA.y - 26 }), []);

  // --- Player state --------------------------------------------------------
  const START = useMemo<Point>(() => ({ x: PLAZA.x, y: PLAZA.y + PLAZA_R + 60 }), []);
  const [player, setPlayer] = useState<Point>(START);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [lightsOn, setLightsOn] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [visitedLots, setVisitedLots] = useState<Set<string>>(() => new Set());
  const [splash, setSplash] = useState<{ title: string; sub: string; accent: string } | null>(null);

  // playerRef is written only by the movement tick (the sole place the
  // player moves), never during render - see the rAF loop below.
  const playerRef = useRef(player);
  const keysRef = useRef<Set<string>>(new Set());
  const targetRef = useRef<Point | null>(null);
  const sheetOpenRef = useRef(false);
  const visitedLotsRef = useRef<Set<string>>(new Set());
  const worldRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const footprintId = useRef(0);

  useEffect(() => {
    sheetOpenRef.current = sheet.kind !== "none";
  }, [sheet]);

  // --- Input ---------------------------------------------------------------
  useEffect(() => {
    const KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
    function down(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (KEYS.has(k)) {
        if (sheetOpenRef.current) return;
        e.preventDefault();
        keysRef.current.add(k);
        targetRef.current = null;
      }
      if (k === "escape") setSheet({ kind: "none" });
    }
    function up(e: KeyboardEvent) {
      keysRef.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const handleFloorTap = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (sheetOpenRef.current) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const world = worldRef.current;
    if (!world) return;
    const rect = world.getBoundingClientRect();
    targetRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * WORLD.w,
      y: ((event.clientY - rect.top) / rect.height) * WORLD.h,
    };
  }, []);

  const dpad = useCallback((key: string, pressed: boolean) => {
    if (pressed) {
      keysRef.current.add(key);
      targetRef.current = null;
    } else {
      keysRef.current.delete(key);
    }
  }, []);

  // --- Movement loop -------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let lastFootprint = 0;

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (sheetOpenRef.current) return;

      const keys = keysRef.current;
      let vx = 0;
      let vy = 0;

      if (keys.size > 0) {
        if (keys.has("w") || keys.has("arrowup")) vy -= 1;
        if (keys.has("s") || keys.has("arrowdown")) vy += 1;
        if (keys.has("a") || keys.has("arrowleft")) vx -= 1;
        if (keys.has("d") || keys.has("arrowright")) vx += 1;
      } else if (targetRef.current) {
        const t = targetRef.current;
        const dx = t.x - playerRef.current.x;
        const dy = t.y - playerRef.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < SPEED * 1.5) {
          targetRef.current = null;
        } else {
          vx = dx / dist;
          vy = dy / dist;
        }
      }

      const isMoving = vx !== 0 || vy !== 0;
      setMoving((m) => (m === isMoving ? m : isMoving));
      if (vx !== 0) setFacing(vx > 0 ? 1 : -1);
      if (!isMoving) return;

      const len = Math.hypot(vx, vy);
      const next = clampToWorld(
        {
          x: playerRef.current.x + (vx / len) * SPEED,
          y: playerRef.current.y + (vy / len) * SPEED,
        },
        24
      );
      playerRef.current = next;
      setPlayer(next);

      if (now - lastFootprint > 210) {
        lastFootprint = now;
        const fp = { id: footprintId.current++, x: next.x, y: next.y + 16 };
        setFootprints((prev) => [...prev.slice(-11), fp]);
      }

      // Lot discovery rides the movement tick (the only place the player
      // moves) instead of an effect reacting to `player` state - the ref
      // gates duplicates so each lot announces exactly once.
      for (const lot of lots) {
        if (visitedLotsRef.current.has(lot.entry.id)) continue;
        const dist = Math.hypot(next.x - lot.center.x, next.y - lot.center.y);
        if (dist < 300) {
          visitedLotsRef.current.add(lot.entry.id);
          setVisitedLots((prev) => new Set(prev).add(lot.entry.id));
          setSplash({
            title: cleanDisplayCopy(lot.entry.chatName),
            sub: `Museum ${String(lots.indexOf(lot) + 1).padStart(2, "0")} - on the register`,
            accent: lot.accent,
          });
          window.setTimeout(() => setSplash(null), 2400);
          break;
        }
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lots]);

  // --- Proximity ------------------------------------------------------------
  const nearLot = useMemo(
    () =>
      lots.find((lot) => Math.hypot(player.x - lot.door.x, player.y - lot.door.y) < INTERACT_RADIUS) ??
      null,
    [player, lots]
  );
  const nearStatue = useMemo(
    () =>
      statues.find((s) => Math.hypot(player.x - s.pos.x, player.y - s.pos.y) < INTERACT_RADIUS - 20) ??
      null,
    [player, statues]
  );
  const nearRecords = useMemo(
    () => Math.hypot(player.x - recordsOffice.x, player.y - recordsOffice.y) < INTERACT_RADIUS + 30,
    [player, recordsOffice]
  );

  // Enter with E key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "e" || sheetOpenRef.current) return;
      if (nearLot) onEnterMuseum(nearLot.entry);
      else if (nearStatue) setSheet({ kind: "person", person: nearStatue.person });
      else if (nearRecords) setSheet({ kind: "records" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearLot, nearStatue, nearRecords, onEnterMuseum]);

  // --- Camera ---------------------------------------------------------------
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  useEffect(() => {
    function measure() {
      const el = viewportRef.current;
      if (el) setViewport({ w: el.clientWidth, h: el.clientHeight });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const camX = Math.max(0, Math.min(WORLD.w - viewport.w, player.x - viewport.w / 2));
  const camY = Math.max(0, Math.min(WORLD.h - viewport.h, player.y - viewport.h / 2));

  const totalMessages = entries.reduce((sum, e) => sum + e.stats.totalMessages, 0);

  return (
    <div
      ref={viewportRef}
      // The camera positions the world via transform; if the browser focus-
      // scrolls this overflow-hidden container (clicking a button deep in the
      // oversized world), every absolute overlay drifts. Pin it to 0,0.
      onScroll={(e) => {
        e.currentTarget.scrollLeft = 0;
        e.currentTarget.scrollTop = 0;
      }}
      className="relative h-dvh w-full overflow-hidden bg-[#040906] text-[#E9EDE9]"
    >
      {/* ------------------------------------------------------ world layer */}
      <div
        ref={worldRef}
        onPointerDown={handleFloorTap}
        className="absolute left-0 top-0 cursor-pointer"
        style={{
          width: WORLD.w,
          height: WORLD.h,
          transform: `translate3d(${-camX}px, ${-camY}px, 0)`,
        }}
      >
        {/* ground */}
        <div
          className="absolute inset-0 bg-[#050C09]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, #071009 0%, transparent 50%), radial-gradient(circle at 70% 80%, #06100A 0%, transparent 50%), repeating-linear-gradient(0deg, transparent 0 47px, #0A130D 47px 48px), repeating-linear-gradient(90deg, transparent 0 47px, #0A130D 47px 48px)",
          }}
        />

        {/* roads (SVG so diagonals stay crisp) */}
        <svg
          className="absolute inset-0"
          width={WORLD.w}
          height={WORLD.h}
          viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
          aria-hidden="true"
        >
          {lots.map((lot) => (
            <g key={lot.entry.id}>
              <line
                x1={PLAZA.x}
                y1={PLAZA.y}
                x2={lot.door.x}
                y2={lot.door.y}
                stroke="#101A12"
                strokeWidth={44}
                strokeLinecap="round"
              />
              <line
                x1={PLAZA.x}
                y1={PLAZA.y}
                x2={lot.door.x}
                y2={lot.door.y}
                stroke="#16241A"
                strokeWidth={3}
                strokeDasharray="10 14"
              />
            </g>
          ))}
          {/* corridor between statue-linked museums */}
          {statues.map(({ person, pos }) => (
            <circle key={person.id} cx={pos.x} cy={pos.y} r={40} fill="#0B140E" />
          ))}
          <circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA_R} fill="#0C1610" stroke="#1A2A1E" strokeWidth={2} />
          <circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA_R - 22} fill="none" stroke="#16241A" strokeWidth={2} strokeDasharray="4 10" />
        </svg>

        {/* plaza label */}
        <p
          className="mono-label absolute -translate-x-1/2 text-[#3D4A40]"
          style={{ left: PLAZA.x, top: PLAZA.y + 74 }}
        >
          Founders&apos; Plaza
        </p>

        {/* footprints */}
        {footprints.map((fp) => (
          <span
            key={fp.id}
            className="absolute h-1 w-2 -translate-x-1/2 animate-[fadeout_1.6s_forwards] bg-[#1E2C21]"
            style={{ left: fp.x, top: fp.y }}
          />
        ))}

        {/* records office - center of the plaza */}
        <button
          type="button"
          onClick={() => setSheet({ kind: "records" })}
          className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
          style={{ left: recordsOffice.x, top: recordsOffice.y }}
        >
          <span
            className={`relative block border-2 bg-[#0B120D] px-5 pb-4 pt-3 transition-colors ${
              nearRecords ? "border-[#25D366]" : "border-[#1E2A20]"
            }`}
          >
            {/* pediment */}
            <span className="absolute -top-4 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[46px] border-b-[16px] border-x-transparent border-b-[#1E2A20]" />
            <span className="mono-label block text-[#25D366]">Records</span>
            <span className="block text-lg font-black uppercase leading-none tracking-normal">Office</span>
            <span className="mt-1.5 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-4 w-2 bg-[#16241A]" />
              ))}
            </span>
          </span>
          {nearRecords && (
            <span className="mono-label absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap bg-[#25D366] px-2 py-1 text-[#04140A]">
              Enter
            </span>
          )}
        </button>

        {/* museums */}
        {lots.map((lot, i) => {
          const isNear = nearLot?.entry.id === lot.entry.id;
          const visited = visitedLots.has(lot.entry.id);
          return (
            <button
              key={lot.entry.id}
              type="button"
              onClick={() => onEnterMuseum(lot.entry)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
              style={{ left: lot.center.x, top: lot.center.y, width: BUILDING.w }}
            >
              <span
                className="relative block border-2 bg-[#0A0F0B] px-4 pb-5 pt-3 transition-colors"
                style={{
                  borderColor: isNear ? lot.accent : visited ? "#22301F" : "#141D16",
                  height: BUILDING.h,
                }}
              >
                {/* roofline */}
                <span
                  className="absolute -top-3 left-3 right-3 h-3 border-x-2 border-t-2"
                  style={{ borderColor: isNear ? lot.accent : "#141D16" }}
                />
                <span className="mono-label block" style={{ color: lot.accent }}>
                  {`Museum ${String(i + 1).padStart(2, "0")}${lot.entry.year ? ` · ${lot.entry.year}` : ""}`}
                </span>
                <span className="mt-1 block truncate text-2xl font-black uppercase leading-[0.95] tracking-normal">
                  {cleanDisplayCopy(lot.entry.chatName)}
                </span>
                <span className="mono-label mt-2 block text-[#7D8880]">
                  {`${lot.entry.stats.totalMessages.toLocaleString()} msgs · ${lot.entry.stats.members.length} members`}
                </span>
                {/* facade columns */}
                <span className="absolute bottom-3 left-4 right-4 flex justify-between">
                  {[0, 1, 2, 3, 4].map((c) => (
                    <span key={c} className="h-8 w-3 bg-[#131C15]" />
                  ))}
                </span>
                {/* door */}
                <span
                  className="absolute -bottom-0.5 left-1/2 h-10 w-8 -translate-x-1/2 border-2 border-b-0"
                  style={{
                    borderColor: isNear ? lot.accent : "#1E2A20",
                    backgroundColor: isNear ? "rgba(37,211,102,0.12)" : "#050906",
                  }}
                />
                {visited && (
                  <span className="mono-label absolute right-2 top-2 rotate-6 border border-current px-1 text-[#25D366]">
                    Logged
                  </span>
                )}
              </span>
              {isNear && (
                <span className="mono-label absolute left-1/2 top-full mt-3 -translate-x-1/2 animate-pulse whitespace-nowrap px-2 py-1"
                  style={{ backgroundColor: lot.accent, color: "#04140A" }}
                >
                  Enter museum
                </span>
              )}
            </button>
          );
        })}

        {/* statues */}
        {statues.map(({ person, pos }) => {
          const isNear = nearStatue?.person.id === person.id;
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => setSheet({ kind: "person", person })}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: pos.x, top: pos.y }}
            >
              {/* plinth + figure */}
              <span className="relative mx-auto block h-16 w-10">
                <span
                  className={`absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full border-2 bg-[#101A12] transition-colors ${
                    isNear ? "border-[#E9B44C]" : "border-[#2A3A2C]"
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-6 h-6 w-9 -translate-x-1/2 border-2 border-b-0 bg-[#101A12] transition-colors ${
                    isNear ? "border-[#E9B44C]" : "border-[#2A3A2C]"
                  }`}
                />
                <span className="absolute bottom-0 left-1/2 h-3 w-12 -translate-x-1/2 bg-[#1A2A1E]" />
              </span>
              <span
                className={`mono-label mt-1 block whitespace-nowrap transition-colors ${
                  isNear ? "text-[#E9B44C]" : "text-[#55605A]"
                }`}
              >
                {cleanDisplayCopy(person.displayName)}
              </span>
              {isNear && (
                <span className="mono-label absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap bg-[#E9B44C] px-2 py-1 text-[#141005]">
                  Read plaque
                </span>
              )}
            </button>
          );
        })}

        {/* construction site: add another chat */}
        <button
          type="button"
          onClick={onAddChat}
          className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
          style={{
            left: clampToWorld(buildingSlot(entries.length, entries.length + 1), 260).x,
            top: clampToWorld(buildingSlot(entries.length, entries.length + 1), 260).y,
            width: BUILDING.w * 0.85,
          }}
        >
          <span className="block border-2 border-dashed border-[#22301F] bg-transparent px-4 py-6 transition-colors group-hover:border-[#25D366]">
            <span className="mono-label block text-[#55605A] transition-colors group-hover:text-[#25D366]">
              Vacant lot
            </span>
            <span className="mt-1 block text-xl font-black uppercase leading-none tracking-normal text-[#7D8880]">
              + Fund a museum
            </span>
            <span className="mono-label mt-2 block text-[#3D4A40]">Upload another chat export</span>
          </span>
        </button>

        {/* player */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: player.x, top: player.y }}
        >
          <GameAvatar moving={moving} facing={facing} />
        </div>

        {/* fog of war */}
        {!lightsOn && (
          <div
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle ${TORCH_RADIUS}px at ${player.x}px ${player.y}px, transparent 0%, rgba(37,211,102,0.04) 55%, rgba(2,6,3,0.94) 100%)`,
            }}
          />
        )}
      </div>

      {/* ------------------------------------------------------ discovery splash */}
      {splash && (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-40 flex flex-col items-center px-6 text-center">
          <p className="mono-label animate-pulse" style={{ color: splash.accent }}>
            {splash.sub}
          </p>
          <p
            className="mt-1 text-balance text-4xl font-black uppercase leading-none tracking-normal sm:text-5xl"
            style={{ textShadow: `0 0 40px ${splash.accent}66` }}
          >
            {splash.title}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------ HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.9rem)] z-40 flex items-start justify-between px-3">
        <div className="pointer-events-auto border border-[#242C25] bg-[#0A0E0B]/92 px-3 py-2 backdrop-blur-md">
          <p className="mono-label text-[#25D366]">The Archive District</p>
          <p className="mono-label mt-0.5 text-[#7D8880]">
            {`${entries.length} museum${entries.length === 1 ? "" : "s"} · ${totalMessages.toLocaleString()} msgs on file`}
          </p>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* minimap */}
          <div className="relative h-[72px] w-[108px] border border-[#242C25] bg-[#0A0E0B]/92 backdrop-blur-md">
            {lots.map((lot) => (
              <span
                key={lot.entry.id}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: (lot.center.x / WORLD.w) * 108,
                  top: (lot.center.y / WORLD.h) * 72,
                  backgroundColor: visitedLots.has(lot.entry.id) ? lot.accent : "#22301F",
                }}
              />
            ))}
            <span
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E9EDE9]"
              style={{ left: (player.x / WORLD.w) * 108, top: (player.y / WORLD.h) * 72 }}
            />
          </div>
          <button
            type="button"
            onClick={() => setLightsOn((v) => !v)}
            className={`mono-label border px-2.5 py-1.5 shadow-lg backdrop-blur-md transition-colors ${
              lightsOn
                ? "border-[#25D366] bg-[#25D366] text-[#06130D]"
                : "border-[#242C25] bg-[#0A0E0B]/92 text-[#7D8880] hover:text-[#E9EDE9]"
            }`}
          >
            {lightsOn ? "Lights on" : "Lights off"}
          </button>
        </div>
      </div>

      {/* save status strip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.9rem)] z-40 flex items-end justify-between px-3">
        <div className="pointer-events-auto">
          {saveState.kind === "guest" && (
            <button
              type="button"
              onClick={onSignIn}
              className="mono-label border border-[#25D366] bg-[#0A0E0B]/92 px-3 py-2 text-[#25D366] backdrop-blur-md transition-colors hover:bg-[#25D366] hover:text-[#04140A]"
            >
              Sign in to save the district →
            </button>
          )}
          {saveState.kind === "saving" && (
            <p className="mono-label border border-[#242C25] bg-[#0A0E0B]/92 px-3 py-2 text-[#7D8880] backdrop-blur-md">
              Filing to archive...
            </p>
          )}
          {saveState.kind === "saved" && (
            <div className="flex gap-px">
              <a
                href="/settings"
                className="mono-label border border-[#242C25] bg-[#0A0E0B]/92 px-3 py-2 text-[#7D8880] backdrop-blur-md transition-colors hover:text-[#E9EDE9]"
                title="Curator settings"
              >
                <span className="text-[#25D366]">Saved</span>
                {` · ${saveState.userName}`}
              </a>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mono-label border border-[#242C25] bg-[#0A0E0B]/92 px-3 py-2 text-[#55605A] backdrop-blur-md transition-colors hover:text-[#E9EDE9]"
                >
                  Sign out
                </button>
              )}
            </div>
          )}
          {saveState.kind === "error" && (
            <p className="mono-label border border-[#5C2A2A] bg-[#1A0D0D]/92 px-3 py-2 text-[#E88] backdrop-blur-md">
              {saveState.message}
            </p>
          )}
        </div>

        {/* d-pad (mobile) */}
        <div className="pointer-events-auto grid grid-cols-3 gap-1 sm:hidden" aria-hidden="true">
          <span />
          <DpadButton label="↑" onHold={(p) => dpad("w", p)} />
          <span />
          <DpadButton label="←" onHold={(p) => dpad("a", p)} />
          <DpadButton label="↓" onHold={(p) => dpad("s", p)} />
          <DpadButton label="→" onHold={(p) => dpad("d", p)} />
        </div>
      </div>

      {/* ------------------------------------------------------ sheets */}
      {sheet.kind === "person" && (
        <PersonSheet person={sheet.person} onClose={() => setSheet({ kind: "none" })} />
      )}
      {sheet.kind === "records" && (
        <RecordsSheet
          entries={entries}
          people={people}
          saveState={saveState}
          onSignIn={onSignIn}
          onSelectPerson={(person) => setSheet({ kind: "person", person })}
          onClose={() => setSheet({ kind: "none" })}
          onDeleteEntry={onDeleteEntry}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// D-pad
// ---------------------------------------------------------------------------

function DpadButton({ label, onHold }: { label: string; onHold: (pressed: boolean) => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      className="flex h-11 w-11 items-center justify-center border border-[#242C25] bg-[#0A0E0B]/92 font-mono text-sm text-[#7D8880] backdrop-blur-md active:bg-[#25D366] active:text-[#04140A]"
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Person dossier sheet
// ---------------------------------------------------------------------------

function PersonSheet({ person, onClose }: { person: DistrictPerson; onClose: () => void }) {
  return (
    <SheetFrame accent="#E9B44C" onClose={onClose}>
      <p className="mono-label text-[#E9B44C]">
        {`District figure · appears in ${person.chats.length} chat${person.chats.length === 1 ? "" : "s"}`}
      </p>
      <h2 className="mt-2 text-balance text-4xl font-black uppercase leading-[0.92] tracking-normal">
        {cleanDisplayCopy(person.displayName)}
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-px border border-[#242C25] bg-[#242C25]">
        <div className="bg-[#0A0E0B] p-3">
          <p className="mono-label text-[#7D8880]">Total messages</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
            {person.totalMessages.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#0A0E0B] p-3">
          <p className="mono-label text-[#7D8880]">Total words</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
            {person.totalWords.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {person.chats.map((record) => (
          <div key={record.entryId} className="border-l-2 border-[#242C25] pl-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="mono-label truncate text-[#E9EDE9]">
                {cleanDisplayCopy(record.chatName)}
              </p>
              <p className="mono-label shrink-0 text-[#7D8880]">
                {`#${record.rank} · ${Math.round(record.share * 100)}% of chat`}
              </p>
            </div>
            <p className="mono-label mt-1 text-[#7D8880]">
              {`${record.memberStats.messageCount.toLocaleString()} msgs`}
              {record.memberStats.topEmojis[0] ? ` · favorite ${record.memberStats.topEmojis[0].emoji}` : ""}
            </p>
            {record.archetype && (
              <p className="mt-2 text-sm font-bold uppercase tracking-wide text-[#E9B44C]">
                &ldquo;{cleanDisplayCopy(record.archetype.archetype)}&rdquo;
              </p>
            )}
            {record.archetype?.roastLine && (
              <p className="mt-1 text-sm leading-relaxed text-[#ADB5AD]">
                {cleanDisplayCopy(record.archetype.roastLine)}
              </p>
            )}
            {record.quote && (
              <blockquote className="mt-2 border-l-2 border-[#E9B44C] pl-2 text-sm italic leading-relaxed text-[#E9EDE9]">
                &ldquo;{cleanDisplayCopy(record.quote.text)}&rdquo;
              </blockquote>
            )}
          </div>
        ))}
      </div>
    </SheetFrame>
  );
}

// ---------------------------------------------------------------------------
// Records office sheet
// ---------------------------------------------------------------------------

function RecordsSheet({
  entries,
  people,
  saveState,
  onSignIn,
  onSelectPerson,
  onClose,
  onDeleteEntry,
}: {
  entries: ArchiveEntry[];
  people: DistrictPerson[];
  saveState: DistrictSaveState;
  onSignIn: () => void;
  onSelectPerson: (person: DistrictPerson) => void;
  onClose: () => void;
  onDeleteEntry?: (entryId: string) => void;
}) {
  const totalMessages = entries.reduce((sum, e) => sum + e.stats.totalMessages, 0);
  const totalWords = entries.reduce((sum, e) => sum + e.stats.totalWords, 0);
  const connectors = people.filter((p) => p.isConnector);

  return (
    <SheetFrame accent="#25D366" onClose={onClose}>
      <p className="mono-label text-[#25D366]">Records Office · district ledger</p>
      <h2 className="mt-2 text-4xl font-black uppercase leading-[0.92] tracking-normal">
        The full account
      </h2>

      <div className="mt-5 grid grid-cols-3 gap-px border border-[#242C25] bg-[#242C25]">
        {[
          { label: "Museums", value: entries.length.toLocaleString() },
          { label: "Messages", value: totalMessages.toLocaleString() },
          { label: "Words", value: totalWords.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0A0E0B] p-3">
            <p className="mono-label text-[#7D8880]">{stat.label}</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="mono-label mt-6 border-b border-[#242C25] pb-2 text-[#7D8880]">
        {`Museums on file (${entries.length})`}
      </p>
      <div className="flex flex-col">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-baseline justify-between gap-3 border-b border-[#141D16] py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold uppercase tracking-wide">
                {cleanDisplayCopy(entry.chatName)}
              </span>
              <span className="mono-label mt-0.5 block text-[#55605A]">
                {entry.year ?? "All time"} &middot;{" "}
                {`${entry.stats.totalMessages.toLocaleString()} msgs`}
              </span>
            </span>
            {onDeleteEntry && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Demolish the ${cleanDisplayCopy(entry.chatName)} museum? This can't be undone.`)) {
                    onDeleteEntry(entry.id);
                  }
                }}
                className="mono-label shrink-0 border border-[#242C25] px-2 py-1 text-[#7D8880] transition-colors hover:border-red-400 hover:text-red-300"
              >
                Demolish
              </button>
            )}
          </div>
        ))}
      </div>

      {connectors.length > 0 && (
        <>
          <p className="mono-label mt-6 border-b border-[#242C25] pb-2 text-[#7D8880]">
            {`Connectors - in multiple chats (${connectors.length})`}
          </p>
          <div className="flex flex-col">
            {connectors.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onSelectPerson(person)}
                className="flex items-baseline justify-between gap-3 border-b border-[#141D16] py-2.5 text-left transition-colors hover:bg-[#0D130E]"
              >
                <span className="truncate text-sm font-bold uppercase tracking-wide">
                  {cleanDisplayCopy(person.displayName)}
                </span>
                <span className="mono-label shrink-0 text-[#7D8880]">
                  {`${person.chats.length} chats · ${person.totalMessages.toLocaleString()} msgs`}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mono-label mt-6 border-b border-[#242C25] pb-2 text-[#7D8880]">
        {`Everyone on record (${people.length})`}
      </p>
      <div className="flex flex-col">
        {people.slice(0, 24).map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => onSelectPerson(person)}
            className="flex items-baseline justify-between gap-3 border-b border-[#141D16] py-2 text-left transition-colors hover:bg-[#0D130E]"
          >
            <span className="mono-label truncate text-[#E9EDE9]">
              {cleanDisplayCopy(person.displayName)}
            </span>
            <span className="mono-label shrink-0 text-[#55605A]">
              {person.totalMessages.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {saveState.kind === "guest" && (
        <button
          type="button"
          onClick={onSignIn}
          className="mt-6 w-full bg-[#25D366] px-4 py-3.5 text-sm font-black uppercase tracking-widest text-[#04140A] transition-opacity hover:opacity-90"
        >
          Sign in to save this district →
        </button>
      )}
    </SheetFrame>
  );
}

// ---------------------------------------------------------------------------
// Shared sheet frame
// ---------------------------------------------------------------------------

function SheetFrame({
  accent,
  onClose,
  children,
}: {
  accent: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        className="wa-message-scroll relative max-h-[82dvh] w-full max-w-lg overflow-y-auto border-t-4 bg-[#070B08] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:border-4 sm:p-6"
        style={{ borderColor: accent }}
      >
        <button
          type="button"
          onClick={onClose}
          className="mono-label absolute right-4 top-4 border border-[#242C25] px-2 py-1 text-[#7D8880] transition-colors hover:text-[#E9EDE9]"
        >
          Close
        </button>
        {children}
      </div>
    </div>
  );
}
