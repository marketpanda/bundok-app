"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, MapPin, MountainSnow, Route, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MountainAreaMap } from "@/components/mountain-area-map";
import { getMountainArea, mountainAreas, type MountainAreaId } from "@/data/mountain-areas";
import { mapMountains } from "@/data/map-mountains";
import { getMountainGuide } from "@/data/mountain-guides";
import { Input } from "@/components/ui/input";
import type { Mountain, MountainDifficulty } from "@/data/mountains";
import { cn } from "@/lib/utils";

type DifficultyBand = "all" | "easy" | "moderate" | "hard";

function mountainNameKey(name: string) {
  return name.toLowerCase().replace(/^mt\.\s*/, "mount ");
}

const difficultyBands: { label: string; value: DifficultyBand; range: string }[] = [
  { label: "All", value: "all", range: "1–9" },
  { label: "Easy", value: "easy", range: "1–3" },
  { label: "Moderate", value: "moderate", range: "4–6" },
  { label: "Hard", value: "hard", range: "7–9" },
];

function matchesDifficulty(difficulty: MountainDifficulty, band: DifficultyBand) {
  if (band === "easy") return difficulty <= 3;
  if (band === "moderate") return difficulty >= 4 && difficulty <= 6;
  if (band === "hard") return difficulty >= 7;
  return true;
}

