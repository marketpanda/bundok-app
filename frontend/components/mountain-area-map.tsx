"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { mountainAreas, type MountainAreaId } from "@/data/mountain-areas";

const countryBounds: [[number, number], [number, number]] = [[117, 5.5], [127, 19]];

export function MountainAreaMap({ selectedArea, onSelect, counts }: {
  selectedArea: MountainAreaId | "all";
  onSelect: (area: MountainAreaId) => void;
  counts: Record<MountainAreaId, number>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const buttons = useRef(new Map<MountainAreaId, HTMLButtonElement>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let observer: ResizeObserver | undefined;
    const markers = buttons.current;
    const timeout = window.setTimeout(() => { if (!cancelled) setStatus("error"); }, 20000);

    async function initialize() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container.current) return;
        // Served locally for static exports; synced by prepare-map-assets.mjs.
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        map = new maplibre.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          bounds: countryBounds,
          fitBoundsOptions: { padding: { top: 80, bottom: 40, left: 24, right: 24 } },
          minZoom: 3,
          maxZoom: 12,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
        map.on("load", () => {
          window.clearTimeout(timeout);
          if (!cancelled) setStatus("ready");
        });
        map.on("error", () => {
          if (!cancelled && !map?.isStyleLoaded()) setStatus("error");
        });
        for (const area of mountainAreas) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mountain-area-marker";
          button.setAttribute("aria-controls", "mountain-area-results");
          button.setAttribute("aria-label", area.name);
          button.title = area.name;
          button.textContent = String(area.mountainSlugs.length);
          button.addEventListener("click", () => onSelect(area.id));
          markers.set(area.id, button);
          new maplibre.Marker({ element: button }).setLngLat([...area.coordinates]).addTo(map);
        }
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container.current);
      } catch {
        window.clearTimeout(timeout);
        if (!cancelled) setStatus("error");
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, [onSelect, attempt]);

  useEffect(() => {
    for (const area of mountainAreas) {
      const button = buttons.current.get(area.id);
      if (!button) continue;
      button.setAttribute("aria-pressed", String(selectedArea === area.id));
      button.setAttribute("aria-label", `${area.name}, ${counts[area.id]} matching mountains`);
      button.title = `${area.name} · ${counts[area.id]} mountains`;
      button.textContent = String(counts[area.id]);
    }
  }, [selectedArea, counts, status]);

  return (
    <div className="mountain-area-map relative isolate h-[460px] min-w-0 overflow-hidden bg-[#182725] sm:h-[540px] lg:h-[600px]">
      <div ref={container} style={{ position: "absolute", inset: 0 }} role="region" aria-label="Interactive map of Philippine climbing areas" />
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
        <div className="rounded-xl bg-[#20332e]/95 px-3 py-2 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-turquoise">Philippines</p>
          <p className="mt-1 text-[11px] text-zinc-300">Select a numbered area marker</p>
        </div>
        <button type="button" onClick={() => mapRef.current?.fitBounds(countryBounds, { padding: { top: 80, bottom: 40, left: 24, right: 24 }, duration: 0 })} className="pointer-events-auto min-h-11 rounded-xl border border-white/10 bg-[#20332e]/95 px-3 text-xs text-white shadow-sm focus-visible:outline-2 focus-visible:outline-turquoise">Reset view</button>
      </div>
      {status !== "ready" && <div role="status" className="absolute inset-x-4 bottom-14 z-10 rounded-xl bg-[#20332e]/95 p-4 text-sm text-zinc-200 shadow-sm">
        {status === "loading" ? "Loading the map…" : <>
          <p>The map couldn&apos;t load. You can still choose an area from the list.</p>
          <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className="mt-2 min-h-11 rounded px-2 text-turquoise underline focus-visible:outline-turquoise">Retry map</button>
        </>}
      </div>}
    </div>
  );
}
