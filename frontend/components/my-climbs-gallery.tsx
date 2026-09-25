"use client";

import Image from "next/image";
import { CalendarDays, ChevronDown, Mountain, Pencil, TrendingUp } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc";

const PINNED_CLIMBS_KEY = "ambangeg:pinned-climbs";
const PINNED_CLIMBS_EVENT = "ambangeg:pinned-climbs-change";
const MAX_PINNED_CLIMBS = 3;

const climbs = [
  {
    name: "Mt. Pulag",
    location: "Benguet",
    climbedOn: "2026-09-14",
    elevation: "2,928 masl",
    photo: "/assets/hike_20260902_224742-1707.jpg",
    photoPosition: "50% 42%",
  },
  {
    name: "Mt. Guiting-Guiting",
    location: "Romblon",
    climbedOn: "2026-08-29",
    elevation: "2,058 masl",
    photo: "/assets/sibuyan_PXL_20260829_051147406.jpg",
    photoPosition: "50% 48%",
  },
  {
    name: "Mt. Ulap",
    location: "Benguet",
    climbedOn: "2026-07-18",
    elevation: "1,846 masl",
    photo: "/assets/hike_20260902_172653-1190.jpg",
    photoPosition: "50% 45%",
  },
  {
    name: "Mt. Daraitan",
    location: "Rizal",
    climbedOn: "2026-05-03",
    elevation: "739 masl",
    photo: "/assets/sibuyan_0f35c182-dda7-4c56-a413-dd37c1cf72bf.jpg",
    photoPosition: "50% 45%",
  },
  {
    name: "Mt. Batulao",
    location: "Batangas",
    climbedOn: "2026-03-22",
    elevation: "811 masl",
    photo: "/assets/hike_20260902_172653-1190.jpg",
    photoPosition: "74% 55%",
  },
  {
    name: "Mt. Apo",
    location: "Davao del Sur",
    climbedOn: "2025-12-07",
    elevation: "2,954 masl",
    photo: "/assets/sibuyan_0f35c182-dda7-4c56-a413-dd37c1cf72bf.jpg",
    photoPosition: "30% 45%",
  },
  {
    name: "Mt. Pinatubo",
    location: "Zambales",
    climbedOn: "2025-10-19",
    elevation: "1,486 masl",
    photo: "/assets/sibuyan_PXL_20260829_051147406.jpg",
    photoPosition: "28% 58%",
  },
  {
    name: "Mt. Makiling",
    location: "Laguna",
    climbedOn: "2025-08-10",
    elevation: "1,090 masl",
    photo: "/assets/hike_20260902_224742-1707.jpg",
    photoPosition: "72% 52%",
  },
] as const;

const sortLabels: Record<SortOption, string> = {
  "date-desc": "Latest climbed",
  "date-asc": "Oldest climbed",
  "name-asc": "Name: A–Z",
  "name-desc": "Name: Z–A",
};

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function subscribeToPinnedClimbs(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PINNED_CLIMBS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PINNED_CLIMBS_EVENT, onStoreChange);
  };
}

function getPinnedClimbsSnapshot() {
  return window.localStorage.getItem(PINNED_CLIMBS_KEY) ?? "[]";
}

function getPinnedClimbsServerSnapshot() {
  return "[]";
}

function PinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3h8l-1.25 7L18 13v2H6v-2l3.25-3L8 3Z" />
      <path d="M12 15v6" />
    </svg>
  );
}

