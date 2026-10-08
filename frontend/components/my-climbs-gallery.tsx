"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Flag, MapPin, Mountain, Pencil, Pin, Plus, Search, Trash2, TrendingUp, X } from "lucide-react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PhotoCredit } from "@/components/photo-credit";
import type { MountainPhoto } from "@/data/mountain-photos";
import { matchesDestinationSearch } from "@/data/destination-search";
import type { MapMountain } from "@/data/map-mountains";
import sampleClimbs from "@/data/sample-climbs.json";

type MountainOption = Pick<MapMountain, "slug" | "name" | "kind" | "location" | "elevationMeters" | "aliases"> & { photo?: MountainPhoto };
type Climb = { id: string; slug: string; climbedOn: string; finishedOn?: string; notes: string; pinned: boolean; summitNotReached: boolean };
type SortOption = "date-desc" | "date-asc" | "name-asc";
const STORAGE_KEY = "ambangeg:my-climbs:v1";
const LOCAL_PREVIEW_KEY = "ambangeg:my-climbs:local-preview:v1";
const SAMPLE_CLIMBS_JSON = JSON.stringify(sampleClimbs);
const MOUNTAINS_PER_PAGE = 4;
const CHANGE_EVENT = "ambangeg:my-climbs-change";
const dateFormatter = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const numberFormatter = new Intl.NumberFormat("en-PH");
const inputClass = "w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-moss-deep focus:ring-2 focus:ring-moss-deep/15 sm:text-sm";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-5 text-sm font-semibold text-white shadow-sm shadow-moss-900/10 transition-colors hover:bg-moss-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep";

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
function lastClimbDate(climb: Climb) { return climb.finishedOn ?? climb.climbedOn; }

