"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { getMountainArea, mountainAreas, type MountainAreaId } from "@/data/mountain-areas";
import { mapMountains } from "@/data/map-mountains";

const countryBounds: [[number, number], [number, number]] = [[117, 5.5], [127, 19]];
const countryPadding = { top: 80, bottom: 40, left: 24, right: 24 };
const peakZoomSteps = 2;
const cameraAnimation = {
  duration: 1000,
  easing: (progress: number) => progress * progress * (3 - 2 * progress),
};

export function MountainAreaMap({ selectedArea, selectedMountain, listOpen, onSelect, onSelectMountain, counts }: {
  selectedArea: MountainAreaId | "all";
  selectedMountain: { name: string } | null;
  listOpen: boolean;
  onSelect: (area: MountainAreaId) => void;
  onSelectMountain: (name: string, area: MountainAreaId | undefined) => void;
  counts: Record<MountainAreaId, number>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const buttons = useRef(new Map<MountainAreaId, HTMLButtonElement>());
  const peakButtons = useRef(new Map<HTMLButtonElement, MountainAreaId>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [relativeZoom, setRelativeZoom] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let observer: ResizeObserver | undefined;
    let popup: import("maplibre-gl").Popup | undefined;
    const markers = buttons.current;
    const peaks = peakButtons.current;
    const timeout = window.setTimeout(() => { if (!cancelled) setStatus("error"); }, 20000);

    async function initialize() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container.current) return;
        // Served locally for static exports; synced by prepare-map-assets.mjs.
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.js");
        map = new maplibre.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          bounds: countryBounds,
          fitBoundsOptions: { padding: countryPadding },
          minZoom: 3,
          maxZoom: 12,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
        const peakElements: HTMLButtonElement[] = [];
        const updatePeakVisibility = () => {
          if (!map) return;
          // Match two navigation zoom steps from the reset view at any map size.
          const resetZoom = map.cameraForBounds(countryBounds, { padding: countryPadding })?.zoom ?? map.getMinZoom();
          const zoomOffset = map.getZoom() - Math.max(map.getMinZoom(), resetZoom);
          setRelativeZoom(Math.round(zoomOffset * 10) / 10);
          const visible = map.getZoom() >= Math.max(map.getMinZoom(), resetZoom) + peakZoomSteps - 0.01;
          for (const button of peakElements) button.style.display = visible ? "" : "none";
          for (const button of markers.values()) button.style.display = visible ? "none" : "";
          if (!visible) popup?.remove();
        };
        for (const mountain of mapMountains) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mountain-peak-marker";
          button.style.display = "none";
          peakElements.push(button);
          const icon = document.createElement("span");
          icon.textContent = "▲";
          icon.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.className = "mountain-peak-label";
          label.textContent = mountain.name;
          button.append(icon, label);
          button.title = mountain.name;
          button.setAttribute("aria-label", `${mountain.name}, ${mountain.location}`);
          const areaId = getMountainArea(mountain);
          if (areaId) peaks.set(button, areaId);
          button.setAttribute("aria-controls", "mountain-area-results");
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            onSelectMountain(mountain.name, areaId);
            if (!map) return;
            popup?.remove();
            const content = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = mountain.name;
            const location = document.createElement("p");
            location.textContent = mountain.location;
            const note = document.createElement("p");
            note.textContent = "Approximate mountain location";
            note.className = "mountain-peak-note";
            content.append(name, location, note);
            popup = new maplibre.Popup({ offset: 16, anchor: "bottom", className: "mountain-peak-popup" })
              .setLngLat(mountain.coordinates).setDOMContent(content).addTo(map);
          });
          new maplibre.Marker({ element: button }).setLngLat(mountain.coordinates).addTo(map);
        }
        updatePeakVisibility();
        map.on("zoom", updatePeakVisibility);
        map.on("resize", updatePeakVisibility);
        map.on("load", () => {
          if (!map || cancelled) return;
          map.addSource("climbing-areas", {
            type: "geojson",
            data: "/map-data/climbing-areas.geojson",
          });
          const labels = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
          map.addLayer({
            id: "climbing-area-fill",
            type: "fill",
            source: "climbing-areas",
            paint: {
              "fill-color": "#1499aa",
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.3, 0.12],
            },
          }, labels);
          map.addLayer({
            id: "climbing-area-outline",
            type: "line",
            source: "climbing-areas",
            paint: { "line-color": "#1499aa", "line-width": 1, "line-opacity": 0.65 },
          }, labels);
          let hoveredId: string | number | undefined;
          map.on("mousemove", "climbing-area-fill", (event) => {
            if (!map) return;
            map.getCanvas().style.cursor = "pointer";
            const id = event.features?.[0]?.id;
            if (id === hoveredId) return;
            if (hoveredId !== undefined) map.setFeatureState({ source: "climbing-areas", id: hoveredId }, { hover: false });
            hoveredId = id;
            if (id !== undefined) map.setFeatureState({ source: "climbing-areas", id }, { hover: true });
          });
          map.on("mouseleave", "climbing-area-fill", () => {
            if (!map) return;
            map.getCanvas().style.cursor = "";
            if (hoveredId !== undefined) map.setFeatureState({ source: "climbing-areas", id: hoveredId }, { hover: false });
            hoveredId = undefined;
          });
          map.on("click", "climbing-area-fill", (event) => {
            const areaId = event.features?.[0]?.properties?.areaId;
            const area = mountainAreas.find((item) => item.id === areaId);
            if (!area) return;
            popup?.remove();
            onSelect(area.id);
          });
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
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            popup?.remove();
            onSelect(area.id);
            if (!map) return;
            const areaPeaks = mapMountains.filter((mountain) => getMountainArea(mountain) === area.id);
            const bounds = new maplibre.LngLatBounds();
            bounds.extend([...area.coordinates]);
            for (const mountain of areaPeaks) bounds.extend(mountain.coordinates);
            const padding = { top: 110, bottom: 60, left: 70, right: 70 };
            const camera = map.cameraForBounds(bounds, { padding, maxZoom: 9 });
            const resetZoom = map.cameraForBounds(countryBounds, { padding: countryPadding })?.zoom ?? map.getMinZoom();
            map.easeTo({
              ...cameraAnimation,
              center: camera?.center ?? [...area.coordinates],
              zoom: Math.max(camera?.zoom ?? 9, Math.max(map.getMinZoom(), resetZoom) + peakZoomSteps),
              bearing: 0,
              pitch: 0,
            });
          });
          markers.set(area.id, button);
          new maplibre.Marker({ element: button }).setLngLat([...area.coordinates]).addTo(map);
        }
        updatePeakVisibility();
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
      popup?.remove();
      map?.remove();
      mapRef.current = null;
      markers.clear();
      peaks.clear();
    };
  }, [onSelect, onSelectMountain, attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !selectedMountain) return;
    const mountain = mapMountains.find((item) => item.name.toLowerCase().replace(/^mt\.\s*/, "mount ") === selectedMountain.name);
    if (!mountain) return;
    const focusMountain = () => {
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const height = map.getContainer().clientHeight;
      // Center in the exposed map above the sheet (or its collapsed 56px bar).
      const coveredHeight = mobile ? (listOpen ? height * 2 / 3 : 56) : 0;
      const resetZoom = map.cameraForBounds(countryBounds, { padding: countryPadding })?.zoom ?? map.getMinZoom();
      map.easeTo({
        ...cameraAnimation,
        center: mountain.coordinates,
        zoom: Math.min(map.getMaxZoom(), Math.max(9, map.getZoom(), resetZoom + peakZoomSteps)),
        offset: [0, -coveredHeight / 2],
        bearing: 0,
        pitch: 0,
        essential: false,
      });
    };
    focusMountain();
    map.on("resize", focusMountain);
    return () => { map.off("resize", focusMountain); };
  }, [selectedMountain, listOpen, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("climbing-area-fill")) {
      map.setPaintProperty("climbing-area-fill", "fill-opacity", [
        "case", ["==", ["get", "areaId"], selectedArea], 0.4,
        ["boolean", ["feature-state", "hover"], false], 0.3, 0.12,
      ]);
      map.setPaintProperty("climbing-area-outline", "line-width", [
        "case", ["==", ["get", "areaId"], selectedArea], 2.5, 1,
      ]);
    }
    for (const [button, areaId] of peakButtons.current) {
      button.setAttribute("aria-pressed", String(selectedArea === areaId));
    }
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
    <div className="mountain-area-map relative isolate h-full min-w-0 overflow-hidden bg-[#182725] lg:h-[600px]">
      <div ref={container} style={{ position: "absolute", inset: 0 }} role="region" aria-label="Interactive map of Philippine climbing areas" />
      <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-start justify-end gap-3">
        <button type="button" onClick={() => mapRef.current?.fitBounds(countryBounds, { ...cameraAnimation, padding: countryPadding, linear: true, bearing: 0, pitch: 0 })} className="pointer-events-auto min-h-11 rounded-xl border border-white/10 bg-[#20332e]/95 px-3 text-xs text-white shadow-sm focus-visible:outline-2 focus-visible:outline-turquoise">Reset view ({relativeZoom > 0 ? "+" : ""}{relativeZoom})</button>
      </div>
      {status !== "ready" && <div role="status" className="absolute inset-x-4 top-20 z-10 rounded-xl bg-[#20332e]/95 p-4 text-sm text-zinc-200 shadow-sm">
        {status === "loading" ? "Loading the map…" : <>
          <p>The map couldn&apos;t load. You can still choose an area from the list.</p>
          <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className="mt-2 min-h-11 rounded px-2 text-turquoise underline focus-visible:outline-turquoise">Retry map</button>
        </>}
      </div>}
    </div>
  );
}