export function MyClimbsGallery() {
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [isEditingPins, setIsEditingPins] = useState(false);
  const pinnedClimbsJson = useSyncExternalStore(
    subscribeToPinnedClimbs,
    getPinnedClimbsSnapshot,
    getPinnedClimbsServerSnapshot,
  );

  const pinnedClimbNames = useMemo(() => {
    try {
      const savedValue: unknown = JSON.parse(pinnedClimbsJson);
      if (!Array.isArray(savedValue)) return [];

      const climbNames = new Set(climbs.map((climb) => climb.name));
      return savedValue
        .filter((name): name is string => typeof name === "string" && climbNames.has(name as (typeof climbs)[number]["name"]))
        .slice(0, MAX_PINNED_CLIMBS);
    } catch {
      return [];
    }
  }, [pinnedClimbsJson]);

  const orderedClimbs = useMemo(() => {
    const sortedClimbs = [...climbs].sort((first, second) => {
      if (sortBy === "date-desc") return second.climbedOn.localeCompare(first.climbedOn);
      if (sortBy === "date-asc") return first.climbedOn.localeCompare(second.climbedOn);
      if (sortBy === "name-desc") return second.name.localeCompare(first.name);
      return first.name.localeCompare(second.name);
    });

    const pinnedClimbs = pinnedClimbNames
      .map((name) => climbs.find((climb) => climb.name === name))
      .filter((climb): climb is (typeof climbs)[number] => Boolean(climb));
    const unpinnedClimbs = sortedClimbs.filter((climb) => !pinnedClimbNames.includes(climb.name));

    return [...pinnedClimbs, ...unpinnedClimbs];
  }, [pinnedClimbNames, sortBy]);

  const togglePinnedClimb = (climbName: (typeof climbs)[number]["name"]) => {
    const isPinned = pinnedClimbNames.includes(climbName);
    if (!isPinned && pinnedClimbNames.length >= MAX_PINNED_CLIMBS) return;

    const nextPinnedClimbs = isPinned
      ? pinnedClimbNames.filter((name) => name !== climbName)
      : [...pinnedClimbNames, climbName];

    window.localStorage.setItem(PINNED_CLIMBS_KEY, JSON.stringify(nextPinnedClimbs));
    window.dispatchEvent(new Event(PINNED_CLIMBS_EVENT));
  };

  return (
    <section className="mt-7 lg:mt-10" aria-labelledby="climbs-heading">
      <div className="mb-7 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#2a2a2a] p-5 sm:p-6 lg:flex lg:items-end lg:justify-between lg:px-8 lg:py-7">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-turquoise">
            <TrendingUp className="size-4" aria-hidden="true" />
            Trail progress
          </p>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-5xl font-semibold tracking-[-0.06em] text-white">{climbs.length}</p>
            <p className="max-w-28 text-sm leading-5 text-zinc-400">summits in your collection</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5 lg:mt-0 lg:w-[390px] lg:border-l lg:border-t-0 lg:pb-1 lg:pl-8 lg:pt-0">
          <div>
            <p className="text-xs text-zinc-500">Highest climb</p>
            <p className="mt-1 text-sm font-medium text-zinc-100">Mt. Apo</p>
            <p className="text-xs text-zinc-400">2,954 masl</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Latest climb</p>
            <p className="mt-1 text-sm font-medium text-zinc-100">Mt. Pulag</p>
            <p className="text-xs text-zinc-400">14 Sep 2026</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
          <h2 id="climbs-heading" className="text-xl font-semibold tracking-tight text-white lg:text-2xl">
            Your summit circles
          </h2>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            {isEditingPins
              ? `Choose up to 3 favourites · ${pinnedClimbNames.length}/${MAX_PINNED_CLIMBS} pinned`
              : pinnedClimbNames.length > 0
                ? `${pinnedClimbNames.length} pinned mountain${pinnedClimbNames.length === 1 ? "" : "s"} shown first`
                : "Every circle holds a trail story."}
          </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingPins((isEditing) => !isEditing)}
            aria-pressed={isEditingPins}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors sm:px-4 ${
              isEditingPins
                ? "border-turquoise/60 bg-turquoise/15 text-turquoise hover:bg-turquoise/20"
                : "border-white/10 bg-[#363636] text-zinc-200 hover:border-white/20 hover:bg-[#404040]"
            }`}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {isEditingPins ? "Done" : "Edit"}
          </button>
        </div>

        <label className="relative mt-4 block w-full sm:ml-auto sm:w-fit">
          <span className="sr-only">Sort climbs</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="h-11 w-full appearance-none rounded-full border border-white/10 bg-[#363636] py-0 pl-4 pr-10 text-xs font-medium text-zinc-100 outline-none transition-colors hover:border-white/20 focus:border-turquoise focus:ring-2 focus:ring-turquoise/20 sm:w-auto sm:text-sm"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value} className="bg-[#303030]">
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-8 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12 xl:grid-cols-5">
        {orderedClimbs.map((climb, index) => {
          const isPinned = pinnedClimbNames.includes(climb.name);
          const pinLimitReached = pinnedClimbNames.length >= MAX_PINNED_CLIMBS && !isPinned;

          return (
          <article key={climb.name} className="group min-w-0 text-center">
            <div className="relative mx-auto aspect-square w-full max-w-[180px] rounded-full bg-[#303030] p-1.5 shadow-[0_18px_36px_rgba(0,0,0,0.2)] ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-turquoise/60 sm:max-w-[205px]">
              <div className="relative size-full overflow-hidden rounded-full">
                <Image
                  src={climb.photo}
                  alt={`View from ${climb.name}`}
                  fill
                  sizes="(min-width: 1280px) 190px, (min-width: 1024px) 21vw, (min-width: 640px) 29vw, 43vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: climb.photoPosition }}
                  priority={index < 3}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/5" />
                <div className="absolute inset-x-0 bottom-3 flex justify-center sm:bottom-6">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-md sm:px-2.5 sm:text-[11px]">
                    <Mountain className="size-3 text-turquoise" aria-hidden="true" />
                    {climb.elevation}
                  </span>
                </div>
              </div>
              {isEditingPins && <button
                type="button"
                onClick={() => togglePinnedClimb(climb.name)}
                disabled={pinLimitReached}
                aria-pressed={isPinned}
                aria-label={isPinned ? `Unpin ${climb.name}` : `Pin ${climb.name}`}
                title={pinLimitReached ? "Unpin a mountain before pinning another" : isPinned ? "Unpin mountain" : "Pin mountain"}
                className={`absolute right-0 top-0 z-10 flex size-8 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition sm:size-9 ${
                  isPinned
                    ? "border-turquoise bg-turquoise text-[#13272a] hover:bg-[#51d9e4]"
                    : "border-white/15 bg-black/55 text-white hover:border-turquoise/70 hover:text-turquoise disabled:cursor-not-allowed disabled:opacity-35"
                }`}
              >
                <span className="size-4 sm:size-[18px]">
                  <PinIcon filled={isPinned} />
                </span>
              </button>}
            </div>

            <h3 className="mt-3 truncate text-xs font-semibold text-zinc-100 sm:mt-4 sm:text-base">{climb.name}</h3>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{climb.location}</p>
            <p className="mt-2 flex items-center justify-center gap-1 text-[9px] text-zinc-400 sm:gap-1.5 sm:text-xs">
              <CalendarDays className="size-3 text-zinc-500 sm:size-3.5" aria-hidden="true" />
              <time dateTime={climb.climbedOn}>
                {dateFormatter.format(new Date(`${climb.climbedOn}T00:00:00Z`))}
              </time>
            </p>
          </article>
          );
        })}
      </div>
    </section>
  );
}