export function MyClimbsGallery({ mountains }: { mountains: MountainOption[] }) {
  const saved = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const catalogue = useMemo(() => new Map(mountains.map((mountain) => [mountain.slug, mountain])), [mountains]);
  const climbs = useMemo<Climb[]>(() => {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const ids = new Set<string>();
      return parsed.filter((item): item is Climb => {
        if (!item || typeof item.id !== "string" || ids.has(item.id) || !catalogue.has(item.slug) || typeof item.climbedOn !== "string" || !validDate(item.climbedOn) || typeof item.notes !== "string" || typeof item.pinned !== "boolean" || (item.summitNotReached !== undefined && typeof item.summitNotReached !== "boolean")) return false;
        if (item.finishedOn !== undefined && (typeof item.finishedOn !== "string" || !validDate(item.finishedOn) || item.finishedOn <= item.climbedOn)) return false;
        ids.add(item.id);
        return true;
      }).map((item) => ({
        ...item,
        // Older journals had no completion field; preserve them as completed.
        // Apply the unfinished example to older local demo entries as well.
        summitNotReached: item.summitNotReached ?? sampleClimbs.find((sample) => sample.id === item.id)?.summitNotReached ?? false,
      }));
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
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [finishedOn, setFinishedOn] = useState("");
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [mountainPage, setMountainPage] = useState(0);
  const [notes, setNotes] = useState("");
  const [summitNotReached, setSummitNotReached] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedMountain = catalogue.get(selectedSlug);
  const pinnedCount = climbs.filter((climb) => climb.pinned).length;
  const uniqueSummits = new Set(climbs.map((climb) => climb.slug)).size;
  const unfinishedCount = climbs.filter((climb) => climb.summitNotReached).length;
  const latest = [...climbs].sort((a, b) => lastClimbDate(b).localeCompare(lastClimbDate(a)))[0];
  const visibleClimbs = useMemo(() => {
    return climbs.filter((climb) => {
      const mountain = catalogue.get(climb.slug)!;
      return matchesDestinationSearch([mountain.name, mountain.location, ...mountain.aliases], query);
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "name-asc") return catalogue.get(a.slug)!.name.localeCompare(catalogue.get(b.slug)!.name);
      return sortBy === "date-asc" ? lastClimbDate(a).localeCompare(lastClimbDate(b)) : lastClimbDate(b).localeCompare(lastClimbDate(a));
    });
  }, [climbs, catalogue, query, sortBy]);
  const matchingMountains = useMemo(() => {

    const matches = mountains.filter((mountain) => matchesDestinationSearch([mountain.name, mountain.location, ...mountain.aliases], mountainQuery));
    return [...matches].sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || a.name.localeCompare(b.name));
  }, [mountains, mountainQuery]);

  const mountainPageCount = Math.max(1, Math.ceil(matchingMountains.length / MOUNTAINS_PER_PAGE));
  const currentMountainPage = Math.min(mountainPage, mountainPageCount - 1);
  const mountainResults = matchingMountains.slice(currentMountainPage * MOUNTAINS_PER_PAGE, (currentMountainPage + 1) * MOUNTAINS_PER_PAGE);
  const formContentRef = useRef<HTMLDivElement>(null);

  function changeStep(step: 1 | 2) {
    setFormStep(step);
    setFormError("");
    formContentRef.current?.scrollTo({ top: 0 });
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLInputElement>(step === 1 ? "#climb-mountain" : "#climb-date")?.focus();
    });
  }

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
    setIsMultiDay(Boolean(climb?.finishedOn));
    setFinishedOn(climb?.finishedOn ?? "");
    setFormStep(climb ? 2 : 1);
    setMountainPage(0);
    setNotes(climb?.notes ?? "");
    setSummitNotReached(climb?.summitNotReached ?? false);
    setFormError("");
    setConfirmDelete(false);
    dialogRef.current?.showModal();
  }
  function saveClimb(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formStep === 1) {
      if (!selectedMountain) { setFormError("Choose a mountain to continue."); return; }
      changeStep(2);
      return;
    }
    if (!selectedMountain) { setFormError("Choose a mountain from the list to continue."); return; }
    if (!validDate(climbedOn) || climbedOn > localDate()) { setFormError("Choose a valid climb date that is today or earlier."); return; }
    if (isMultiDay && (!validDate(finishedOn) || finishedOn <= climbedOn || finishedOn > localDate())) { setFormError("The finished date must be after the start date and no later than today."); return; }
    if (climbs.some((climb) => climb.id !== editingId && climb.slug === selectedSlug && climb.climbedOn === climbedOn)) { setFormError("This mountain is already logged for that date."); return; }
    const entry: Climb = { id: editingId ?? crypto.randomUUID(), slug: selectedSlug, climbedOn, ...(isMultiDay ? { finishedOn } : {}), notes: notes.trim(), summitNotReached, pinned: climbs.find((climb) => climb.id === editingId)?.pinned ?? false };
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
      <div className="relative mb-8 overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_8px_32px_rgba(54,80,4,0.04)] p-6 sm:p-8">
        <Mountain className="pointer-events-none absolute -right-8 -top-8 size-64 text-moss-deep/[0.04]" strokeWidth={0.8} aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-deep"><TrendingUp className="size-4" aria-hidden="true" /> Your trail journal</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">A little further, every time.</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your peaks, your progress, and all the moments in between.</p>
          </div>
          <button type="button" onClick={() => openForm()} className={buttonClass + " shrink-0 self-start sm:self-center"}><Plus className="size-4" aria-hidden="true" /> Add a climb</button>
        </div>
        <div className="relative mt-7 grid grid-cols-1 gap-5 border-t border-border pt-6 sm:grid-cols-2 sm:gap-8">
          <div><p className="text-xs text-muted-foreground">Places explored</p><p className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-semibold tracking-tight">{uniqueSummits}</span><span className="text-xs text-muted-foreground">{climbs.length} logged{unfinishedCount > 0 ? " · " + unfinishedCount + " unfinished" : ""}</span></p></div>
          <div className="sm:border-l sm:border-border sm:pl-6"><p className="text-xs text-muted-foreground">Latest climb</p><p className="mt-2 font-semibold">{latest ? catalogue.get(latest.slug)!.name : "The story starts with you"}</p><p className="mt-1 text-xs text-muted-foreground">{latest ? formatDate(lastClimbDate(latest)) : "Log your first mountain below"}</p></div>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h2 id="climbs-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">Your collection <span className="ml-1 text-sm font-normal text-muted-foreground">{climbs.length}</span></h2><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{editingPins ? "Choose up to 3 favourites · " + pinnedCount + "/3 pinned" : "A collection of days worth remembering."}</p></div>
        {climbs.length > 0 && <button type="button" onClick={() => setEditingPins(!editingPins)} aria-pressed={editingPins} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium text-foreground hover:bg-moss-50 focus-visible:outline-2 focus-visible:outline-moss-deep">{editingPins ? <Check className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}{editingPins ? "Done" : "Pin favourites"}</button>}
      </div>
      {climbs.length > 0 && <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <label className="relative block sm:w-72"><span className="sr-only">Search your climbs</span><Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a mountain or place" className={inputClass + " pl-11"} /></label>
        <label className="relative"><span className="sr-only">Sort climbs</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className={inputClass + " appearance-none pr-10"}><option value="date-desc">Latest climbed</option><option value="date-asc">Oldest climbed</option><option value="name-asc">Name: A–Z</option></select><ChevronDown className="pointer-events-none absolute right-4 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /></label>
      </div>}
      <p role="status" className="mb-3 text-sm text-moss-deep">{message}</p>
      {storageError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
      {climbs.length === 0 ? <div className="flex flex-col items-center rounded-[28px] border border-dashed border-border bg-white px-6 py-14 text-center sm:py-20">
        <div className="mb-6 grid size-24 place-items-center rounded-full border border-border bg-moss/5"><Mountain className="size-10 text-moss-deep" strokeWidth={1.3} aria-hidden="true" /></div>
        <h3 className="text-xl font-semibold">Your first adventure is waiting</h3><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Every trail has a story. Add a mountain or ridge and a date to start your own collection.</p><button type="button" onClick={() => openForm()} className={buttonClass + " mt-6"}><Plus className="size-4" aria-hidden="true" /> Log your first climb</button>
      </div> : visibleClimbs.length === 0 ? <div className="rounded-2xl border border-border p-10 text-center"><Search className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">No climbs found</h3><p className="mt-2 text-sm text-muted-foreground">Try another mountain name or location.</p><button type="button" onClick={() => setQuery("")} className="mt-4 min-h-11 text-sm text-moss-deep">Clear search</button></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {visibleClimbs.map((climb) => {
          const mountain = catalogue.get(climb.slug)!;
          return <article key={climb.id} className="group min-w-0 rounded-xl border border-border bg-white p-4 text-center shadow-sm">
            <div className="relative mx-auto aspect-square max-w-[205px]">
              <button type="button" onClick={() => openForm(climb)} aria-label={"Edit " + mountain.name + " climb from " + formatDate(climb.climbedOn)} className={"relative size-full rounded-full bg-white p-1.5 shadow-[0_6px_24px_rgba(54,80,4,0.08)] ring-1 transition motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep " + (climb.summitNotReached ? "ring-amber-300 hover:ring-amber-400" : climb.pinned ? "ring-moss/60" : "ring-border hover:ring-moss/60")}>
                <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-moss-50 to-moss-100">
                  {mountain.photo ? <Image src={mountain.photo.src} alt={mountain.photo.alt} fill sizes="(min-width: 1280px) 190px, (min-width: 1024px) 21vw, (min-width: 640px) 29vw, 43vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" /> : <Mountain className="size-16 text-moss-deep" strokeWidth={1} aria-hidden="true" />}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><Pencil className="size-5 text-white" aria-hidden="true" /></span>
                </span>
              </button>
              {(editingPins || climb.pinned) && <button type="button" disabled={!editingPins || (!climb.pinned && pinnedCount >= 3)} onClick={() => togglePin(climb)} aria-pressed={climb.pinned} aria-label={(climb.pinned ? "Unpin " : "Pin ") + mountain.name} title={!climb.pinned && pinnedCount >= 3 ? "Unpin a favourite to choose another" : "Pin favourite"} className={"absolute -right-1 -top-1 grid size-11 place-items-center rounded-full border shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-deep " + (climb.pinned ? "border-moss bg-moss text-white" : "border-border bg-white text-muted-foreground disabled:opacity-35")}><Pin className="size-4" fill={climb.pinned ? "currentColor" : "none"} aria-hidden="true" /></button>}
            </div>
            <h3 className="mt-4 text-sm font-semibold tracking-tight sm:text-base">{mountain.name}</h3>
            {climb.summitNotReached && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800" title={mountain.kind === "ridge" ? "Hike not finished" : "Summit not reached"}><Flag className="size-3" aria-hidden="true" /> Unfinished</p>}<p className="mt-1 text-xs leading-5 text-muted-foreground">{mountain.kind === "ridge" ? "Ridge · " : ""}{mountain.location}{mountain.elevationMeters ? " · " + numberFormatter.format(mountain.elevationMeters) + " m" : ""}</p><p className="mt-2 flex flex-wrap items-center justify-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={climb.climbedOn}>{formatDate(climb.climbedOn)}</time>{climb.finishedOn && <><span aria-hidden="true">–</span><time dateTime={climb.finishedOn}>{formatDate(climb.finishedOn)}</time></>}</p>
            {climb.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{climb.notes}</p>}
            {mountain.photo && <details className="mt-2 text-[10px] text-muted-foreground"><summary className="cursor-pointer hover:text-muted-foreground">Photo credit</summary><PhotoCredit photo={mountain.photo} light /></details>}
          </article>;
        })}
        {!query && <button type="button" onClick={() => openForm()} className="group flex flex-col items-center self-start rounded-xl border border-dashed border-border bg-white p-4 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep"><span className="flex aspect-square w-full max-w-[205px] flex-col items-center justify-center gap-3 rounded-full border border-dashed border-border bg-moss-50/50 transition-colors group-hover:border-moss/60 group-hover:bg-moss/5"><Plus className="size-7 text-moss-deep" strokeWidth={1.5} aria-hidden="true" /><span className="text-xs text-muted-foreground">Another adventure</span></span><span className="mt-4 text-sm font-semibold text-moss-deep">Add a climb</span></button>}
      </div>}
      <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">Your journal is saved in this browser. It won’t sync across devices yet.</p>

      <dialog
        ref={dialogRef}
        aria-labelledby="climb-dialog-title"
        className="no-scrollbar fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-2xl border border-border bg-white p-0 text-foreground shadow-2xl backdrop:bg-moss-950/40 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialogRef.current?.close();
        }}
      >
        <form onSubmit={saveClimb} className="flex max-h-[90dvh] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Step {formStep} of 2 · {formStep === 1 ? "Mountain" : "Climb details"}</p>
              <h2 id="climb-dialog-title" className="mt-1 text-xl font-semibold">{editingId ? "Edit your climb" : "Add a climb"}</h2>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close climb form" className="grid size-10 shrink-0 place-items-center rounded-full bg-moss-100 hover:bg-moss/10 focus-visible:outline-2 focus-visible:outline-moss">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div ref={formContentRef} className="no-scrollbar min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            {formStep === 1 ? <>
              <label htmlFor="climb-mountain" className="mb-2 block text-sm font-medium">Destination <span className="text-moss">*</span></label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <input id="climb-mountain" type="search" value={mountainQuery} onChange={(event) => { setMountainQuery(event.target.value); setMountainPage(0); }} placeholder="Search mountains, ridges or locations" className={inputClass + " pl-11"} aria-describedby="mountain-picker-hint" />
              </div>
              <p id="mountain-picker-hint" className="my-2 text-[11px] text-muted-foreground">{mountainQuery ? "Choose a destination from the results." : "Popular peaks first. Search the full catalogue."}</p>
              <ul aria-label="Destination results" className="overflow-hidden rounded-xl border border-border bg-white">
                {mountainResults.map((mountain) => <li key={mountain.slug} className="border-b border-border last:border-b-0">
                  <button type="button" onClick={() => { setSelectedSlug(mountain.slug); setFormError(""); }} aria-pressed={selectedSlug === mountain.slug} className={"flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-moss/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-moss " + (selectedSlug === mountain.slug ? "bg-moss/5" : "")}>
                    <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{mountain.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{mountain.kind === "ridge" ? "Ridge · " : ""}{mountain.location}</span></span>
                    {selectedSlug === mountain.slug && <Check className="size-4 shrink-0 text-moss" aria-hidden="true" />}
                  </button>
                </li>)}
                {matchingMountains.length === 0 && <li className="p-5 text-sm text-muted-foreground">No mountains found. Try a different name or province.</li>}
              </ul>
              {matchingMountains.length > MOUNTAINS_PER_PAGE && <nav aria-label="Mountain result pages" className="mt-2 flex items-center justify-between gap-2">
                <button type="button" disabled={currentMountainPage === 0} onClick={() => setMountainPage(currentMountainPage - 1)} className="inline-flex min-h-10 items-center gap-1 text-xs text-moss disabled:opacity-35"><ArrowLeft className="size-3.5" aria-hidden="true" /> Previous</button>
                <span className="text-[11px] text-muted-foreground" aria-live="polite">{currentMountainPage + 1} / {mountainPageCount}</span>
                <button type="button" disabled={currentMountainPage >= mountainPageCount - 1} onClick={() => setMountainPage(currentMountainPage + 1)} className="inline-flex min-h-10 items-center gap-1 text-xs text-moss disabled:opacity-35">Next <ArrowRight className="size-3.5" aria-hidden="true" /></button>
              </nav>}
              {selectedMountain && <p role="status" className="mt-2 text-xs text-moss">Selected: {selectedMountain.name}</p>}
            </> : <>
              {selectedMountain && <div className="mb-4 flex items-center gap-3">
                <Mountain className="size-5 shrink-0 text-moss" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{selectedMountain.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{selectedMountain.kind === "ridge" ? "Ridge · " : ""}{selectedMountain.location}</p></div>
                <button type="button" onClick={() => changeStep(1)} className="min-h-10 text-xs text-moss">Change</button>
              </div>}
              <label htmlFor="climb-date" className="mb-2 block text-sm font-medium">{isMultiDay ? "Date started" : "Date climbed"} <span className="text-moss">*</span></label>
              <input id="climb-date" type="date" required max={localDate()} value={climbedOn} onChange={(event) => setClimbedOn(event.target.value)} className={inputClass + " [color-scheme:light]"} />
              <label className="my-2 flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={isMultiDay} onChange={(event) => { setIsMultiDay(event.target.checked); if (!event.target.checked) setFinishedOn(""); }} className="size-3.5 accent-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss" />
                Multi-day hike
              </label>
              {isMultiDay && <div className="mb-4">
                <label htmlFor="climb-finished-date" className="mb-2 block text-sm font-medium">Date finished <span className="text-moss">*</span></label>
                <input id="climb-finished-date" type="date" required min={validDate(climbedOn) ? new Date(Date.parse(climbedOn) + 86400000).toISOString().slice(0, 10) : undefined} max={localDate()} value={finishedOn} onChange={(event) => setFinishedOn(event.target.value)} className={inputClass + " [color-scheme:light]"} />
              </div>}
              <label htmlFor="climb-notes" className="mb-2 block text-sm font-medium">Trail memories <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea id="climb-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} placeholder="The route, the sunrise, who you went with…" className={inputClass + " resize-none"} />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{notes.length}/500</p>
              <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={summitNotReached} onChange={(event) => setSummitNotReached(event.target.checked)} className="size-3.5 accent-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss" />
                {selectedMountain?.kind === "ridge" ? "Hike not finished" : "Summit not reached"}
              </label>
            </>}
            {formError && <p role="alert" className="mt-3 text-xs text-red-700">{formError}</p>}
            {confirmDelete && <div className="mt-3 border-t border-border pt-3">
              <p className="text-sm text-red-700">Remove this climb from your journal?</p>
              <div className="mt-2 flex gap-4">
                <button type="button" onClick={() => { if (persist(climbs.filter((climb) => climb.id !== editingId))) { dialogRef.current?.close(); setMessage("Climb removed from your journal."); } else setFormError("Could not remove your climb. Enable browser storage and try again."); }} className="min-h-10 text-xs font-semibold text-red-600">Yes, remove climb</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-10 text-xs text-muted-foreground">Keep climb</button>
              </div>
            </div>}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              {formStep === 2 ? <button type="button" onClick={() => changeStep(1)} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back</button> : <button type="button" onClick={() => dialogRef.current?.close()} className="min-h-11 text-sm text-muted-foreground">Cancel</button>}
              {editingId && formStep === 2 && <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Remove climb" className="grid size-11 place-items-center text-muted-foreground hover:text-red-600"><Trash2 className="size-4" aria-hidden="true" /></button>}
            </div>
            <button type="submit" disabled={formStep === 1 && !selectedMountain} className={buttonClass + " disabled:cursor-not-allowed disabled:opacity-40"}>
              {formStep === 1 ? <>Next <ArrowRight className="size-4" aria-hidden="true" /></> : <><Check className="size-4" aria-hidden="true" />{editingId ? "Save changes" : "Save climb"}</>}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