function MountainCard({ mountain }: { mountain: Mountain }) {
  const guide = getMountainGuide(mountain.slug);
  return (
    <article className="group overflow-hidden rounded-3xl border border-white/[0.06] bg-[#303030] shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-800">
        {guide && <Link href={`/mountains/${mountain.slug}`} aria-label={`Read the ${guide.title} hiking guide`} className="absolute inset-0 z-10 rounded-t-3xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-turquoise" />}
        <Image
          src={mountain.image}
          alt={`${mountain.name} in ${mountain.location}`}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 40vw, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 rounded-full bg-grass px-3 py-1 text-xs font-semibold text-white shadow-lg">
          {mountain.difficulty}/9
        </span>
        <div className="absolute inset-x-4 bottom-4">
          <h3 className="text-xl font-semibold text-white">{mountain.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-200">
            <MapPin className="size-3.5 text-turquoise" />
            {mountain.location}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <MountainSnow className="size-4 text-turquoise" />
            {mountain.elevationMeters.toLocaleString()} m
          </span>
          <span className="flex items-center gap-1.5">
            <Route className="size-4 text-grass" />
            {mountain.trails?.length ?? 0} routes
          </span>
        </div>

        <p className="min-h-15 text-sm leading-5 text-zinc-300">{mountain.summary}</p>

        {mountain.trails?.length ? (
          <div className="border-t border-white/[0.06] pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Popular trails</p>
            <div className="flex flex-wrap gap-2">
              {mountain.trails.slice(0, 3).map((trail) => (
                <span key={trail.name} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-300">
                  {trail.name}{trail.difficulty ? ` · ${trail.difficulty}/9` : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {guide && <Link href={`/mountains/${mountain.slug}`} className="inline-flex min-h-11 items-center rounded text-sm font-medium text-turquoise hover:underline focus-visible:outline-2 focus-visible:outline-turquoise">View mountain guide →</Link>}
      </div>
    </article>
  );
}

export function MountainDirectory({ mountains }: { mountains: Mountain[] }) {
  const [query, setQuery] = useState("");
  const [difficultyBand, setDifficultyBand] = useState<DifficultyBand>("all");
  const [selectedArea, setSelectedArea] = useState<MountainAreaId | "all">("all");
  const [selectedMountain, setSelectedMountain] = useState<{ name: string } | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const selectedCard = useRef<HTMLElement | null>(null);
  const results = useRef<HTMLDivElement | null>(null);
  const selectMountain = useCallback((name: string, areaId: MountainAreaId | undefined) => {
    setSelectedMountain({ name: mountainNameKey(name) });
    setListOpen(true);
    setSelectedArea(areaId ?? "all");
    setQuery("");
    setDifficultyBand("all");
  }, []);

  useEffect(() => {
    const card = selectedCard.current;
    const panel = results.current;
    if (!selectedMountain || !card || !panel) return;
    const cardBounds = card.getBoundingClientRect();
    const panelBounds = panel.getBoundingClientRect();
    const visibleTop = Math.max(0, panelBounds.top);
    const visibleBottom = Math.min(window.innerHeight, panelBounds.bottom);
    if (cardBounds.top < visibleTop || cardBounds.bottom > visibleBottom) {
      card.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedMountain]);
  const area = mountainAreas.find((item) => item.id === selectedArea);

  const matchingMountains = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mountains.filter((mountain) => {
      const searchableText = [mountain.name, mountain.location, mountain.summary,
        ...mountainAreas.filter((item) => (item.mountainSlugs as readonly string[]).includes(mountain.slug)).map((item) => item.name),
        ...(mountain.trails?.map((trail) => trail.name) ?? []),
      ].join(" ").toLowerCase();
      return searchableText.includes(normalizedQuery) && matchesDifficulty(mountain.difficulty, difficultyBand);
    });
  }, [difficultyBand, mountains, query]);

  const matchingMapMountains = mapMountains.filter((mountain) => {
    if (mountains.some((profile) => mountainNameKey(profile.name) === mountainNameKey(mountain.name))) return false;
    if (difficultyBand !== "all") return false;
    const areaName = mountainAreas.find((item) => item.id === getMountainArea(mountain))?.name ?? "";
    return `${mountain.name} ${mountain.location} ${areaName}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const filteredMountains = matchingMountains.filter((mountain) => !area || getMountainArea(mountain) === area.id);
  const filteredMapMountains = matchingMapMountains.filter((mountain) => !area || getMountainArea(mountain) === area.id);
  const resultCount = filteredMountains.length + filteredMapMountains.length;
  const catalogueCount = mountains.length + mapMountains.filter((mountain) => !mountains.some((profile) => mountainNameKey(profile.name) === mountainNameKey(mountain.name))).length;
  const counts = Object.fromEntries(mountainAreas.map((item) => [item.id,
    matchingMountains.filter((mountain) => getMountainArea(mountain) === item.id).length +
    matchingMapMountains.filter((mountain) => getMountainArea(mountain) === item.id).length,
  ])) as Record<MountainAreaId, number>;
  const routeCount = filteredMountains.reduce((total, mountain) => total + (mountain.trails?.length ?? 0), 0);
  const hasFilters = query !== "" || difficultyBand !== "all" || selectedArea !== "all";

  function selectCard(event: React.MouseEvent<HTMLElement>, mountain: { name: string; location: string }) {
    if ((event.target as HTMLElement).closest("button, a, summary, details")) return;
    selectMountain(mountain.name, getMountainArea(mountain));
  }

  function resetFilters() {
    setQuery("");
    setDifficultyBand("all");
    setSelectedArea("all");
    setSelectedMountain(null);
  }

  return (
    <div className="mt-8 space-y-12">
      <section aria-labelledby="mountain-explorer-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-turquoise">Explore by area</p>
            <h2 id="mountain-explorer-heading" className="mt-1 text-2xl font-semibold tracking-tight">A place for your next adventure</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">Pick an area to discover its mountains, compare the climbs, and explore their trails.</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400">{catalogueCount} mountains · {mountainAreas.length} climbing areas</span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#292929]">
          <div className="grid gap-4 border-b border-white/10 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <label htmlFor="mountain-search" className="text-xs font-medium text-zinc-300">Find a mountain, area or trail</label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-turquoise" />
                <Input id="mountain-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Pulag, Rizal or Akiki" className="h-11 rounded-xl border-white/10 bg-[#202020] pl-10 pr-11 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-turquoise/60" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-xl text-zinc-400 hover:text-white focus-visible:outline-turquoise"><X className="size-4" /></button>}
              </div>
            </div>
            <fieldset className="min-w-0">
              <legend className="mb-2 text-xs font-medium text-zinc-300">Difficulty</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {difficultyBands.map((band) => (
                  <button key={band.value} type="button" onClick={() => setDifficultyBand(band.value)} aria-pressed={difficultyBand === band.value} className={cn("min-h-11 rounded-xl border border-white/10 px-2 py-2 text-xs transition-colors hover:border-turquoise/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise sm:px-4", difficultyBand === band.value ? "border-turquoise/40 bg-turquoise/10 text-turquoise" : "text-zinc-300")}>
                    {band.label}<span className="ml-1 hidden text-[10px] opacity-70 sm:inline">{band.range}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="relative grid h-[85svh] min-h-[620px] max-h-[850px] lg:h-auto lg:min-h-0 lg:max-h-none lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,1fr)]">
            <MountainAreaMap selectedArea={selectedArea} selectedMountain={selectedMountain} listOpen={listOpen} onSelect={setSelectedArea} onSelectMountain={selectMountain} counts={counts} />
            <div id="mountain-area-results" className={cn("absolute inset-x-0 bottom-0 z-20 flex min-w-0 flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#292929] shadow-[0_-8px_30px_rgba(0,0,0,0.3)] transition-[height] duration-300 lg:static lg:z-auto lg:h-[600px] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none", listOpen ? "h-2/3" : "h-14")}>
              <button type="button" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen} aria-controls="mountain-list-content" className="flex h-14 shrink-0 items-center justify-between px-5 text-sm font-medium text-zinc-200 lg:hidden">
                <span>{listOpen ? "Hide mountain list" : `Show mountains (${resultCount})`}</span>
                <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", !listOpen && "rotate-180")} />
              </button>
              <div id="mountain-list-content" className={cn("min-h-0 flex-1 flex-col lg:flex", listOpen ? "flex" : "hidden")}>
              <div className="shrink-0 space-y-2 border-b border-white/10 px-4 pb-3 lg:space-y-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="mountain-area" className="text-xs font-medium text-zinc-400">Your climbing area</label>
                  {hasFilters && <button type="button" onClick={resetFilters} className="min-h-8 rounded text-xs text-turquoise hover:underline focus-visible:outline-turquoise">Reset filters</button>}
                </div>
                <div className="relative">
                <select id="mountain-area" value={selectedArea} onChange={(event) => setSelectedArea(event.target.value as MountainAreaId | "all")} className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#202020] pl-3 pr-10 text-sm text-white focus-visible:outline-2 focus-visible:outline-turquoise">
                  <option value="all">All climbing areas</option>
                  {mountainAreas.map((item) => <option key={item.id} value={item.id}>{item.name} ({counts[item.id]})</option>)}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                </div>
                <div role="status" aria-live="polite" aria-atomic="true">
                  <h3 className="text-xl font-semibold">{area?.name ?? "Across the Philippines"}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">{area?.detail ?? "Find a familiar favorite or somewhere new"} · {resultCount} {resultCount === 1 ? "mountain" : "mountains"} · {routeCount} trails</p>
                </div>
              </div>
              <div ref={results} className="mountain-results min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" tabIndex={0} aria-label="Mountains in selected area">
                {resultCount ? <>{filteredMountains.map((mountain) => (
                  <article key={mountain.slug} onClick={(event) => selectCard(event, mountain)} ref={selectedMountain?.name === mountainNameKey(mountain.name) ? selectedCard : undefined} className={cn("cursor-pointer rounded-2xl border bg-[#303030] p-4 transition-[border-color,box-shadow] duration-300", selectedMountain?.name === mountainNameKey(mountain.name) ? "border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.16)]" : "border-white/[0.07]")}>
                    <div className="flex items-start gap-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl"><Image src={mountain.image} alt="" fill sizes="64px" className="object-cover" /></div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold"><button type="button" onClick={() => selectMountain(mountain.name, getMountainArea(mountain))} className="rounded text-left transition-colors hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-sky-400" aria-label={`Show ${mountain.name} on map`}>{mountain.name}</button></h4>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">{mountain.location}</p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <span className="text-turquoise">{mountain.elevationMeters.toLocaleString("en-US")} m</span>
                          <span className="text-zinc-300">Difficulty {mountain.difficulty}/9</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">{mountain.summary}</p>
                    {mountain.trails?.length ? <details className="mt-3 border-t border-white/10 pt-3">
                      <summary className="cursor-pointer rounded text-xs font-medium text-turquoise focus-visible:outline-2 focus-visible:outline-turquoise">Explore {mountain.trails.length} trails</summary>
                      <ul className="mt-3 space-y-3">
                        {mountain.trails.map((trail) => <li key={trail.name} className="text-xs leading-5">
                          <div className="flex justify-between gap-2"><span className="text-zinc-200">{trail.name}</span>{trail.difficulty && <span className="shrink-0 text-zinc-400">{trail.difficulty}/9</span>}</div>
                          {trail.duration && <p className="text-zinc-400">{trail.duration}</p>}
                          {trail.note && <p className="text-zinc-400">{trail.note}</p>}
                        </li>)}
                      </ul>
                    </details> : null}
                    {getMountainGuide(mountain.slug) && <Link href={`/mountains/${mountain.slug}`} className="mt-3 inline-flex min-h-11 items-center rounded text-sm font-medium text-turquoise hover:underline focus-visible:outline-2 focus-visible:outline-turquoise">View mountain guide →</Link>}
                  </article>
                ))}
                {filteredMapMountains.map((mountain) => (
                  <article key={mountain.name} onClick={(event) => selectCard(event, mountain)} ref={selectedMountain?.name === mountainNameKey(mountain.name) ? selectedCard : undefined} className={cn("cursor-pointer rounded-2xl border bg-[#303030] p-4 transition-[border-color,box-shadow] duration-300", selectedMountain?.name === mountainNameKey(mountain.name) ? "border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.16)]" : "border-white/[0.07]")}>
                    <h4 className="flex items-center gap-2 text-base font-semibold"><MountainSnow aria-hidden="true" className="size-4 shrink-0 text-turquoise" /><button type="button" onClick={() => selectMountain(mountain.name, getMountainArea(mountain))} className="rounded text-left transition-colors hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-sky-400" aria-label={`Show ${mountain.name} on map`}>{mountain.name}</button></h4>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{mountain.location}</p>
                    <p className="mt-3 text-xs leading-5 text-zinc-400">Trail and difficulty details coming soon.</p>
                  </article>
                ))}</> : <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
                  <MountainSnow aria-hidden="true" className="mb-3 size-8 text-zinc-500" />
                  <h4 className="text-sm font-medium">No mountains match just yet</h4>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">Try another area, a different difficulty, or a broader search.</p>
                  <button type="button" onClick={resetFilters} className="mt-4 min-h-11 rounded-xl border border-turquoise/30 px-4 text-sm text-turquoise focus-visible:outline-turquoise">Show all mountains</button>
                </div>}
              </div>
              <p className="hidden shrink-0 border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-zinc-400 lg:block">Difficulty varies by route. Mountains without difficulty details appear under All. Mountain profiles are pending editorial verification.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="prominent-mountains-heading">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-turquoise">The peaks that inspire us</p>
          <h2 id="prominent-mountains-heading" className="mt-1 text-2xl font-semibold">Prominent mountains</h2>
          <p className="mt-2 text-sm text-zinc-400">Iconic climbs from across the islands, ready to explore.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mountains.map((mountain) => <MountainCard key={mountain.slug} mountain={mountain} />)}
        </div>
      </section>
    </div>
  );
}
