"use client";

import { regionClicksEnabledAfterZoom } from "@/lib/map-interaction";
import { loadClimbingAreas, loadMapEngine } from "@/lib/map-resources";
import { readRememberedMapCamera, rememberMapCamera } from "@/lib/map-session";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { getMountainArea, mountainAreas, mountainAreaColors, mountainAreaProvinces, type MountainAreaId } from "@/data/mountain-areas";
import { MapAreaTooltip } from "@/components/map-area-tooltip";
import { hikeItineraries } from "@/data/hike-itineraries";
import { getItineraryMapMountains, getItineraryHighlightFeatures, playMountainHighlightSequence, type MountainGroupHighlight } from "@/lib/map-group-highlight";
import { mapMountains, mountainDifficultyLabel } from "@/data/map-mountains";
import { readMapCamera, writeMapCamera } from "@/lib/map-url";

import { primaryMapMountains, getVisibleSecondaryMountains, mountainMapFeatures, getMountainMapLayer } from "@/data/mountain-map-layers";

const mountainLayerIds = ["mountain", "secondary-mountain"].flatMap((prefix) => ["clusters", "cluster-count", "points", "labels"].map((suffix) => `${prefix}-${suffix}`));
const clickableMountainLayers = [...["mountain", "secondary-mountain"].flatMap((prefix) => ["clusters", "points", "labels"].map((suffix) => `${prefix}-${suffix}`)), "group-member-points", "group-member-labels"];
const areaColorExpression: import("maplibre-gl").ExpressionSpecification = ["match", ["get", "areaId"], mountainAreas[0].id, mountainAreaColors[mountainAreas[0].id], ...mountainAreas.slice(1).flatMap((area) => [area.id, mountainAreaColors[area.id]]), "#64748b"];
const clusterColorExpression: import("maplibre-gl").ExpressionSpecification = ["case", ["==", ["get", "regionMin"], ["get", "regionMax"]], ["match", ["get", "regionMin"], 0, mountainAreaColors[mountainAreas[0].id], ...mountainAreas.slice(1).flatMap((area, index) => [index + 1, mountainAreaColors[area.id]]), "#64748b"], "#64748b"];

const mapEntries = [
  ...mapMountains.map((mountain) => ({ ...mountain, itinerary: false as const })),
  ...hikeItineraries.map((itinerary) => ({ slug: itinerary.slug, name: itinerary.name, location: itinerary.location, coordinates: itinerary.coordinates, itinerary: true as const })),
];

const countryBounds: [[number, number], [number, number]] = [[116.8, 4.5], [127, 21.3]];
const countryPadding = { top: 80, bottom: 40, left: 24, right: 24 };
const peakZoomSteps = 2;
const cameraAnimation = {
  duration: 1000,
  easing: (progress: number) => progress * progress * (3 - 2 * progress),
};

