"use client";

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { getMountainArea, mountainAreas, mountainAreaColors, mountainAreaProvinces, type MountainAreaId } from "@/data/mountain-areas";
import { MapAreaTooltip } from "@/components/map-area-tooltip";
import { hikeItineraries } from "@/data/hike-itineraries";
import { mapMountains, mountainDifficultyLabel } from "@/data/map-mountains";
import { readMapCamera, writeMapCamera } from "@/lib/map-url";

import { primaryMapMountains, getVisibleSecondaryMountains, mountainMapFeatures, getMountainMapLayer } from "@/data/mountain-map-layers";

const mountainLayerIds = ["mountain", "secondary-mountain"].flatMap((prefix) => ["clusters", "cluster-count", "points", "labels"].map((suffix) => `${prefix}-${suffix}`));
const clickableMountainLayers = ["mountain", "secondary-mountain"].flatMap((prefix) => ["clusters", "points", "labels"].map((suffix) => `${prefix}-${suffix}`));
const areaColorExpression: import("maplibre-gl").ExpressionSpecification = ["match", ["get", "areaId"], mountainAreas[0].id, mountainAreaColors[mountainAreas[0].id], ...mountainAreas.slice(1).flatMap((area) => [area.id, mountainAreaColors[area.id]]), "#64748b"];
const clusterColorExpression: import("maplibre-gl").ExpressionSpecification = ["case", ["==", ["get", "regionMin"], ["get", "regionMax"]], ["match", ["get", "regionMin"], 0, mountainAreaColors[mountainAreas[0].id], ...mountainAreas.slice(1).flatMap((area, index) => [index + 1, mountainAreaColors[area.id]]), "#64748b"], "#64748b"];

const mapEntries = [
  ...mapMountains.map((mountain) => ({ ...mountain, itinerary: false })),
  ...hikeItineraries.map((itinerary) => ({ slug: itinerary.slug, name: itinerary.name, location: itinerary.location, coordinates: itinerary.coordinates, itinerary: true })),
];

const countryBounds: [[number, number], [number, number]] = [[116.8, 4.5], [127, 21.3]];
const countryPadding = { top: 80, bottom: 40, left: 24, right: 24 };
const peakZoomSteps = 2;
const cameraAnimation = {
  duration: 1000,
  easing: (progress: number) => progress * progress * (3 - 2 * progress),
};

