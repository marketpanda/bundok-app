import { itineraryMountains, mountainPoints, type HikeItinerary } from "../data/hike-itineraries";
import { mapMountains, type MapMountain } from "../data/map-mountains";
import { normalizeDestinationSearch } from "../data/destination-search";
import { getMountainArea, mountainAreaColors } from "../data/mountain-areas";
import { mountainMapFeatures } from "../data/mountain-map-layers";

/** Match mapped children in list order, resolving alternate names within their region. */
export function getItineraryMapMountains(itinerary: HikeItinerary): (MapMountain & { groupOrder: number })[] {
  const area = getMountainArea(itinerary);
  const candidates = mapMountains.filter((entry) => !area || getMountainArea(entry) === area);
  return itinerary.targets.flatMap((target, index) => {
    if (target.kind === "mountain-point") {
      const point = mountainPoints.find(entry => entry.mountainSlug === target.mountainSlug && entry.slug === target.pointSlug);
      if (!point?.coordinates || !point.sources?.length) return [];
      return [{ slug: `${point.mountainSlug}:${point.slug}`, name: point.name, location: itinerary.location,
        coordinates: point.coordinates, aliases: [], sources: point.sources, groupOrder: index + 1 }];
    }
    let mountain = candidates.find((entry) => entry.slug === target.mountainSlug);
    if (!mountain) {
      const member = itineraryMountains.find((entry) => entry.slug === target.mountainSlug);
      if (!member) return [];
      const names = [member.name, ...(member.aliases ?? [])].map(normalizeDestinationSearch);
      const matches = candidates.filter((entry) => [entry.name, ...entry.aliases]
        .some((name) => names.includes(normalizeDestinationSearch(name))));
      if (matches.length === 1) mountain = matches[0];
    }
    return mountain ? [{ ...mountain, groupOrder: index + 1 }] : [];
  });
}

/** Every group has a visible animation target, even when child locations are unavailable. */
export function getItineraryHighlightFeatures(itinerary: HikeItinerary): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const members = getItineraryMapMountains(itinerary);
  if (members.length) {
    const features = mountainMapFeatures(members);
    features.features.forEach((feature, index) => { feature.properties = { ...feature.properties, order: members[index].groupOrder }; });
    return features;
  }
  const area = getMountainArea(itinerary);
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: itinerary.coordinates },
      properties: { slug: itinerary.slug, name: itinerary.name, color: area ? mountainAreaColors[area] : "#64748b", itinerary: true },
    }],
  };
}

export type MountainGroupHighlight = { pulses: { slug: string; radius: number }[]; flashWhite: boolean };

/** Start 200 ms pulses 100 ms apart, then flash all dots white after a 500 ms pause. */
export function playMountainHighlightSequence(slugs: string[], highlight: (state: MountainGroupHighlight) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const normal: MountainGroupHighlight = { pulses: [], flashWhite: false };
  const pulse = () => {
    if (cancelled || !slugs.length) return;
    const startedAt = Date.now();
    const duration = (slugs.length - 1) * 100 + 200;
    const frame = () => {
      if (cancelled) return;
      const elapsed = Math.min(duration, Date.now() - startedAt);
      if (elapsed < duration) {
        const pulses = slugs.flatMap((slug, index) => {
          const progress = (elapsed - index * 100) / 200;
          if (progress < 0 || progress >= 1) return [];
          // Independent easing lets the next dot grow while its predecessor shrinks.
          return [{ slug, radius: 7 + 5 * Math.sin(Math.PI * progress) ** 2 }];
        });
        highlight({ pulses, flashWhite: false });
        // Include exact stagger boundaries as well as intermediate smooth frames.
        timer = setTimeout(frame, Math.min(16, duration - elapsed, 100 - elapsed % 100));
      } else {
        highlight(normal);
        timer = setTimeout(() => {
          if (cancelled) return;
          highlight({ ...normal, flashWhite: true });
          timer = setTimeout(() => {
            if (cancelled) return;
            highlight(normal);
            timer = setTimeout(pulse, 500);
          }, 150);
        }, 500);
      }
    };
    frame();
  };
  pulse();
  return () => {
    cancelled = true;
    clearTimeout(timer);
    highlight(normal);
  };
}
