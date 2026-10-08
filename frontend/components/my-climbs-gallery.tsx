"use client";

import Image from "next/image";
import { CalendarDays, Check, ChevronDown, MapPin, Mountain, Pencil, Pin, Plus, Search, Trash2, TrendingUp, X } from "lucide-react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PhotoCredit } from "@/components/photo-credit";
import type { MountainPhoto } from "@/data/mountain-photos";
import sampleClimbs from "@/data/sample-climbs.json";

type MountainOption = { slug: string; name: string; location: string; elevationMeters?: number; aliases: string[]; photo?: MountainPhoto };
type Climb = { id: string; slug: string; climbedOn: string; notes: string; pinned: boolean };
type SortOption = "date-desc" | "date-asc" | "name-asc";
const STORAGE_KEY = "ambangeg:my-climbs:v1";
const LOCAL_PREVIEW_KEY = "ambangeg:my-climbs:local-preview:v1";
const SAMPLE_CLIMBS_JSON = JSON.stringify(sampleClimbs);
const CHANGE_EVENT = "ambangeg:my-climbs-change";
const dateFormatter = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const numberFormatter = new Intl.NumberFormat("en-PH");
const inputClass = "w-full rounded-xl border border-white/15 bg-[#242424] px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/20 sm:text-sm";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-turquoise px-5 text-sm font-semibold text-[#102b2e] transition-colors hover:bg-[#57dbe6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(CHANGE_EVENT, callback); };
}
function isLocalPreview() {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname);
}
function storageKey() { return isLocalPreview() ? LOCAL_PREVIEW_KEY : STORAGE_KEY; }
function snapshot() {
  const fallback = isLocalPreview() ? SAMPLE_CLIMBS_JSON : "[]";
  try { return window.localStorage.getItem(storageKey()) ?? fallback; } catch { return fallback; }
}
function serverSnapshot() { return "[]"; }
function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function formatDate(value: string) { return dateFormatter.format(new Date(value + "T00:00:00Z")); }

