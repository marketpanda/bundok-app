"use client";

import Image from "next/image";
import { MapPin, MountainSnow, Route, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { Mountain, MountainDifficulty } from "@/data/mountains";
import { cn } from "@/lib/utils";

type DifficultyBand = "all" | "easy" | "moderate" | "hard";

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
  return (
    <article className="group overflow-hidden rounded-3xl border border-white/[0.06] bg-[#303030] shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-800">
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
      </div>
    </article>
  );
}

export function MountainDirectory({ mountains }: { mountains: Mountain[] }) {
  const [query, setQuery] = useState("");
  const [difficultyBand, setDifficultyBand] = useState<DifficultyBand>("all");

  const filteredMountains = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return mountains.filter((mountain) => {
      const searchableText = [
        mountain.name,
        mountain.location,
        mountain.summary,
        ...(mountain.trails?.map((trail) => trail.name) ?? []),
      ].join(" ").toLowerCase();

      return searchableText.includes(normalizedQuery) && matchesDifficulty(mountain.difficulty, difficultyBand);
    });
  }, [difficultyBand, mountains, query]);

  const routeCount = mountains.reduce((total, mountain) => total + (mountain.trails?.length ?? 0), 0);

  return (
    <div className="mt-6 grid items-start gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0" aria-labelledby="prominent-mountains-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-turquoise">Start exploring</p>
            <h2 id="prominent-mountains-heading" className="mt-1 text-2xl font-semibold">Prominent mountains</h2>
          </div>
          <p className="shrink-0 text-sm text-zinc-500">{filteredMountains.length} shown</p>
        </div>

        {filteredMountains.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMountains.map((mountain) => <MountainCard key={mountain.slug} mountain={mountain} />)}
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-3xl bg-[#303030] px-6 text-center text-sm text-zinc-400">
            No mountains match those filters.
          </div>
        )}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-8" aria-label="Mountain search and filters">
        <div className="rounded-3xl border border-white/[0.06] bg-[#303030] p-4">
          <label htmlFor="mountain-search" className="text-sm font-semibold text-white">Find a mountain or trail</label>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-turquoise" />
            <Input
              id="mountain-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try Ambangeg or Akiki"
              className="h-12 rounded-xl border-0 bg-[#3c3c3c] pl-12 pr-11 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-turquoise/60"
            />
            <SlidersHorizontal className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-grass" />
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Difficulty</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {difficultyBands.map((band) => (
                <button
                  key={band.value}
                  type="button"
                  onClick={() => setDifficultyBand(band.value)}
                  aria-pressed={difficultyBand === band.value}
                  className={cn(
                    "rounded-xl border border-white/[0.06] bg-[#3c3c3c] px-3 py-2 text-left transition-colors hover:border-turquoise/40",
                    difficultyBand === band.value && "border-grass bg-grass/15",
                  )}
                >
                  <span className="block text-sm font-medium text-zinc-100">{band.label}</span>
                  <span className="text-[11px] text-zinc-500">{band.range}/9</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-turquoise/20 bg-turquoise/[0.08] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-turquoise">Trail index</p>
          <p className="mt-2 text-3xl font-semibold text-white">{routeCount}</p>
          <p className="mt-1 text-sm leading-5 text-zinc-400">Named routes across {mountains.length} mountains. Trail difficulty may differ from the mountain&apos;s headline rating.</p>
        </div>

        <div className="rounded-3xl border border-white/[0.06] bg-[#303030] p-4">
          <p className="text-sm font-semibold text-white">Difficulty scale</p>
          <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-grass via-turquoise to-rose-500" />
          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
            <span>1 · Easiest</span>
            <span>9 · Hardest</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
