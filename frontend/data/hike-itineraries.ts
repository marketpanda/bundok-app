import { mountains, type Mountain, type MountainDifficulty, type Source } from "./mountains";

export type MountainReference = {
  slug: string;
  name: string;
  aliases?: string[];
  elevationMeters?: number;
};

export type MountainPoint = {
  slug: string;
  mountainSlug: string;
  name: string;
  kind: "peak" | "viewpoint" | "rock-formation" | "other";
  elevationMeters?: number;
  /** Individually mapped destination [longitude, latitude]. */
  coordinates?: [number, number];
  sources?: Source[];
};

export type HikeTarget =
  | { kind: "mountain"; mountainSlug: string }
  | { kind: "mountain-point"; mountainSlug: string; pointSlug: string };

export type HikeItinerary = {
  slug: string;
  name: string;
  aliases?: string[];
  category: "multi-mountain" | "multi-point" | "cross-country";
  hikeStyle: "linked-route" | "multi-hike-trip";
  targets: HikeTarget[];
  membershipStatus: "complete" | "partial" | "unverified";
  location: string;
  /** Approximate area marker [longitude, latitude], not a trailhead or route. */
  coordinates: [number, number];
  summary: string;
  image: string;
  difficulty?: MountainDifficulty;
  duration?: string;
  sources: Source[];
};

const additionalMountains: MountainReference[] = [
  { slug: "mount-balingkilat", name: "Mt. Balingkilat", elevationMeters: 1100 },
  { slug: "mount-mabanban", name: "Mt. Mabanban", elevationMeters: 1035 },
  { slug: "mount-bira-bira", name: "Mt. Bira-Bira", elevationMeters: 450 },
  { slug: "mount-naulaw", name: "Mt. Naulaw", elevationMeters: 530 },
  { slug: "mount-dayungan", name: "Mt. Dayungan", elevationMeters: 935 },
  { slug: "mount-cinco-picos", name: "Mt. Cinco Picos" },
  { slug: "mount-redondo", name: "Mt. Redondo", elevationMeters: 660 },
  { slug: "mount-lantik", name: "Mt. Lantik" },
  { slug: "mount-talamitam", name: "Mt. Talamitam" },
  { slug: "mount-apayang", name: "Mt. Apayang" },
  { slug: "mount-tenglawan", name: "Mt. Tenglawan" },
  { slug: "mount-kabunian", name: "Mt. Kabunian" },
  { slug: "mount-lobo", name: "Mt. Lobo", aliases: ["Mt. Lubo"] },
  { slug: "mount-pamitinan", name: "Mt. Pamitinan" },
  { slug: "mount-binacayan", name: "Mt. Binacayan", aliases: ["Mt. Binicayan"] },
  { slug: "mount-hapunang-banoi", name: "Mt. Hapunang Banoi" },
  { slug: "mount-parawagan", name: "Mt. Parawagan" },
  { slug: "mount-susong-dalaga", name: "Mt. Susong Dalaga" },
  { slug: "mount-balakbak", name: "Mt. Balakbak" },
  { slug: "mount-oro", name: "Mt. Oro" },
  { slug: "mount-sipit-ulang", name: "Mt. Sipit Ulang" },
  { slug: "mount-ayaas", name: "Mt. Ayaas" },
  { slug: "espadang-bato", name: "Espadang Bato" },
  { slug: "mount-kapananan", name: "Mt. Kapananan" },
  { slug: "mount-arayat", name: "Mt. Arayat" },
  { slug: "mount-tugew", name: "Mt. Tugew" },
  { slug: "mount-cabo", name: "Mt. Cabo" },
  { slug: "mount-kabuan", name: "Mt. Kabuan" },
  { slug: "mount-sadjatan", name: "Mt. Sadjatan", aliases: ["Mt. Kabuan II"] },
];

// Full profiles take precedence; membership always references one canonical slug.
export const itineraryMountains: MountainReference[] = [
  ...mountains,
  ...additionalMountains.filter((entry) => !mountains.some((mountain) => mountain.slug === entry.slug)),
];

export const mountainPoints: MountainPoint[] = [
  { slug: "tko", mountainSlug: "mount-arayat", name: "TKO", kind: "viewpoint", coordinates: [120.7489497, 15.2025543], sources: [{ label: "OpenStreetMap TKO Summit", url: "https://www.openstreetmap.org/node/5421817021" }] },
  { slug: "pinnacle", mountainSlug: "mount-arayat", name: "Pinnacle", kind: "rock-formation", coordinates: [120.746871, 15.1963942], sources: [{ label: "OpenStreetMap Pinnacle Peak", url: "https://www.openstreetmap.org/node/6512272489" }] },
  { slug: "south-peak", mountainSlug: "mount-arayat", name: "South Peak", kind: "peak", coordinates: [120.7434961, 15.1965737], sources: [{ label: "OpenStreetMap South Peak", url: "https://www.openstreetmap.org/node/319588221" }] },
  { slug: "north-peak", mountainSlug: "mount-arayat", name: "North Peak", kind: "peak", coordinates: [120.7427214, 15.2051885], sources: [{ label: "OpenStreetMap North Peak", url: "https://www.openstreetmap.org/node/332019471" }] },
];

const targets = (...slugs: string[]): HikeTarget[] => slugs.map((mountainSlug) => ({ kind: "mountain", mountainSlug }));
const cawag = ["mount-balingkilat", "mount-bira-bira", "mount-naulaw", "mount-dayungan", "mount-cinco-picos", "mount-redondo"];
const image = "/assets/hike_20260902_224742-1707.jpg";