export function MyClimbsGallery({ mountains }: { mountains: MountainOption[] }) {
  const saved = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const catalogue = useMemo(() => new Map(mountains.map((mountain) => [mountain.slug, mountain])), [mountains]);
  const climbs = useMemo<Climb[]>(() => {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const ids = new Set<string>();
      return parsed.filter((item): item is Climb => {
        if (!item || typeof item.id !== "string" || ids.has(item.id) || !catalogue.has(item.slug) || typeof item.climbedOn !== "string" || !validDate(item.climbedOn) || typeof item.notes !== "string" || typeof item.pinned !== "boolean") return false;
        ids.add(item.id);
        return true;
      });
    } catch { return []; }
  }, [saved, catalogue]);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [query, setQuery] = useState("");
  const [editingPins, setEditingPins] = useState(false);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mountainQuery, setMountainQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [climbedOn, setClimbedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedMountain = catalogue.get(selectedSlug);
  const pinnedCount = climbs.filter((climb) => climb.pinned).length;
  const uniqueSummits = new Set(climbs.map((climb) => climb.slug)).size;
  const latest = [...climbs].sort((a, b) => b.climbedOn.localeCompare(a.climbedOn))[0];
  const highest = climbs.reduce<MountainOption | undefined>((best, climb) => {
    const mountain = catalogue.get(climb.slug)!;
    return mountain.elevationMeters && mountain.elevationMeters > (best?.elevationMeters ?? 0) ? mountain : best;
  }, undefined);
  const visibleClimbs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return climbs.filter((climb) => {
      const mountain = catalogue.get(climb.slug)!;
      return (mountain.name + " " + mountain.location).toLowerCase().includes(search);
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "name-asc") return catalogue.get(a.slug)!.name.localeCompare(catalogue.get(b.slug)!.name);
      return sortBy === "date-asc" ? a.climbedOn.localeCompare(b.climbedOn) : b.climbedOn.localeCompare(a.climbedOn);
    });
  }, [climbs, catalogue, query, sortBy]);
  const matchingMountains = useMemo(() => {
    const search = mountainQuery.trim().toLowerCase();
    const matches = mountains.filter((mountain) => [mountain.name, mountain.location, ...mountain.aliases].join(" ").toLowerCase().includes(search));
    return [...matches].sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || a.name.localeCompare(b.name)).slice(0, 40);
  }, [mountains, mountainQuery]);

  function persist(next: Climb[]) {
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setStorageError("");
      return true;
    } catch { setStorageError("Your browser could not save this change. Enable browser storage and try again."); return false; }
  }
  function openForm(climb?: Climb) {
    setEditingId(climb?.id ?? null);
    setSelectedSlug(climb?.slug ?? "");
    setMountainQuery("");
    setClimbedOn(climb?.climbedOn ?? localDate());
    setNotes(climb?.notes ?? "");
    setFormError("");
    setConfirmDelete(false);
    dialogRef.current?.showModal();
  }
  function saveClimb(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMountain) { setFormError("Choose a mountain from the list to continue."); return; }
    if (!validDate(climbedOn) || climbedOn > localDate()) { setFormError("Choose a valid climb date that is today or earlier."); return; }
    if (climbs.some((climb) => climb.id !== editingId && climb.slug === selectedSlug && climb.climbedOn === climbedOn)) { setFormError("This mountain is already logged for that date."); return; }
    const entry: Climb = { id: editingId ?? crypto.randomUUID(), slug: selectedSlug, climbedOn, notes: notes.trim(), pinned: climbs.find((climb) => climb.id === editingId)?.pinned ?? false };
    if (persist(editingId ? climbs.map((climb) => climb.id === editingId ? entry : climb) : [...climbs, entry])) {
      dialogRef.current?.close();
      setQuery("");
      setMessage(selectedMountain.name + (editingId ? " updated." : " added to your climbs."));
    } else { setFormError("Could not save your climb. Enable browser storage and try again."); }
  }
  function togglePin(climb: Climb) {
    if (!climb.pinned && pinnedCount >= 3) return;
    if (persist(climbs.map((entry) => entry.id === climb.id ? { ...entry, pinned: !entry.pinned } : entry))) setMessage(climb.pinned ? "Mountain unpinned." : "Mountain pinned to the top.");
  }

  return (
    <section className="mt-7 lg:mt-10" aria-labelledby="climbs-heading">
      <div className="relative mb-8 overflow-hidden rounded-[28px] border border-turquoise/15 bg-gradient-to-br from-[#263d38] via-[#293330] to-[#282c2b] p-6 sm:p-8">
        <Mountain className="pointer-events-none absolute -right-8 -top-8 size-64 text-turquoise/[0.04]" strokeWidth={0.8} aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-turquoise"><TrendingUp className="size-4" aria-hidden="true" /> Your trail journal</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Every climb deserves a place.</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">Keep the peaks you reached and the little moments along the way.</p>
          </div>
          <button type="button" onClick={() => openForm()} className={buttonClass + " shrink-0 self-start sm:self-center"}><Plus className="size-4" aria-hidden="true" /> Add a climb</button>
        </div>
        <div className="relative mt-7 grid grid-cols-1 gap-5 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-8">
          <div><p className="text-xs text-zinc-400">Mountains climbed</p><p className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-semibold tracking-tight">{uniqueSummits}</span><span className="text-xs text-zinc-400">{climbs.length} {climbs.length === 1 ? "climb logged" : "climbs logged"}</span></p></div>
          <div className="sm:border-l sm:border-white/10 sm:pl-6"><p className="text-xs text-zinc-400">Highest summit</p><p className="mt-2 font-semibold">{highest?.name ?? "Your next milestone"}</p><p className="mt-1 text-xs text-turquoise">{highest?.elevationMeters ? numberFormatter.format(highest.elevationMeters) + " masl" : "A little higher, one trail at a time"}</p></div>
          <div className="sm:border-l sm:border-white/10 sm:pl-6"><p className="text-xs text-zinc-400">Latest climb</p><p className="mt-2 font-semibold">{latest ? catalogue.get(latest.slug)!.name : "The story starts with you"}</p><p className="mt-1 text-xs text-zinc-400">{latest ? formatDate(latest.climbedOn) : "Log your first mountain below"}</p></div>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h2 id="climbs-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">Your summit circles <span className="ml-1 text-sm font-normal text-zinc-500">{climbs.length}</span></h2><p className="mt-1 text-xs text-zinc-400 sm:text-sm">{editingPins ? "Choose up to 3 favourites · " + pinnedCount + "/3 pinned" : "A collection of days worth remembering."}</p></div>
        {climbs.length > 0 && <button type="button" onClick={() => setEditingPins(!editingPins)} aria-pressed={editingPins} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-medium text-zinc-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-turquoise">{editingPins ? <Check className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}{editingPins ? "Done" : "Pin favourites"}</button>}
      </div>
      {climbs.length > 0 && <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <label className="relative block sm:w-72"><span className="sr-only">Search your climbs</span><Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-zinc-500" aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a mountain or place" className={inputClass + " pl-11"} /></label>
        <label className="relative"><span className="sr-only">Sort climbs</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className={inputClass + " appearance-none pr-10"}><option value="date-desc">Latest climbed</option><option value="date-asc">Oldest climbed</option><option value="name-asc">Name: A–Z</option></select><ChevronDown className="pointer-events-none absolute right-4 top-3.5 size-4 text-zinc-400" aria-hidden="true" /></label>
      </div>}
      <p role="status" className="mb-3 text-sm text-turquoise">{message}</p>
      {storageError && <p role="alert" className="mb-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{storageError}</p>}
      {climbs.length === 0 ? <div className="flex flex-col items-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center sm:py-20">
        <div className="mb-6 grid size-24 place-items-center rounded-full border border-turquoise/20 bg-turquoise/5"><Mountain className="size-10 text-turquoise" strokeWidth={1.3} aria-hidden="true" /></div>
        <h3 className="text-xl font-semibold">Your first summit is waiting</h3><p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">Already made it to the top? Add the mountain and date to start your own collection.</p><button type="button" onClick={() => openForm()} className={buttonClass + " mt-6"}><Plus className="size-4" aria-hidden="true" /> Log your first climb</button>
      </div> : visibleClimbs.length === 0 ? <div className="rounded-2xl border border-white/10 p-10 text-center"><Search className="mx-auto mb-3 size-6 text-zinc-500" aria-hidden="true" /><h3 className="font-semibold">No climbs found</h3><p className="mt-2 text-sm text-zinc-400">Try another mountain name or location.</p><button type="button" onClick={() => setQuery("")} className="mt-4 min-h-11 text-sm text-turquoise">Clear search</button></div> : <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
        {visibleClimbs.map((climb) => {
          const mountain = catalogue.get(climb.slug)!;
          return <article key={climb.id} className="group min-w-0 text-center">
            <div className="relative mx-auto aspect-square max-w-[205px]">
              <button type="button" onClick={() => openForm(climb)} aria-label={"Edit " + mountain.name + " climb from " + formatDate(climb.climbedOn)} className={"relative size-full rounded-full bg-[#303030] p-1.5 ring-1 transition motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise " + (climb.pinned ? "ring-turquoise/60" : "ring-white/15 hover:ring-turquoise/50")}>
                <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#34554a] to-[#192d29]">
                  {mountain.photo ? <Image src={mountain.photo.src} alt={mountain.photo.alt} fill sizes="(min-width: 1280px) 190px, (min-width: 1024px) 21vw, (min-width: 640px) 29vw, 43vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" /> : <Mountain className="size-16 text-[#8bbaab]" strokeWidth={1} aria-hidden="true" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <span className="absolute inset-x-0 bottom-5 flex justify-center"><span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] text-white backdrop-blur-sm"><Mountain className="size-3 text-turquoise" aria-hidden="true" />{mountain.elevationMeters ? numberFormatter.format(mountain.elevationMeters) + " masl" : "Summit reached"}</span></span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><Pencil className="size-5 text-white" aria-hidden="true" /></span>
                </span>
              </button>
              {(editingPins || climb.pinned) && <button type="button" disabled={!editingPins || (!climb.pinned && pinnedCount >= 3)} onClick={() => togglePin(climb)} aria-pressed={climb.pinned} aria-label={(climb.pinned ? "Unpin " : "Pin ") + mountain.name} title={!climb.pinned && pinnedCount >= 3 ? "Unpin a favourite to choose another" : "Pin favourite"} className={"absolute -right-1 -top-1 grid size-11 place-items-center rounded-full border shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise " + (climb.pinned ? "border-turquoise bg-turquoise text-[#13272a]" : "border-white/15 bg-[#363636] text-zinc-200 disabled:opacity-35")}><Pin className="size-4" fill={climb.pinned ? "currentColor" : "none"} aria-hidden="true" /></button>}
            </div>
            <h3 className="mt-4 text-sm font-semibold sm:text-base">{mountain.name}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{mountain.location}</p><p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400"><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={climb.climbedOn}>{formatDate(climb.climbedOn)}</time></p>
            {climb.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{climb.notes}</p>}
            {mountain.photo && <details className="mt-2 text-[10px] text-zinc-500"><summary className="cursor-pointer hover:text-zinc-300">Photo credit</summary><PhotoCredit photo={mountain.photo} /></details>}
          </article>;
        })}
        {!query && <button type="button" onClick={() => openForm()} className="group flex flex-col items-center self-start text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise"><span className="flex aspect-square w-full max-w-[205px] flex-col items-center justify-center gap-3 rounded-full border border-dashed border-white/20 bg-white/[0.02] transition-colors group-hover:border-turquoise/60 group-hover:bg-turquoise/5"><Plus className="size-7 text-turquoise" strokeWidth={1.5} aria-hidden="true" /><span className="text-xs text-zinc-400">Another adventure</span></span><span className="mt-4 text-sm font-semibold text-turquoise">Add a climb</span></button>}
      </div>}
      <p className="mt-8 text-center text-xs leading-5 text-zinc-500">Your journal is saved in this browser. It won’t sync across devices yet.</p>

      <dialog ref={dialogRef} aria-labelledby="climb-dialog-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-[#2c2c2c] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialogRef.current?.close(); } }}>
        <form onSubmit={saveClimb} className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-turquoise">A day to remember</p><h2 id="climb-dialog-title" className="mt-2 text-2xl font-semibold">{editingId ? "Edit your climb" : "Add a climb"}</h2><p className="mt-2 text-sm text-zinc-400">A mountain, a date, a memory. Make it yours.</p></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close climb form" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-turquoise"><X className="size-5" aria-hidden="true" /></button></div>
          <label htmlFor="climb-mountain" className="mb-2 block text-sm font-medium">Mountain <span className="text-turquoise">*</span></label>
          {selectedMountain ? <div className="mb-5 flex items-center gap-3 rounded-xl border border-turquoise/30 bg-turquoise/5 p-4"><Mountain className="size-6 shrink-0 text-turquoise" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{selectedMountain.name}</p><p className="mt-1 text-xs text-zinc-400">{selectedMountain.location}</p></div><button id="climb-mountain" type="button" onClick={() => setSelectedSlug("")} className="min-h-11 text-xs text-turquoise">Change</button></div> : <div className="mb-5"><div className="relative"><Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-zinc-500" aria-hidden="true" /><input id="climb-mountain" type="search" value={mountainQuery} onChange={(event) => setMountainQuery(event.target.value)} placeholder="Search mountains or locations" className={inputClass + " pl-11"} aria-describedby="mountain-picker-hint" /></div><p id="mountain-picker-hint" className="my-2 text-[11px] text-zinc-500">{mountainQuery ? "Select a mountain from the results." : "Popular peaks first. Search to explore the full catalogue."}</p><ul aria-label="Mountain results" className="max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#242424]">{matchingMountains.map((mountain) => <li key={mountain.slug}><button type="button" onClick={() => setSelectedSlug(mountain.slug)} className="flex min-h-14 w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-turquoise/10 focus-visible:bg-turquoise/10 focus-visible:outline-2 focus-visible:outline-turquoise"><MapPin className="size-4 shrink-0 text-zinc-500" aria-hidden="true" /><span><span className="block text-sm font-medium">{mountain.name}</span><span className="mt-0.5 block text-xs text-zinc-500">{mountain.location}</span></span></button></li>)}{matchingMountains.length === 0 && <li className="p-5 text-sm text-zinc-400">No mountains found. Try a different name or province.</li>}</ul></div>}
          <label htmlFor="climb-date" className="mb-2 block text-sm font-medium">Date climbed <span className="text-turquoise">*</span></label><input id="climb-date" type="date" required max={localDate()} value={climbedOn} onChange={(event) => setClimbedOn(event.target.value)} className={inputClass + " mb-5 [color-scheme:dark]"} />
          <label htmlFor="climb-notes" className="mb-2 block text-sm font-medium">Trail memories <span className="font-normal text-zinc-500">(optional)</span></label><textarea id="climb-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder="The route, the sunrise, who you went with…" className={inputClass + " resize-y"} /><p className="mt-1 text-right text-[10px] text-zinc-500">{notes.length}/500</p>
          {formError && <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{formError}</p>}
          {confirmDelete && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-4"><p className="text-sm text-red-200">Remove this climb from your journal?</p><div className="mt-3 flex gap-4"><button type="button" onClick={() => { if (persist(climbs.filter((climb) => climb.id !== editingId))) { dialogRef.current?.close(); setMessage("Climb removed from your journal."); } else setFormError("Could not remove your climb. Enable browser storage and try again."); }} className="min-h-11 text-sm font-semibold text-red-300">Yes, remove climb</button><button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 text-sm text-zinc-300">Keep climb</button></div></div>}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">{editingId ? <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-zinc-400 hover:text-red-300"><Trash2 className="size-4" aria-hidden="true" />Remove</button> : <button type="button" onClick={() => dialogRef.current?.close()} className="min-h-11 px-2 text-sm text-zinc-400 hover:text-white">Cancel</button>}<button type="submit" className={buttonClass}><Check className="size-4" aria-hidden="true" />{editingId ? "Save changes" : "Save climb"}</button></div>
        </form>
      </dialog>
    </section>
  );
}