export function MountainAreaMap({ selectedArea, selectedMountain, revealAllMountains, listOpen, sheetHeight, onMapInteraction, onSelect, onSelectMountain, counts }: {
  selectedArea: MountainAreaId | "all";
  selectedMountain: { name: string; slug?: string } | null;
  revealAllMountains: boolean;
  listOpen: boolean;
  sheetHeight: number;
  onMapInteraction: (clearSelection?: boolean) => void;
  onSelect: (area: MountainAreaId) => void;
  onSelectMountain: (name: string, area: MountainAreaId | undefined, slug?: string) => void;
  counts: Record<MountainAreaId, number>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const visibility = useRef({ revealAllMountains, selectedSlug: selectedMountain?.slug });
  useEffect(() => {
    visibility.current = { revealAllMountains, selectedSlug: selectedMountain?.slug };
  }, [revealAllMountains, selectedMountain]);
  const buttons = useRef(new Map<MountainAreaId, HTMLButtonElement>());
  const peakButtons = useRef(new Map<HTMLButtonElement, MountainAreaId>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [relativeZoom, setRelativeZoom] = useState(0);
  const [areaTooltip, setAreaTooltip] = useState<{ text: string; x: number; y: number; below: boolean; touch: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let observer: ResizeObserver | undefined;
    let popup: import("maplibre-gl").Popup | undefined;
    let previewedArea: MountainAreaId | undefined;
    const restoreCamera = () => {
      const camera = readMapCamera(new URL(window.location.href));
      if (camera && map) map.jumpTo({ ...camera, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    };
    const updateCameraUrl = () => {
      if (!map || cancelled) return;
      const center = map.getCenter();
      const next = writeMapCamera(new URL(window.location.href), { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
      if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(window.history.state, "", next);
      }
    };
    const markers = buttons.current;
    const peaks = peakButtons.current;
    const timeout = window.setTimeout(() => { if (!cancelled) setStatus("error"); }, 20000);

    async function initialize() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container.current) return;
        // Served locally for static exports; synced by prepare-map-assets.mjs.
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.js");
        const sharedCamera = readMapCamera(new URL(window.location.href));
        map = new maplibre.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          ...(sharedCamera ? sharedCamera : { bounds: countryBounds, fitBoundsOptions: { padding: countryPadding } }),
          minZoom: 3,
          maxZoom: 12,
          cooperativeGestures: !window.matchMedia("(pointer: coarse)").matches,
          attributionControl: { compact: true },
        });
        if (window.matchMedia("(pointer: coarse)").matches) {
          map.touchZoomRotate.disableRotation();
          map.dragRotate.disable();
          map.touchPitch.disable();
          map.setBearing(0);
          map.setPitch(0);
        }
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
          for (const layer of mountainLayerIds) {
            if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
          }
          if (!visible) popup?.remove();
        };
        // Eight itinerary markers remain DOM buttons; thousands of peaks use
        // clustered WebGL layers below to avoid thousands of DOM elements.
        for (const mountain of mapEntries.filter((entry) => entry.itinerary)) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mountain-peak-marker";
          button.dataset.mountainSlug = mountain.slug;
          button.dataset.mountainName = mountain.name.toLowerCase().replace(/^mt\.\s*/, "mount ");
          button.style.display = "none";
          peakElements.push(button);
          const icon = document.createElement("span");
          icon.textContent = mountain.itinerary ? "\u25c6" : "\u25b2";
          icon.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.className = "mountain-peak-label";
          label.textContent = mountain.name;
          button.append(icon, label);
          button.title = mountain.name;
          button.setAttribute("aria-label", `${mountain.name}, ${mountain.location}`);
          const areaId = getMountainArea(mountain);
          if (areaId) {
            button.style.setProperty("--area-color", mountainAreaColors[areaId]);
            button.style.backgroundColor = mountainAreaColors[areaId];
          }
          if (areaId) peaks.set(button, areaId);
          button.setAttribute("aria-controls", "mountain-area-results");
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            onSelectMountain(mountain.name, areaId, mountain.slug);
            if (!map) return;
            popup?.remove();
            const content = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = mountain.name;
            const location = document.createElement("p");
            location.textContent = mountain.location;
            const note = document.createElement("p");
            note.textContent = mountain.itinerary ? "Hike itinerary - approximate area, not a route" : "Approximate mountain location";
            note.className = "mountain-peak-note";
            content.append(name, location, note);
            popup = new maplibre.Popup({ offset: 48, anchor: "bottom", className: "mountain-peak-popup" })
              .setLngLat(mountain.coordinates).setDOMContent(content).addTo(map);
          });
          new maplibre.Marker({ element: button, offset: mountain.itinerary ? [0, -28] : [0, 0] }).setLngLat(mountain.coordinates).addTo(map);
        }
        updatePeakVisibility();
        map.on("zoom", updatePeakVisibility);
        map.on("resize", updatePeakVisibility);
        map.on("movestart", () => { previewedArea = undefined; setAreaTooltip(null); });
        map.on("click", (event) => {
          if (!map || !window.matchMedia("(max-width: 1023px)").matches) return;
          if (map.getLayer("mountain-points") && map.queryRenderedFeatures(event.point, { layers: clickableMountainLayers }).length) {
            onMapInteraction();
            return;
          }
          onMapInteraction(true);
          map.easeTo({ ...cameraAnimation, center: event.lngLat, offset: [0, -map.getContainer().clientHeight * 0.4 / 2] });
        });
        map.on("load", () => {
          if (!map || cancelled) return;
          const fontLayer = map.getStyle().layers?.find((layer) => layer.type === "symbol" && layer.layout?.["text-font"]) as import("maplibre-gl").SymbolLayerSpecification | undefined;
          const textFont = fontLayer?.layout?.["text-font"] ?? ["Noto Sans Regular"];
          for (const prefix of ["mountain", "secondary-mountain"]) {
          const sourceId = `${prefix}-source`;
          map.addSource(sourceId, {
            type: "geojson",
            attribution: '<a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0) · <a href="https://github.com/j4ckofalltrades/phl-mountains">Philippine mountains</a>',
            cluster: true,
            clusterProperties: { regionMin: ["min", ["get", "regionIndex"]], regionMax: ["max", ["get", "regionIndex"]] },
            clusterMaxZoom: 10,
            clusterRadius: 36,
            data: mountainMapFeatures(prefix === "mountain" ? primaryMapMountains : getVisibleSecondaryMountains(visibility.current.revealAllMountains, visibility.current.selectedSlug)),
          });
          map.addLayer({ id: `${prefix}-clusters`, type: "circle", source: sourceId, filter: ["has", "point_count"], paint: { "circle-color": clusterColorExpression, "circle-radius": ["step", ["get", "point_count"], 16, 20, 20, 100, 25], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 } });
          map.addLayer({ id: `${prefix}-cluster-count`, type: "symbol", source: sourceId, filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": textFont, "text-size": 12 }, paint: { "text-color": "#ffffff" } });
          map.addLayer({ id: `${prefix}-points`, type: "circle", source: sourceId, filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["get", "color"], "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } });
          map.addLayer({ id: `${prefix}-labels`, type: "symbol", source: sourceId, minzoom: 9, filter: ["!", ["has", "point_count"]], layout: { "text-field": ["get", "name"], "text-font": textFont, "text-size": 11, "text-offset": [0, 1.5], "text-anchor": "top" }, paint: { "text-color": "#20332e", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
          map.on("click", `${prefix}-clusters`, async (event) => {
            const feature = event.features?.[0];
            if (!map || !feature || feature.geometry.type !== "Point") return;
            const source = map.getSource(sourceId) as GeoJSONSource;
            try {
              const zoom = await source.getClusterExpansionZoom(Number(feature.properties.cluster_id));
              if (!cancelled && map) map.easeTo({ ...cameraAnimation, center: feature.geometry.coordinates as [number, number], zoom });
            } catch { /* The map may have been removed while the worker replied. */ }
          });
          }
          const selectPeak = (event: import("maplibre-gl").MapLayerMouseEvent) => {
            const mountain = mapMountains.find((entry) => entry.slug === event.features?.[0]?.properties?.slug);
            if (!map || !mountain) return;
            onSelectMountain(mountain.name, getMountainArea(mountain), mountain.slug);
            popup?.remove();
            const content = document.createElement("div");
            const name = document.createElement("strong"); name.textContent = mountain.name;
            const location = document.createElement("p"); location.textContent = mountain.location;
            const rating = document.createElement("p"); rating.textContent = mountainDifficultyLabel(mountain);
            const source = document.createElement("a");
            source.href = mountain.trails?.[0]?.source.url ?? mountain.sources[0].url;
            source.textContent = mountain.trails?.length ? "Read route source" : "Location source";
            source.target = "_blank"; source.rel = "noopener noreferrer";
            const layer = document.createElement("p"); layer.textContent = getMountainMapLayer(mountain.slug) === "secondary" ? "Secondary map layer" : "Primary map layer";
            content.append(name, location, layer, rating, source);
            popup = new maplibre.Popup({ offset: 16, anchor: "bottom", className: "mountain-peak-popup" }).setLngLat(mountain.coordinates).setDOMContent(content).addTo(map);
          };
          for (const prefix of ["mountain", "secondary-mountain"]) {
            map.on("click", `${prefix}-points`, selectPeak);
            map.on("click", `${prefix}-labels`, selectPeak);
          }
          for (const layer of clickableMountainLayers) {
            map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
          }
          updatePeakVisibility();
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
              "fill-color": areaColorExpression,
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.3, 0.12],
            },
          }, labels);
          map.addLayer({
            id: "climbing-area-outline",
            type: "line",
            source: "climbing-areas",
            paint: { "line-color": areaColorExpression, "line-width": 1, "line-opacity": 0.65 },
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
            if (map?.queryRenderedFeatures(event.point, { layers: clickableMountainLayers }).length) return;
            const areaId = event.features?.[0]?.properties?.areaId;
            const area = mountainAreas.find((item) => item.id === areaId);
            if (!area) return;
            popup?.remove();
            onSelect(area.id);
          });
          window.clearTimeout(timeout);
          if (!cancelled) setStatus("ready");
          // Write only after loading so initial bounds cannot overwrite a shared view.
          map.on("moveend", updateCameraUrl);
          window.addEventListener("popstate", restoreCamera);
          updateCameraUrl();
        });
        map.on("error", () => {
          if (!cancelled && !map?.isStyleLoaded()) setStatus("error");
        });
        for (const area of mountainAreas) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mountain-area-marker";
          button.style.backgroundColor = mountainAreaColors[area.id];
          button.style.borderColor = mountainAreaColors[area.id];
          button.style.setProperty("--area-color", mountainAreaColors[area.id]);
          button.setAttribute("aria-controls", "mountain-area-results");
          button.setAttribute("aria-label", area.name);
          button.setAttribute("aria-describedby", "map-area-tooltip");
          const showTooltip = () => {
            if (!container.current) return;
            const bounds = container.current.getBoundingClientRect();
            const marker = button.getBoundingClientRect();
            const below = marker.top - bounds.top < 105;
            setAreaTooltip({
              text: `${area.name}: ${mountainAreaProvinces[area.id]}`,
              x: Math.max(Math.min(132, bounds.width / 2), Math.min(bounds.width - 132, marker.left - bounds.left + marker.width / 2)),
              y: below ? marker.bottom - bounds.top + 4 : marker.top - bounds.top - 4,
              below,
              touch: window.matchMedia("(hover: none)").matches,
            });
          };
          button.addEventListener("mouseenter", showTooltip);
          button.addEventListener("focus", showTooltip);
          const hideHoverTooltip = () => {
            if (window.matchMedia("(hover: hover)").matches) setAreaTooltip(null);
          };
          button.addEventListener("mouseleave", hideHoverTooltip);
          button.addEventListener("blur", hideHoverTooltip);
          button.textContent = String(area.mountainSlugs.length);
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            if (window.matchMedia("(hover: none)").matches && previewedArea !== area.id) {
              previewedArea = area.id;
              showTooltip();
              return;
            }
            previewedArea = undefined;
            setAreaTooltip(null);
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
      window.removeEventListener("popstate", restoreCamera);
      popup?.remove();
      map?.remove();
      mapRef.current = null;
      markers.clear();
      peaks.clear();
    };
  }, [onSelect, onSelectMountain, onMapInteraction, attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const source = map.getSource("secondary-mountain-source") as GeoJSONSource | undefined;
    source?.setData(mountainMapFeatures(getVisibleSecondaryMountains(revealAllMountains, selectedMountain?.slug)));
  }, [revealAllMountains, selectedMountain, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !selectedMountain) return;
    const mountain = mapEntries.find((item) => selectedMountain.slug ? item.slug === selectedMountain.slug : item.name.toLowerCase().replace(/^mt\.\s*/, "mount ") === selectedMountain.name);
    if (!mountain) return;
    for (const layer of ["mountain-points", "secondary-mountain-points"]) {
      if (!map.getLayer(layer)) continue;
      map.setPaintProperty(layer, "circle-radius", ["case", ["==", ["get", "slug"], mountain.slug], 10, 7]);
      map.setPaintProperty(layer, "circle-stroke-color", ["case", ["==", ["get", "slug"], mountain.slug], "#38bdf8", "#ffffff"]);
    }
    const focusMountain = () => {
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const height = map.getContainer().clientHeight;
      // Center in the exposed map above the sheet (or its collapsed 56px bar).
      const coveredHeight = mobile ? (listOpen ? height * sheetHeight : 56) : 0;
      const resetZoom = map.cameraForBounds(countryBounds, { padding: countryPadding })?.zoom ?? map.getMinZoom();
      map.easeTo({
        ...cameraAnimation,
        center: mountain.coordinates,
        // Cluster expansion ends at zoom 11, so the selected peak is visible.
        zoom: Math.min(map.getMaxZoom(), Math.max(11, map.getZoom(), resetZoom + peakZoomSteps)),
        offset: [0, -coveredHeight / 2],
        bearing: 0,
        pitch: 0,
        essential: false,
      });
    };
    focusMountain();
    map.on("resize", focusMountain);
    return () => { map.off("resize", focusMountain); };
  }, [selectedMountain, listOpen, sheetHeight, status]);

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
    for (const button of peakButtons.current.keys()) {
      button.setAttribute("aria-pressed", String(selectedMountain?.slug
        ? selectedMountain.slug === button.dataset.mountainSlug
        : selectedMountain?.name === button.dataset.mountainName));
    }
    for (const area of mountainAreas) {
      const button = buttons.current.get(area.id);
      if (!button) continue;
      button.setAttribute("aria-pressed", String(selectedArea === area.id));
      button.setAttribute("aria-label", `${area.name}, ${counts[area.id]} matching mountains`);
      button.title = `${area.name} · ${counts[area.id]} mountains`;
      button.removeAttribute("title");
      button.textContent = String(counts[area.id]);
    }
  }, [selectedArea, selectedMountain, counts, status]);

  return (
    <div className="mountain-area-map relative isolate h-full min-w-0 overflow-hidden bg-[#182725] lg:h-[600px]">
      <div ref={container} style={{ position: "absolute", inset: 0 }} role="region" aria-label="Interactive map of Philippine climbing areas" />
      {areaTooltip && <MapAreaTooltip key={areaTooltip.text} {...areaTooltip} />}
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