export function MountainAreaMap({ selectedArea, selectedMountain, revealAllMountains, listOpen, sheetHeight, onMapInteraction, onClearSelection, onSelect, onSelectMountain, counts }: {
  selectedArea: MountainAreaId | "all";
  selectedMountain: { name: string; slug?: string } | null;
  revealAllMountains: boolean;
  listOpen: boolean;
  sheetHeight: number;
  onMapInteraction: (clearSelection?: boolean) => void;
  onClearSelection: () => void;
  onSelect: (area: MountainAreaId) => void;
  onSelectMountain: (name: string, area: MountainAreaId | undefined, slug?: string) => void;
  counts: Record<MountainAreaId, number>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const showSelectedPopup = useRef<((mountain: (typeof mapEntries)[number] | null) => void) | null>(null);
  const visibility = useRef({ revealAllMountains, selectedSlug: selectedMountain?.slug });
  useEffect(() => {
    visibility.current = { revealAllMountains, selectedSlug: selectedMountain?.slug };
  }, [revealAllMountains, selectedMountain]);
  const buttons = useRef(new Map<MountainAreaId, HTMLButtonElement>());
  const peakButtons = useRef(new Map<HTMLButtonElement, MountainAreaId>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const zoomToRegion = useRef<((area: MountainAreaId) => void) | null>(null);
  const [zoom, setZoom] = useState(0);
  const [relativeZoom, setRelativeZoom] = useState(0);
  const [areaTooltip, setAreaTooltip] = useState<{ text: string; x: number; y: number; below: boolean; touch: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let observer: ResizeObserver | undefined;
    let popup: import("maplibre-gl").Popup | undefined;
    let clearOnPopupClose: (() => void) | undefined;
    const removePopup = () => {
      // Programmatic replacement must not clear the newly selected destination.
      if (clearOnPopupClose) popup?.off("close", clearOnPopupClose);
      popup?.remove();
      popup = undefined;
      clearOnPopupClose = undefined;
    };
    let regionClicksEnabled = true;
    const restoreCamera = () => {
      const camera = readMapCamera(new URL(window.location.href));
      if (camera && map) map.jumpTo({ ...camera, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    };
    const updateCameraUrl = () => {
      if (!map || cancelled) return;
      const center = map.getCenter();
      const camera = { center: [center.lng, center.lat] as [number, number], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
      rememberMapCamera(camera);
      const next = writeMapCamera(new URL(window.location.href), camera);
      if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(window.history.state, "", next);
      }
    };
    const markers = buttons.current;
    const peaks = peakButtons.current;
    const timeout = window.setTimeout(() => { if (!cancelled) setStatus("error"); }, 20000);

    async function initialize() {
      try {
        const [maplibre, { geometry: areaGeometry, bounds: regionBounds }] = await Promise.all([loadMapEngine(), loadClimbingAreas()]);
        if (cancelled || !container.current) return;
        const sharedCamera = readMapCamera(new URL(window.location.href)) ?? readRememberedMapCamera();
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
        zoomToRegion.current = (areaId) => {
          const bounds = regionBounds[areaId];
          if (!map || !bounds) return;
          removePopup();
          setAreaTooltip(null);
          onSelect(areaId);
          const mobile = window.matchMedia("(max-width: 1023px)").matches;
          map.fitBounds(bounds, {
            ...cameraAnimation,
            padding: { top: 110, bottom: mobile ? map.getContainer().clientHeight * 0.4 + 24 : 40, left: 24, right: 24 },
            maxZoom: 9, linear: true, bearing: 0, pitch: 0,
          });
        };
        showSelectedPopup.current = (mountain) => {
          removePopup();
          if (!map || !mountain) return;
          const content = document.createElement("div");
          const name = document.createElement("strong"); name.textContent = mountain.name;
          const location = document.createElement("p"); location.textContent = mountain.location;
          content.append(name, location);
          if (mountain.itinerary) {
            const note = document.createElement("p");
            note.textContent = "Hike itinerary - approximate area, not a route";
            note.className = "mountain-peak-note";
            content.append(note);
            const itinerary = hikeItineraries.find((entry) => entry.slug === mountain.slug);
            const mountainTargets = itinerary?.targets.length ?? 0;
            if (itinerary && !getItineraryMapMountains(itinerary).length) {
              const coverage = document.createElement("p");
              coverage.textContent = "Highlighting the group area; individual destination locations are unavailable.";
              coverage.className = "mountain-peak-note";
              content.append(coverage);
            } else if (itinerary && mountainTargets) {
              const mapped = getItineraryMapMountains(itinerary).length;
              if (mapped < mountainTargets) {
                const coverage = document.createElement("p");
                coverage.textContent = "Showing " + mapped + " of " + mountainTargets + " destinations; other map locations are unavailable.";
                coverage.className = "mountain-peak-note";
                content.append(coverage);
              }
            }
          } else {
            const rating = document.createElement("p"); rating.textContent = mountainDifficultyLabel(mountain);
            const source = document.createElement("a");
            source.href = mountain.trails?.[0]?.source.url ?? mountain.sources[0].url;
            source.textContent = mountain.trails?.length ? "Read route source" : "Location source";
            source.target = "_blank"; source.rel = "noopener noreferrer";
            const layer = document.createElement("p");
            layer.textContent = getMountainMapLayer(mountain.slug) === "secondary" ? "Secondary map layer" : "Primary map layer";
            content.append(layer, rating, source);
          }
          popup = new maplibre.Popup({ offset: mountain.itinerary ? 48 : 16, anchor: "bottom", className: "mountain-peak-popup", closeOnClick: false })
            .setLngLat(mountain.coordinates).setDOMContent(content).addTo(map);
          clearOnPopupClose = () => {
            popup = undefined;
            clearOnPopupClose = undefined;
            onClearSelection();
          };
          popup.on("close", clearOnPopupClose);
        };
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
        const peakElements: HTMLButtonElement[] = [];
        const updatePeakVisibility = () => {
          if (!map) return;
          // Match two navigation zoom steps from the reset view at any map size.
          const resetZoom = map.cameraForBounds(countryBounds, { padding: countryPadding })?.zoom ?? map.getMinZoom();
          const zoomOffset = map.getZoom() - Math.max(map.getMinZoom(), resetZoom);
          regionClicksEnabled = regionClicksEnabledAfterZoom(zoomOffset);
          setRelativeZoom(Math.round(zoomOffset * 10) / 10);
          setZoom(map.getZoom());
          const visible = map.getZoom() >= Math.max(map.getMinZoom(), resetZoom) + peakZoomSteps - 0.01;
          for (const button of peakElements) button.style.display = visible ? "" : "none";
          for (const button of markers.values()) button.style.display = visible ? "none" : "";
          for (const layer of mountainLayerIds) {
            if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
          }
          if (!visible && popup) {
            removePopup();
            onClearSelection();
          }
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
          });
          new maplibre.Marker({ element: button, offset: mountain.itinerary ? [0, -28] : [0, 0] }).setLngLat(mountain.coordinates).addTo(map);
        }
        updatePeakVisibility();
        map.on("zoom", updatePeakVisibility);
        map.on("resize", updatePeakVisibility);
        map.on("movestart", () => setAreaTooltip(null));
        map.on("click", (event) => {
          if (!map) return;
          if (map.getLayer("mountain-points") && map.queryRenderedFeatures(event.point, { layers: clickableMountainLayers }).length) {
            onMapInteraction();
            return;
          }
          // Region clicks have their own bounds animation on every screen size.
          if (regionClicksEnabled && map.getLayer("climbing-area-fill") && map.queryRenderedFeatures(event.point, { layers: ["climbing-area-fill"] }).length) return;
          onMapInteraction(true);
          if (window.matchMedia("(max-width: 1023px)").matches) {
            map.easeTo({ ...cameraAnimation, center: event.lngLat, offset: [0, -map.getContainer().clientHeight * 0.4 / 2] });
          }
        });
        map.on("load", () => {
          if (!map || cancelled) return;
          const fontLayer = map.getStyle().layers?.find((layer) => layer.type === "symbol" && layer.layout?.["text-font"]) as import("maplibre-gl").SymbolLayerSpecification | undefined;
          const textFont = fontLayer?.layout?.["text-font"] ?? ["Noto Sans Regular"];
          for (const prefix of ["mountain", "secondary-mountain"]) {
          const sourceId = `${prefix}-source`;
          map.addSource(sourceId, {
            type: "geojson",
            attribution: '<a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0) · <a href="https://github.com/j4ckofalltrades/phl-mountains">Philippine mountains</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (ODbL)',
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
          // Unclustered members remain visible independently of the reveal-all toggle.
          map.addSource("group-members", { type: "geojson", data: mountainMapFeatures([]) });
          map.addLayer({
            id: "group-member-points", type: "circle", source: "group-members",
            paint: { "circle-color": ["get", "color"], "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5, "circle-color-transition": { duration: 0 }, "circle-radius-transition": { duration: 0 } },
          });
          map.addLayer({
            id: "group-member-labels", type: "symbol", source: "group-members", filter: ["has", "order"],
            layout: { "text-field": ["concat", ["to-string", ["get", "order"]], ". ", ["get", "name"]], "text-font": textFont, "text-size": 12, "text-variable-anchor": ["top", "bottom", "left", "right"], "text-radial-offset": 1.5 },
            paint: { "text-color": "#20332e", "text-halo-color": "#ffffff", "text-halo-width": 2 },
          });
          const selectPeak = (event: import("maplibre-gl").MapLayerMouseEvent) => {
            const slug = event.features?.[0]?.properties?.slug;
            if (typeof slug === "string" && slug.includes(":")) {
              const point = hikeItineraries.flatMap(getItineraryMapMountains).find(entry => entry.slug === slug);
              if (point) showSelectedPopup.current?.({ ...point, itinerary: false });
              return;
            }
            const mountain = mapMountains.find((entry) => entry.slug === slug) ?? hikeItineraries.find((entry) => entry.slug === slug);
            if (!map || !mountain) return;
            onSelectMountain(mountain.name, getMountainArea(mountain), mountain.slug);
          };
          for (const prefix of ["mountain", "secondary-mountain"]) {
            map.on("click", `${prefix}-points`, selectPeak);
            map.on("click", `${prefix}-labels`, selectPeak);
          }
          map.on("click", "group-member-points", selectPeak);
          map.on("click", "group-member-labels", selectPeak);
          for (const layer of clickableMountainLayers) {
            map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
          }
          updatePeakVisibility();
          map.addSource("climbing-areas", {
            type: "geojson",
            data: areaGeometry,
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
            const overPeak = map.queryRenderedFeatures(event.point, { layers: clickableMountainLayers }).length > 0;
            map.getCanvas().style.cursor = regionClicksEnabled || overPeak ? "pointer" : "";
            if (!regionClicksEnabled) {
              if (hoveredId !== undefined) map.setFeatureState({ source: "climbing-areas", id: hoveredId }, { hover: false });
              hoveredId = undefined;
              return;
            }
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
            if (!regionClicksEnabled) return;
            if (map?.queryRenderedFeatures(event.point, { layers: clickableMountainLayers }).length) return;
            const areaId = event.features?.[0]?.properties?.areaId;
            const area = mountainAreas.find((item) => item.id === areaId);
            if (!area) return;
            zoomToRegion.current?.(area.id);
          });
          // Wait until the newly added boundary and peak layers finish rendering.
          map.once("idle", () => {
            window.clearTimeout(timeout);
            if (!cancelled) setStatus("ready");
          });
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
            setAreaTooltip(null);
            zoomToRegion.current?.(area.id);
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
      removePopup();
      if (map?.isStyleLoaded()) {
        const center = map.getCenter();
        rememberMapCamera({ center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
      }
      map?.remove();
      mapRef.current = null;
      showSelectedPopup.current = null;
      zoomToRegion.current = null;
      markers.clear();
      peaks.clear();
    };
  }, [onSelect, onSelectMountain, onMapInteraction, onClearSelection, attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const source = map.getSource("secondary-mountain-source") as GeoJSONSource | undefined;
    source?.setData(mountainMapFeatures(getVisibleSecondaryMountains(revealAllMountains, selectedMountain?.slug)));
  }, [revealAllMountains, selectedMountain, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    if (!selectedMountain) {
      for (const layer of ["mountain-points", "secondary-mountain-points"]) {
        if (!map.getLayer(layer)) continue;
        map.setPaintProperty(layer, "circle-radius", 7);
        map.setPaintProperty(layer, "circle-stroke-color", "#ffffff");
      }
      showSelectedPopup.current?.(null);
      return;
    }
    const mountain = mapEntries.find((item) => selectedMountain.slug ? item.slug === selectedMountain.slug : item.name.toLowerCase().replace(/^mt\.\s*/, "mount ") === selectedMountain.name);
    if (!mountain) return;
    showSelectedPopup.current?.(null);
    for (const layer of ["mountain-points", "secondary-mountain-points"]) {
      if (!map.getLayer(layer)) continue;
      map.setPaintProperty(layer, "circle-radius", ["case", ["==", ["get", "slug"], mountain.slug], 10, 7]);
      map.setPaintProperty(layer, "circle-stroke-color", ["case", ["==", ["get", "slug"], mountain.slug], "#38bdf8", "#ffffff"]);
    }
    const itinerary = mountain.itinerary ? hikeItineraries.find((entry) => entry.slug === mountain.slug) : undefined;
    const members = itinerary ? getItineraryMapMountains(itinerary) : [];
    const openPopup = () => showSelectedPopup.current?.(mountain);
    const focusMountain = () => {
      // Wait for the focus animation so low-zoom visibility cannot close the popup.
      map.off("moveend", openPopup);
      map.stop();
      map.once("moveend", openPopup);
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const height = map.getContainer().clientHeight;
      // Center in the exposed map above the sheet (or its collapsed 56px bar).
      const coveredHeight = mobile ? (listOpen ? height * sheetHeight : 56) : 0;
      const resetZoom = map.cameraForBounds(countryBounds, { padding: countryPadding })?.zoom ?? map.getMinZoom();
      if (members.length) {
        const coordinates = [mountain.coordinates, ...members.map((member) => member.coordinates)];
        map.fitBounds([
          [Math.min(...coordinates.map(([lng]) => lng)), Math.min(...coordinates.map(([, lat]) => lat))],
          [Math.max(...coordinates.map(([lng]) => lng)), Math.max(...coordinates.map(([, lat]) => lat))],
        ], {
          ...cameraAnimation,
          padding: { top: Math.min(100, (height - coveredHeight) * 0.25), bottom: coveredHeight + Math.min(40, (height - coveredHeight) * 0.15), left: 40, right: 40 },
          maxZoom: itinerary?.category === "multi-point" ? 15 : 11, linear: true, bearing: 0, pitch: 0,
        });
        return;
      }
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
    return () => {
      map.off("resize", focusMountain);
      map.off("moveend", openPopup);
    };
  }, [selectedMountain, listOpen, sheetHeight, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const source = map.getSource("group-members") as GeoJSONSource | undefined;
    if (!source) return;
    const itinerary = hikeItineraries.find((entry) => selectedMountain?.slug
      ? entry.slug === selectedMountain.slug
      : entry.name.toLowerCase().replace(/^mt\.\s*/, "mount ") === selectedMountain?.name);
    const features = itinerary ? getItineraryHighlightFeatures(itinerary) : mountainMapFeatures([]);
    source.setData(features);
    if (!features.features.length) return;
    const highlightSlugs = features.features.map((feature) => String(feature.properties?.slug));

    let previousFlashWhite: boolean | undefined;
    const highlight = ({ pulses, flashWhite }: MountainGroupHighlight) => {
      if (mapRef.current !== map || !map.getLayer("group-member-points")) return;
      if (flashWhite !== previousFlashWhite) {
        map.setPaintProperty("group-member-points", "circle-color", flashWhite ? "#ffffff" : ["get", "color"]);
        previousFlashWhite = flashWhite;
      }
      map.setPaintProperty("group-member-points", "circle-radius", pulses.length
        ? ["match", ["get", "slug"], pulses[0].slug, pulses[0].radius, ...pulses.slice(1).flatMap(({ slug, radius }) => [slug, radius]), 7]
        : 7);
    };
    let cancelSequence: (() => void) | undefined;
    const start = () => {
      cancelSequence?.();
      // Reduced-motion users keep a steady highlight for every member.
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        cancelSequence = playMountainHighlightSequence(highlightSlugs, highlight);
      }
    };
    highlight({ pulses: [], flashWhite: false });
    if (map.isMoving()) map.once("moveend", start);
    else start();
    return () => {
      map.off("moveend", start);
      cancelSequence?.();
      if (mapRef.current === map) source.setData(mountainMapFeatures([]));
    };
  }, [selectedMountain, status]);

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
    <div className="mountain-area-map relative isolate h-full min-w-0 overflow-hidden bg-moss-100 lg:h-[600px]">
      <div ref={container} style={{ position: "absolute", inset: 0 }} role="region" aria-label="Interactive map of Philippine climbing areas" aria-busy={status === "loading"} />
      {areaTooltip && <MapAreaTooltip key={areaTooltip.text} {...areaTooltip} />}
      <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <button type="button" onClick={() => { onClearSelection(); mapRef.current?.fitBounds(countryBounds, { ...cameraAnimation, padding: countryPadding, linear: true, bearing: 0, pitch: 0 }); }} className="pointer-events-auto min-h-11 rounded-xl border border-border bg-white/95 px-3 text-xs text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-moss-deep">Reset view ({relativeZoom > 0 ? "+" : ""}{relativeZoom})</button>
        {status === "ready" && zoom >= 6 && selectedArea !== "all" && <button type="button" onClick={() => zoomToRegion.current?.(selectedArea)} className="pointer-events-auto min-h-11 rounded-xl border border-border bg-white/95 px-3 text-xs text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-moss-deep">Zoom to region</button>}
      </div>
      {status === "loading" && <div role="progressbar" aria-label="Loading map" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5 overflow-hidden bg-moss/15">
        <div className="map-loading-bar h-full w-1/3 bg-moss" />
      </div>}
      {status === "error" && <div role="alert" className="absolute inset-x-4 top-20 z-10 rounded-xl bg-white/95 p-4 text-sm text-foreground shadow-sm">
        <p>The map couldn&apos;t load. You can still choose an area from the list.</p>
        <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className="mt-2 min-h-11 rounded px-2 text-moss-deep underline focus-visible:outline-moss-deep">Retry map</button>
      </div>}
    </div>
  );
}
