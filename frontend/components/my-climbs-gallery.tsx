"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Circle, Flag, MapPin, Mountain, Pencil, Pin, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { PhotoCredit } from "@/components/photo-credit";
import type { MountainPhoto } from "@/data/mountain-photos";
import { matchesDestinationSearch } from "@/data/destination-search";
import type { MapMountain } from "@/data/map-mountains";
import sampleClimbs from "@/data/sample-climbs.json";
import { climbDefaultPhoto } from "@/data/climb-default-photo";
import { suggestedFinishDate } from "@/lib/hike-dates";
import { isClimbPhoto, prepareClimbPhoto } from "@/lib/climb-photo";
import { climbsApiConfigured, climbsRequest, listClimbs, saveAccountClimb, saveAccountPhoto, PhotoSaveError, type JournalClimb } from "@/lib/climbs-api";

type MountainOption = Pick<MapMountain, "slug" | "name" | "kind" | "location" | "elevationMeters" | "aliases"> & { photo?: MountainPhoto };
type GroupOption = MountainOption & { members: NonNullable<JournalClimb["targets"]> };
type Climb = JournalClimb;
type LayoutOption = "circle" | "bagtag";
type SortOption = "date-desc" | "date-asc" | "name-asc";
const STORAGE_KEY = "ambangeg:my-climbs:v1";
const LOCAL_PREVIEW_KEY = "ambangeg:my-climbs:local-preview:v1";
const SAMPLE_CLIMBS_JSON = JSON.stringify(sampleClimbs);
const MOUNTAINS_PER_PAGE = 4;
const CHANGE_EVENT = "ambangeg:my-climbs-change";
const dateFormatter = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const numberFormatter = new Intl.NumberFormat("en-PH");
const inputClass = "w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-moss-deep focus:ring-2 focus:ring-moss-deep/15 sm:text-sm";
const bagTagMask = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 856"><defs><mask id="tag" maskUnits="userSpaceOnUse" x="0" y="0" width="540" height="856"><rect width="540" height="856" fill="white"/><rect x="220" y="32" width="100" height="24" rx="12" fill="black"/></mask></defs><rect width="540" height="856" fill="white" mask="url(#tag)"/></svg>')}")`;
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
function hasSavedLocalClimbs() {
  try { return Boolean(window.localStorage.getItem(storageKey())); } catch { return false; }
}
function noSavedLocalClimbs() { return false; }
function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function formatDate(value: string) { return dateFormatter.format(new Date(value + "T00:00:00Z")); }
function lastClimbDate(climb: Climb) { return climb.finishedOn ?? climb.climbedOn; }

// Stable variation keeps a pin’s wear pattern unchanged when sorting or rendering.
function pinWearVariant(id: string) {
  const hash = Array.from(id).reduce((value, character) => (Math.imul(value, 31) + character.charCodeAt(0)) >>> 0, 0);
  return hash % 5 + 1;
}

export function MyClimbsGallery({ mountains, groups = [], children }: { mountains: MountainOption[]; groups?: GroupOption[]; children?: ReactNode }) {
  const { user, configured, loading: authLoading, signInWithGoogle } = useAuth();
  const subject = user?.subject;
  const accountMode = climbsApiConfigured && Boolean(subject);
  const [account, setAccount] = useState<{ owner: string; climbs: Climb[]; ready: boolean; error: string }>({ owner: "", climbs: [], ready: false, error: "" });
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const mutationLock = useRef(false);
  useEffect(() => {
    if (!subject || !climbsApiConfigured) return;
    const controller = new AbortController();
    void listClimbs(subject, controller.signal).then(climbs => {
      if (!controller.signal.aborted) setAccount({ owner: subject, climbs, ready: true, error: "" });
    }).catch(() => {
      if (!controller.signal.aborted) setAccount({ owner: subject, climbs: [], ready: false, error: "Could not load your account journal. Check your connection or sign in again, then retry." });
    });
    return () => controller.abort();
  }, [subject, reload]);
  useEffect(() => {
    if (!subject || !climbsApiConfigured) return;
    const refresh = () => { if (!mutationLock.current) setReload(value => value + 1); };
    const timer = window.setInterval(refresh, 45 * 60 * 1000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [subject]);
  const hikerName = user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "Your name";
  const [layout, setLayout] = useState<LayoutOption>("bagtag");
  const layoutSwitchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const control = layoutSwitchRef.current;
    if (!control) return;
    const buttons = control.querySelectorAll<HTMLButtonElement>("button");
    const observer = new ResizeObserver(() => {
      control.style.setProperty("--climb-button-pins-width", buttons[0].getBoundingClientRect().width + "px");
      control.style.setProperty("--climb-bagtag-width", buttons[1].getBoundingClientRect().width + "px");
    });
    buttons.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [authLoading, user]);
  const [touchHighlight, setTouchHighlight] = useState<{ id: string; sequence: number } | null>(null);
  const saved = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const hasLocalJournal = useSyncExternalStore(subscribe, hasSavedLocalClimbs, noSavedLocalClimbs);
  const destinations = useMemo(() => [...groups, ...mountains], [groups, mountains]);
  const catalogue = useMemo(() => new Map(destinations.map((mountain) => [mountain.slug, mountain])), [destinations]);
  const localClimbs = useMemo<Climb[]>(() => {
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
        photos: Array.isArray(item.photos) ? item.photos.filter(isClimbPhoto).slice(0, 1) : [],
      }));
    } catch { return []; }
  }, [saved, catalogue]);
  const climbs = useMemo(() => accountMode ? (account.owner === subject ? account.climbs.filter(climb => catalogue.has(climb.slug)) : []) : localClimbs, [accountMode, account, subject, catalogue, localClimbs]);
  const accountReady = account.owner === subject && account.ready;
  const blocked = busy || authLoading || (accountMode && !accountReady);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [editingPins, setEditingPins] = useState(false);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogRef.current?.close(); }, [subject]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mountainQuery, setMountainQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [climbedOn, setClimbedOn] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [finishedOn, setFinishedOn] = useState("");
  const [finishDateEdited, setFinishDateEdited] = useState(false);
  const [groupTargets, setGroupTargets] = useState<NonNullable<Climb["targets"]>>([]);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [mountainPage, setMountainPage] = useState(0);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoRequestRef = useRef(0);
  const [summitNotReached, setSummitNotReached] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedMountain = catalogue.get(selectedSlug);
  const selectedGroup = groups.find(group => group.slug === selectedSlug);
  const pinnedCount = climbs.filter((climb) => climb.pinned).length;
  const uniqueSummits = new Set(climbs.flatMap(climb => climb.isGroup ? (climb.targets ?? []).filter(target => target.reached).map(target => target.mountainSlug) : !climb.summitNotReached ? [climb.slug] : [])).size;
  const unfinishedCount = climbs.filter((climb) => climb.summitNotReached).length;
  const latest = [...climbs].sort((a, b) => lastClimbDate(b).localeCompare(lastClimbDate(a)))[0];
  const visibleClimbs = useMemo(() => {
    return [...climbs].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "name-asc") return catalogue.get(a.slug)!.name.localeCompare(catalogue.get(b.slug)!.name);
      return sortBy === "date-asc" ? lastClimbDate(a).localeCompare(lastClimbDate(b)) : lastClimbDate(b).localeCompare(lastClimbDate(a));
    });
  }, [climbs, catalogue, sortBy]);
  const matchingMountains = useMemo(() => {

    const matches = destinations.filter((mountain) => matchesDestinationSearch([mountain.name, mountain.location, ...mountain.aliases], mountainQuery));
    return [...matches].sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || a.name.localeCompare(b.name));
  }, [destinations, mountainQuery]);

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

  async function persist(next: Climb[]) {
    if (blocked || mutationLock.current) return false;
    if (accountMode && subject) {
      mutationLock.current = true;
      setBusy(true);
      try {
        const removed = climbs.find(climb => !next.some(item => item.id === climb.id));
        const changed = next.find(climb => JSON.stringify(climb) !== JSON.stringify(climbs.find(item => item.id === climb.id)));
        let result = next;
        if (removed) await climbsRequest(subject, `/me/climbs/${removed.id}`, "DELETE");
        else if (changed) {
          const existing = climbs.find(climb => climb.id === changed.id);
          if (existing && existing.pinned !== changed.pinned) {
            await climbsRequest(subject, "/me/climbs/pins", "PUT", { climbIds: next.filter(climb => climb.pinned).map(climb => climb.id) });
          } else {
            const savedClimb = await saveAccountClimb(subject, changed, Boolean(existing));
            result = next.map(climb => climb.id === changed.id ? savedClimb : climb);
          }
        }
        setAccount(current => current.owner === subject ? { ...current, climbs: result } : current);
        setStorageError("");
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not save. Reload your journal before retrying.";
        setStorageError(errorMessage);
        if (error instanceof PhotoSaveError) {
          // Keep the created ID so retrying the photo never creates a second climb.
          setEditingId(error.climb.id);
          setAccount(current => current.owner === subject ? { ...current, climbs: [...current.climbs.filter(climb => climb.id !== error.climb.id), error.climb] } : current);
          setFormError(errorMessage);
        } else {
          setFormError(errorMessage + " Close this form and reload your journal before retrying.");
          setAccount(current => current.owner === subject ? { ...current, ready: false } : current);
        }
        return false;
      } finally { mutationLock.current = false; setBusy(false); }
    }
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setStorageError("");
      return true;
    } catch { setStorageError("Your browser could not save this change. Storage may be full or disabled. Try removing a photo or freeing browser storage."); return false; }
  }
  function openForm(climb?: Climb) {
    if (blocked) return;
    setEditingId(climb?.id ?? null);
    setSelectedSlug(climb?.slug ?? "");
    setGroupTargets(climb?.targets?.map(target => ({ ...target })) ?? []);
    setMountainQuery("");
    setClimbedOn(climb?.climbedOn ?? localDate());
    setIsMultiDay(Boolean(climb?.finishedOn));
    setFinishedOn(climb?.finishedOn ?? "");
    setFinishDateEdited(Boolean(climb?.finishedOn));
    setFormStep(climb ? 2 : 1);
    setMountainPage(0);
    setNotes(climb?.notes ?? "");
    photoRequestRef.current += 1;
    setPhotos(climb?.photos ?? []);
    setPhotoLoading(false);
    setPhotoError("");
    setSummitNotReached(climb?.summitNotReached ?? false);
    setFormError("");
    setConfirmDelete(false);
    dialogRef.current?.showModal();
  }
  async function saveClimb(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoLoading || blocked) return;
    if (formStep === 1) {
      if (!selectedMountain) { setFormError("Choose a mountain to continue."); return; }
      changeStep(2);
      return;
    }
    if (!selectedMountain) { setFormError("Choose a mountain from the list to continue."); return; }
    if (!validDate(climbedOn) || climbedOn > localDate()) { setFormError("Choose a valid climb date that is today or earlier."); return; }
    if (isMultiDay && (!validDate(finishedOn) || finishedOn <= climbedOn || finishedOn > localDate())) { setFormError("The finished date must be after the start date and no later than today."); return; }
    const entry: Climb = { id: editingId ?? crypto.randomUUID(), slug: selectedSlug, climbedOn, ...(isMultiDay ? { finishedOn } : {}), notes: notes.trim(), photos, summitNotReached: selectedGroup ? groupTargets.some(target => !target.reached) : summitNotReached, isGroup: Boolean(selectedGroup), targets: selectedGroup ? groupTargets : [], pinned: climbs.find((climb) => climb.id === editingId)?.pinned ?? false };
    if (await persist(editingId ? climbs.map((climb) => climb.id === editingId ? entry : climb) : [...climbs, entry])) {
      dialogRef.current?.close();
      setMessage(selectedMountain.name + (editingId ? " updated." : " added to your climbs."));
    } else if (!accountMode) { setFormError("Could not save your climb. Storage may be full or disabled. Try removing the photo or freeing browser storage."); }
  }
  async function selectPhoto(file?: File) {
    if (!file) return;
    const request = ++photoRequestRef.current;
    setPhotoLoading(true);
    setPhotoError("");
    try {
      const photo = await prepareClimbPhoto(file);
      if (request === photoRequestRef.current) setPhotos([photo]);
    } catch (error) {
      if (request === photoRequestRef.current) setPhotoError(error instanceof Error ? error.message : "Could not open this photo. Try another image.");
    } finally {
      if (request === photoRequestRef.current) setPhotoLoading(false);
    }
  }
  async function togglePin(climb: Climb) {
    if (!climb.pinned && pinnedCount >= 3) return;
    if (await persist(climbs.map((entry) => entry.id === climb.id ? { ...entry, pinned: !entry.pinned } : entry))) setMessage(climb.pinned ? "Mountain unpinned." : "Mountain pinned to the top.");
  }

  async function importLocalClimbs() {
    if (!subject || !accountReady || blocked || mutationLock.current) return;
    if (!window.confirm("Import saved climbs into your account? Local records and photos will stay in this browser. Their saved photos will also be uploaded to your account.")) return;
    mutationLock.current = true;
    setBusy(true);
    let imported = 0;
    try {
      // Demo samples are never imported unless explicitly saved locally.
      if (window.localStorage.getItem(storageKey()) === null) return;
      const existing = await listClimbs(subject);
      for (const climb of localClimbs) {
        const duplicate = existing.find(item => item.slug === climb.slug && item.climbedOn === climb.climbedOn && item.finishedOn === climb.finishedOn && item.notes === climb.notes.trim() && item.summitNotReached === climb.summitNotReached);
        if (duplicate) {
          if (climb.photos?.[0] && !duplicate.photos?.length) {
            await new Promise(resolve => setTimeout(resolve, 650));
            const withPhoto = await saveAccountPhoto(subject, duplicate.id, climb.photos[0]);
            Object.assign(duplicate, withPhoto);
          }
          continue;
        }
        await new Promise(resolve => setTimeout(resolve, 650));
        let savedClimb: Climb;
        try { savedClimb = await saveAccountClimb(subject, climb, false); }
        catch (error) {
          if (error instanceof PhotoSaveError) {
            existing.push(error.climb);
            imported += 1;
            setAccount(current => current.owner === subject ? { ...current, climbs: [...existing] } : current);
          }
          throw error;
        }
        existing.push(savedClimb);
        imported += 1;
        setAccount(current => current.owner === subject ? { ...current, climbs: [...existing] } : current);
      }
      setAccount(current => current.owner === subject ? { ...current, climbs: [...existing] } : current);
      setMessage(`${imported} climbs imported. Original local records and photos were kept. Choose account favourites using Pin favourites.`);
    } catch (error) {
      setStorageError(`${imported} climbs imported before stopping. ${error instanceof Error ? error.message : "Could not continue."} Reload before trying again; matching climbs will be skipped.`);
      setAccount(current => current.owner === subject ? { ...current, ready: false } : current);
    } finally { mutationLock.current = false; setBusy(false); }
  }

  if (authLoading) return <section aria-labelledby="my-climbs-title"><h1 id="my-climbs-title" className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1><p role="status" className="mt-4 text-sm text-muted-foreground">Checking your sign-in...</p></section>;

  if (!user) return (
    <section aria-labelledby="my-climbs-title">
      <h1 id="my-climbs-title" className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1>
      {children && <div className="mt-4 xl:hidden">{children}</div>}
      <div className="mt-8 rounded-[28px] border border-border bg-white px-6 py-14 text-center">
        <Mountain className="mx-auto mb-5 size-10 text-moss-deep" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Sign in to view your climbs</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Keep your hiking journal in your account and access it across devices.</p>
        <button type="button" disabled={!configured} onClick={() => void signInWithGoogle().catch(() => setStorageError("Could not start sign-in. Please try again."))} className={buttonClass + " mt-6 disabled:opacity-40"}>Sign in with Google</button>
        {!configured && <p role="status" className="mt-3 text-sm text-muted-foreground">Sign-in is temporarily unavailable.</p>}
        {storageError && <p role="alert" className="mt-3 text-sm text-red-700">{storageError}</p>}
      </div>
    </section>
  );

  if (!climbsApiConfigured) return <section aria-labelledby="my-climbs-title"><h1 id="my-climbs-title" className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1><p role="status" className="mt-4 text-sm text-muted-foreground">Your account journal is temporarily unavailable. Please try again later.</p></section>;

  return (
    <section aria-labelledby="my-climbs-title">
      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-moss-deep lg:block">Your hiking journey</p>
          <h1 id="my-climbs-title" className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">A growing collection of peaks, paths, and days worth remembering.</p>
          {children && <div className="mt-4 xl:hidden">{children}</div>}
        </div>

        <div className="min-w-0 border-t border-border/60 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid min-w-0 flex-1 grid-cols-[0.8fr_1.2fr] gap-3 sm:gap-5">
              <div><p className="text-[11px] text-muted-foreground">Places explored</p><p className="mt-1 text-xl font-semibold leading-tight">{uniqueSummits}</p><p className="mt-1 text-[10px] text-muted-foreground">{climbs.length} logged{unfinishedCount > 0 ? " · " + unfinishedCount + " unfinished" : ""}</p></div>
              <div className="min-w-0 border-l border-border pl-3 sm:pl-5"><p className="text-[11px] text-muted-foreground">Last climb</p><p className="mt-1 truncate text-sm font-semibold" title={latest ? catalogue.get(latest.slug)!.name : undefined}>{latest ? catalogue.get(latest.slug)!.name : "Your first adventure"}</p><p className="mt-1 text-[10px] text-muted-foreground">{latest ? formatDate(lastClimbDate(latest)) : "Log a climb to start"}</p></div>
            </div>
            <button type="button" onClick={() => openForm()} className={buttonClass + " shrink-0 px-4 text-xs"}><Plus className="size-4" aria-hidden="true" /> Add a climb</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
            <h2 id="climbs-heading" className="sr-only">Your collection · {climbs.length} climbs</h2>
          {climbs.length > 0 && <button type="button" onClick={() => setEditingPins(!editingPins)} aria-pressed={editingPins} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 sm:min-h-8 rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground hover:bg-moss-50 focus-visible:outline-2 focus-visible:outline-moss-deep">{editingPins ? <Check className="size-3.5" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}{editingPins ? "Done" : "Pin favourites"}</button>}
          <div ref={layoutSwitchRef} role="group" aria-label="Collection layout" className="climb-layout-switch relative isolate grid w-fit grid-cols-[max-content_max-content] shrink-0 rounded-full border border-border bg-moss-100/70 p-1">
            <span aria-hidden="true" className="climb-layout-thumb" data-layout={layout} />
            {(["circle", "bagtag"] as const).map((option) => <button key={option} type="button" aria-pressed={layout === option} onClick={() => setLayout(option)} className={"relative z-10 inline-flex min-h-8 whitespace-nowrap px-4 sm:min-h-6 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-deep " + (layout === option ? "text-moss-deep" : "text-muted-foreground hover:text-moss-deep")}>
              {option === "circle" ? <Circle className="size-3.5" aria-hidden="true" /> : <Tag className="size-3.5" aria-hidden="true" />}
              {option === "circle" ? "Button Pins" : "Bagtag"}
            </button>)}
          </div>
            {climbs.length > 0 && <label className="relative ml-auto"><span className="sr-only">Sort climbs</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="min-h-10 max-w-full sm:min-h-8 appearance-none rounded-full border border-border bg-white py-1 pl-2.5 pr-7 text-[11px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-deep"><option value="date-desc">Latest climb</option><option value="date-asc">Oldest climbed</option><option value="name-asc">Name: A–Z</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></label>}
          </div>
          {editingPins && <p className="mt-2 text-[11px] text-muted-foreground">Choose up to 3 favourites · {pinnedCount}/3 pinned</p>}
        </div>
      </div>
      <p role="status" className={message ? "mb-3 text-sm text-moss-deep" : "sr-only"}>{message}</p>
      {accountMode && (!accountReady || busy) && <p role="status" className="mb-3 text-sm text-moss-deep">{busy ? "Saving your journal..." : account.error || "Loading your account journal..."}</p>}
      {accountMode && !accountReady && !busy && <button type="button" onClick={() => setReload(value => value + 1)} className={buttonClass + " mb-4"}>Reload journal</button>}
      {accountMode && accountReady && hasLocalJournal && localClimbs.length > 0 && <div className="mb-4 rounded-xl border border-border p-3 text-sm"><p>Import this browser&apos;s saved climbs and photos into your account. Originals stay in this browser.</p><button type="button" disabled={blocked} onClick={() => void importLocalClimbs()} className="mt-2 min-h-10 font-semibold text-moss-deep disabled:opacity-40">Import saved climbs</button></div>}
      {storageError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
      {climbs.length === 0 ? <div className="flex flex-col items-center rounded-[28px] border border-dashed border-border bg-white px-6 py-14 text-center sm:py-20">
        <div className="mb-6 grid size-24 place-items-center rounded-full border border-border bg-moss/5"><Mountain className="size-10 text-moss-deep" strokeWidth={1.3} aria-hidden="true" /></div>
        <h3 className="text-xl font-semibold">Your first adventure is waiting</h3><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Every trail has a story. Add a mountain or ridge and a date to start your own collection.</p><button type="button" onClick={() => openForm()} className={buttonClass + " mt-6"}><Plus className="size-4" aria-hidden="true" /> Log your first climb</button>
      </div> : <div key={layout} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {visibleClimbs.map((climb, index) => {
          const mountain = catalogue.get(climb.slug)!;
          const photoSrc = climb.photos?.[0] ?? climbDefaultPhoto.src;
          const photoAlt = climb.photos?.length ? `Your photo from ${mountain.name}` : climbDefaultPhoto.alt;
          return <article key={climb.id} style={{ animationDelay: `${Math.min(index * 55, 660)}ms` }} onPointerDown={(event) => {
            if (event.pointerType === "touch" || event.pointerType === "pen") {
              setTouchHighlight((previous) => ({ id: climb.id, sequence: (previous?.sequence ?? 0) + 1 }));
            }
          }} className={"climb-collection-item climb-card group min-w-0 text-center " + (layout === "bagtag" ? "" : "climb-circle-collection")}>
            <div className={"relative " + (layout === "bagtag" ? "aspect-[53.98/85.6] rounded-[18px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-moss-deep" : "mx-auto aspect-square max-w-[205px]")}>
              {layout === "bagtag" ? <span className="block size-full drop-shadow-[0_3px_6px_rgba(7,26,17,0.12)]"><button type="button" onClick={() => openForm(climb)} aria-label={"Edit " + mountain.name + " climb from " + formatDate(climb.climbedOn)} className="relative block size-full overflow-hidden rounded-[18px] bg-[#183f2c] text-white transition motion-safe:hover:-translate-y-1 focus-visible:outline-none" style={{ maskImage: bagTagMask, WebkitMaskImage: bagTagMask, maskSize: "100% 100%", maskRepeat: "no-repeat" }}>
                <Image src={photoSrc} alt={photoAlt} fill unoptimized={Boolean(climb.photos?.length)} sizes="(min-width: 1280px) 190px, (min-width: 1024px) 21vw, (min-width: 640px) 29vw, 43vw" className="object-cover object-[52%_center] transition-transform duration-500 motion-safe:group-hover:scale-105" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-[#071a11]/95" />
                <span className="absolute inset-x-0 bottom-0 flex flex-col items-center px-3 pb-5 pt-10 sm:pb-6">
                  <span className="font-artistic block w-full break-words px-1 py-1 text-3xl font-semibold leading-[1.25] tracking-tight [text-shadow:0_1px_2px_rgba(0,0,0,.55)] sm:text-4xl">{hikerName}</span>
                  <span aria-hidden="true" className="my-3 h-px w-10 bg-white/55" />
                  <span className="line-clamp-3 text-sm font-semibold leading-tight sm:text-base">{mountain.name}</span>
                </span>
                <span key={touchHighlight?.id === climb.id ? touchHighlight.sequence : 0} aria-hidden="true" className={"climb-card-shine" + (touchHighlight?.id === climb.id ? " is-touch-highlight" : "")} />
                  <span key={"outline-" + (touchHighlight?.id === climb.id ? touchHighlight.sequence : 0)} aria-hidden="true" className={"climb-card-outline" + (touchHighlight?.id === climb.id ? " is-touch-highlight" : "")} />
              </button></span> :
              <button type="button" onClick={() => openForm(climb)} aria-label={"Edit " + mountain.name + " climb from " + formatDate(climb.climbedOn)} className="climb-circle-badge relative size-full cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep">
                <span className="climb-circle-face relative flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-moss-50 to-moss-100">
                  <Image src={photoSrc} alt={photoAlt} fill unoptimized={Boolean(climb.photos?.length)} sizes="(min-width: 1280px) 190px, (min-width: 1024px) 21vw, (min-width: 640px) 29vw, 43vw" className="object-cover object-[52%_center] transition-transform duration-500 motion-safe:group-hover:scale-105" />
                  <span aria-hidden="true" className="climb-pin-wear" data-wear={pinWearVariant(climb.id)} />
                  <span key={touchHighlight?.id === climb.id ? touchHighlight.sequence : 0} aria-hidden="true" className={"climb-card-shine" + (touchHighlight?.id === climb.id ? " is-touch-highlight" : "")} />
                  <span className="climb-circle-edit absolute bottom-[18%] z-[3] grid size-8 place-items-center rounded-full bg-black/25 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><Pencil className="size-3.5" aria-hidden="true" /></span>
                </span>
              </button>}
              {(editingPins || climb.pinned) && <button type="button" disabled={blocked || !editingPins || (!climb.pinned && pinnedCount >= 3)} onClick={() => togglePin(climb)} aria-pressed={climb.pinned} aria-label={(climb.pinned ? "Unpin " : "Pin ") + mountain.name} title={!climb.pinned && pinnedCount >= 3 ? "Unpin a favourite to choose another" : "Pin favourite"} className="absolute -right-1 -top-4 grid size-11 place-items-center bg-transparent text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-deep disabled:opacity-35"><Pin className="size-6 rotate-[25deg]" stroke="var(--moss-deep)" strokeWidth={1.5} fill={climb.pinned ? "currentColor" : "none"} aria-hidden="true" /></button>}
            </div>
            <h3 className={layout === "bagtag" ? "sr-only" : "mt-4 text-sm font-semibold tracking-tight sm:text-base"}>{mountain.name}</h3>
            {climb.isGroup && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-moss-deep">{climb.targets?.filter(target => target.reached).length ?? 0}/{climb.targets?.length ?? 0} reached</summary><ul className="mt-2 space-y-1">{climb.targets?.map(target => <li key={target.key}>{target.name} ? {target.reached ? "Reached" : "Not marked as reached"}</li>)}</ul></details>}
            {!climb.isGroup && climb.summitNotReached && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800" title={mountain.kind === "ridge" ? "Hike not finished" : "Summit not reached"}><Flag className="size-3" aria-hidden="true" /> Unfinished</p>}<p className="mt-1 text-xs leading-5 text-muted-foreground">{mountain.kind === "ridge" ? "Ridge · " : ""}{mountain.location}{mountain.elevationMeters ? " · " + numberFormatter.format(mountain.elevationMeters) + " m" : ""}</p><p className="mt-2 flex flex-wrap items-center justify-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={climb.climbedOn}>{formatDate(climb.climbedOn)}</time>{climb.finishedOn && <><span aria-hidden="true">–</span><time dateTime={climb.finishedOn}>{formatDate(climb.finishedOn)}</time></>}</p>
            {climb.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{climb.notes}</p>}
            {!climb.photos?.length && <details className="mt-2 text-[10px] text-muted-foreground"><summary className="cursor-pointer hover:text-muted-foreground">Photo credit</summary><PhotoCredit photo={climbDefaultPhoto} light /><p>Default image · cropped around the sun and clouds.</p></details>}
          </article>;
        })}
        {<button type="button" onClick={() => openForm()} style={{ animationDelay: `${Math.min(visibleClimbs.length * 55, 660)}ms` }} className="climb-collection-item group flex min-w-0 cursor-pointer flex-col items-center self-start text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep"><span className={"flex w-full flex-col items-center justify-center gap-3 border border-dashed border-border bg-moss-50/50 transition-colors group-hover:border-moss/60 group-hover:bg-moss/5 " + (layout === "bagtag" ? "aspect-[53.98/85.6] rounded-[18px]" : "aspect-square max-w-[205px] rounded-full")}><Plus className="size-7 text-moss-deep" strokeWidth={1.5} aria-hidden="true" /><span className="text-xs text-muted-foreground">Another adventure</span></span><span className="mt-4 text-sm font-semibold text-moss-deep">Add a climb</span></button>}
      </div>}
      <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">{accountMode ? "Your journal is saved to your account and available across devices." : "Your journal is saved in this browser. Sign in to save climbs to your account."}</p>
      {!user && climbsApiConfigured && !authLoading && <div className="mt-2 text-center"><button type="button" onClick={() => void signInWithGoogle().catch(() => setStorageError("Could not start sign-in. Please try again."))} className="min-h-10 text-sm font-semibold text-moss-deep">Sign in with Google</button></div>}

      <dialog
        ref={dialogRef}
        onClose={() => { photoRequestRef.current += 1; setPhotoLoading(false); }}
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
                  <button type="button" onClick={() => {
                    if (selectedSlug !== mountain.slug) {
                      setSelectedSlug(mountain.slug);
                      setGroupTargets(groups.find(group => group.slug === mountain.slug)?.members.map(member => ({ ...member, reached: true })) ?? []);
                    }
                    setFormError("");
                  }} aria-pressed={selectedSlug === mountain.slug} className={"flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-moss/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-moss " + (selectedSlug === mountain.slug ? "bg-moss/5" : "")}>
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
              <input id="climb-date" type="date" required max={localDate()} value={climbedOn} onChange={(event) => {
                setClimbedOn(event.target.value);
                if (isMultiDay && !finishDateEdited) setFinishedOn(suggestedFinishDate(event.target.value, localDate()));
                setFormError("");
              }} className={inputClass + " [color-scheme:light]"} />
              <label className="my-2 flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={isMultiDay} onChange={(event) => {
                  setIsMultiDay(event.target.checked);
                  if (event.target.checked && !finishDateEdited) setFinishedOn(suggestedFinishDate(climbedOn, localDate()));
                  setFormError("");
                }} className="size-3.5 accent-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss" />
                Multi-day hike
              </label>
              {isMultiDay && <div className="mb-4">
                <label htmlFor="climb-finished-date" className="mb-2 block text-sm font-medium">Date finished <span className="text-moss">*</span></label>
                <input id="climb-finished-date" type="date" required min={validDate(climbedOn) ? new Date(Date.parse(climbedOn) + 86400000).toISOString().slice(0, 10) : undefined} max={localDate()} value={finishedOn} onChange={(event) => { setFinishedOn(event.target.value); setFinishDateEdited(true); setFormError(""); }} className={inputClass + " [color-scheme:light]"} />
              </div>}
              {selectedGroup && <fieldset className="mb-4 rounded-xl border border-border p-3">
                <legend className="px-1 text-sm font-semibold">Destinations reached</legend>
                {groupTargets.map(target => <label key={target.key} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" checked={target.reached} onChange={event => setGroupTargets(current => current.map(member => member.key === target.key ? { ...member, reached: event.target.checked } : member))} className="size-4 accent-moss" />
                  {target.name}
                </label>)}
                <p role="status" className="mt-2 text-xs font-semibold text-moss-deep">{groupTargets.filter(target => target.reached).length} of {groupTargets.length} reached</p>
                <p className="mt-1 text-xs text-muted-foreground">Unchecked means not marked as reached.</p>
              </fieldset>}
              <label htmlFor="climb-notes" className="mb-2 block text-sm font-medium">Trail memories <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea id="climb-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} placeholder="The route, the sunrise, who you went with…" className={inputClass + " resize-none"} />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{notes.length}/500</p>
              <div className="mt-4">
                <label htmlFor="climb-photo" className="mb-2 block text-sm font-medium">Climb photo <span className="font-normal text-muted-foreground">(optional)</span></label>
                <div className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className="relative aspect-[53.98/85.6] w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image src={photos[0] ?? climbDefaultPhoto.src} alt={photos.length ? "Selected climb photo preview" : climbDefaultPhoto.alt} fill unoptimized sizes="80px" className="object-cover object-[52%_center]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <input id="climb-photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="climb-photo-hint" onChange={(event) => { void selectPhoto(event.target.files?.[0]); event.target.value = ""; }} className="peer sr-only" />
                    <label htmlFor="climb-photo" className="inline-flex min-h-10 cursor-pointer items-center rounded-full bg-moss-100 px-3 text-xs font-semibold text-moss-deep hover:bg-moss/15 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-moss-deep">{photos.length ? "Replace photo" : "Choose photo"}</label>
                    <p id="climb-photo-hint" className="mt-2 text-[11px] leading-5 text-muted-foreground">Add one JPG, PNG or WebP photo, up to 15 MB. Without a photo, we’ll use this Mount Pulag view.</p>
                    {photos.length > 0 && <button type="button" onClick={() => { photoRequestRef.current += 1; setPhotos([]); setPhotoLoading(false); setPhotoError(""); }} className="min-h-10 text-xs text-moss-deep hover:underline focus-visible:outline-2 focus-visible:outline-moss-deep">Remove photo</button>}
                    <p role="status" className={photoLoading ? "mt-1 text-xs text-moss-deep" : "sr-only"}>{photoLoading ? "Preparing photo…" : ""}</p>
                  </div>
                </div>
                {!photos.length && <div className="mt-2"><PhotoCredit photo={climbDefaultPhoto} light /></div>}
                {photoError && <p role="alert" className="mt-2 text-xs text-red-700">{photoError}</p>}
              </div>
              {!selectedGroup && <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={summitNotReached} onChange={(event) => setSummitNotReached(event.target.checked)} className="size-3.5 accent-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss" />
                {selectedMountain?.kind === "ridge" ? "Hike not finished" : "Summit not reached"}
              </label>}
            </>}
            {formError && <p role="alert" className="mt-3 text-xs text-red-700">{formError}</p>}
            {confirmDelete && <div className="mt-3 border-t border-border pt-3">
              <p className="text-sm text-red-700">Remove this climb from your journal?</p>
              <div className="mt-2 flex gap-4">
                <button type="button" disabled={blocked} onClick={async () => { if (await persist(climbs.filter((climb) => climb.id !== editingId))) { dialogRef.current?.close(); setMessage("Climb removed from your journal."); } else setFormError("Could not remove your climb. Close this form and reload your journal before retrying."); }} className="min-h-10 text-xs font-semibold text-red-600">Yes, remove climb</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-10 text-xs text-muted-foreground">Keep climb</button>
              </div>
            </div>}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              {formStep === 2 ? <button type="button" onClick={() => changeStep(1)} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back</button> : <button type="button" onClick={() => dialogRef.current?.close()} className="min-h-11 text-sm text-muted-foreground">Cancel</button>}
              {editingId && formStep === 2 && <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Remove climb" className="grid size-11 place-items-center text-muted-foreground hover:text-red-600"><Trash2 className="size-4" aria-hidden="true" /></button>}
            </div>
            <button type="submit" disabled={blocked || photoLoading || (formStep === 1 && !selectedMountain)} className={buttonClass + " disabled:cursor-not-allowed disabled:opacity-40"}>
              {formStep === 1 ? <>Next <ArrowRight className="size-4" aria-hidden="true" /></> : <><Check className="size-4" aria-hidden="true" />{editingId ? "Save changes" : "Save climb"}</>}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