export const hikeItineraries: HikeItinerary[] = [
  { slug: "cawag-hexa", name: "Cawag Hexa", aliases: ["Cawag Hexalogy"], category: "multi-mountain", hikeStyle: "linked-route", targets: targets(...cawag), membershipStatus: "complete", location: "Subic, Zambales", coordinates: [120.188, 14.893], summary: "Six named mountains linked by the open ridges of Cawag.", image, sources: [{ label: "Cawag Hexalogy", url: "https://transitpinas.com/the-infernal-peaks-of-zambales-cawag-hexalogy/" }] },
  { slug: "cawag-hepta", name: "Cawag Hepta", category: "multi-mountain", hikeStyle: "linked-route", targets: targets("mount-mabanban", ...cawag), membershipStatus: "complete", location: "Subic, Zambales", coordinates: [120.17, 14.91], summary: "A seven-mountain Cawag itinerary combining Mabanban with the Hexa mountains.", image, sources: [{ label: "Community-supplied Cawag Hepta itinerary", url: "https://www.instagram.com/p/DRjWSYJD7xY/" }] },
  { slug: "nasugbu-trilogy", name: "Nasugbu Trilogy", category: "multi-mountain", hikeStyle: "linked-route", targets: targets("mount-lantik", "mount-talamitam", "mount-apayang"), membershipStatus: "complete", location: "Nasugbu, Batangas", coordinates: [120.757, 14.098], summary: "Lantik, Talamitam and Apayang together in one grassland and ridgeline adventure.", image, sources: [{ label: "Nasugbu Trilogy", url: "https://cjfaderogao.blogspot.com/2024/12/nasugbu-trilogy-lantik-talamitam-apayang.html" }] },
  { slug: "bakun-trio", name: "Bakun Trio", category: "multi-mountain", hikeStyle: "multi-hike-trip", targets: targets("mount-tenglawan", "mount-kabunian", "mount-lobo"), membershipStatus: "complete", location: "Bakun, Benguet", coordinates: [120.663, 16.791], summary: "Three distinct mountain hikes in one trip, with Bakun as the base.", image, sources: [{ label: "Bakun Trio", url: "https://www.pinoymountaineer.com/2009/01/bakun-trio-mts-tenglawan-kabunian-and.html" }] },
  { slug: "montalban-undecology", name: "Montalban Undecology", aliases: ["Montalban Undeca"], category: "multi-mountain", hikeStyle: "linked-route", targets: targets("mount-pamitinan", "mount-binacayan", "mount-hapunang-banoi", "mount-parawagan", "mount-susong-dalaga", "mount-balakbak", "mount-oro", "mount-sipit-ulang", "mount-ayaas", "espadang-bato", "mount-kapananan"), membershipStatus: "complete", location: "Montalban, Rizal", coordinates: [121.19, 14.75], summary: "An eleven-destination hiking combination across Montalban's mountains and rock formations.", image, sources: [] },
  { slug: "kibungan-cross-country", name: "Kibungan Cross Country", aliases: ["KXC"], category: "cross-country", hikeStyle: "linked-route", targets: [], membershipStatus: "unverified", location: "Benguet / Ilocos Sur / La Union", coordinates: [120.655, 16.695], summary: "A cross-country traverse through three provinces, with terraces, mountain walls and the Crying Mountains.", image, sources: [{ label: "Kibungan Cross Country", url: "https://highlandreflections.com/2023/12/28/kibungan-cross-country-a-daunting-tri-provincial-traverse-benguet-to-ilocos-sur-to-la-union/" }] },
  { slug: "arayat-quad-peak", name: "Arayat Quad Peak", category: "multi-point", hikeStyle: "linked-route", targets: mountainPoints.map((point) => ({ kind: "mountain-point", mountainSlug: point.mountainSlug, pointSlug: point.slug })), membershipStatus: "complete", location: "Pampanga", coordinates: [120.743, 15.205], summary: "One mountain, four named destinations: TKO, Pinnacle, South Peak and North Peak.", image, sources: [{ label: "Arayat Quad Peaks", url: "https://theadventurousherbivore.wordpress.com/2018/03/27/mtarayat/" }] },
  { slug: "kayapa-quad-peak", name: "Kayapa Quad Peak", category: "multi-mountain", hikeStyle: "linked-route", targets: targets("mount-tugew", "mount-cabo", "mount-kabuan", "mount-sadjatan"), membershipStatus: "complete", location: "Kayapa, Nueva Vizcaya", coordinates: [120.887, 16.359], summary: "Tugew, Cabo, Kabuan and Sadjatan (Kabuan II), featuring grassy slopes and landmark rock formations.", image, sources: [] },
];

export function resolveHikeTarget(target: HikeTarget): MountainReference | MountainPoint {
  const entry = target.kind === "mountain"
    ? itineraryMountains.find((mountain) => mountain.slug === target.mountainSlug)
    : mountainPoints.find((point) => point.mountainSlug === target.mountainSlug && point.slug === target.pointSlug);
  if (!entry) throw new Error(`Unresolved itinerary target: ${JSON.stringify(target)}`);
  return entry;
}

export type HikeItinerarySummaryDto = Pick<HikeItinerary, "slug" | "name" | "image" | "location">;
export type MountainDetailDto = Mountain & { hikeItineraries: HikeItinerarySummaryDto[] };
export type HikeItineraryDetailDto = HikeItinerary & { members: (MountainReference | MountainPoint)[] };

export function getMountainItineraries(mountainSlug: string): HikeItinerary[] {
  return hikeItineraries.filter((itinerary) => itinerary.targets.some((target) => target.mountainSlug === mountainSlug));
}

export function getHikeItineraryDetail(slug: string): HikeItineraryDetailDto | undefined {
  const itinerary = hikeItineraries.find((entry) => entry.slug === slug);
  return itinerary && { ...itinerary, members: itinerary.targets.map(resolveHikeTarget) };
}
