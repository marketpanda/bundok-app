export type MountainDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Trail = {
  name: string;
  difficulty?: MountainDifficulty;
  duration?: string;
  note?: string;
};

export type Source = {
  label: string;
  url: string;
};

export type Mountain = {
  slug: string;
  name: string;
  location: string;
  elevationMeters: number;
  difficulty: MountainDifficulty;
  duration: string;
  summary: string;
  description: string;
  trails?: Trail[];
  highlights: string[];
  bestSeason: string;
  requirements: string[];
  safetyNotes: string[];
  advisory?: string;
  lastVerified: string;
  sources: Source[];
  image: string;
};

const draftProfileFields: Pick<
  Mountain,
  | "duration"
  | "description"
  | "highlights"
  | "bestSeason"
  | "requirements"
  | "safetyNotes"
  | "lastVerified"
  | "sources"
> = {
  duration: "Varies by trail",
  description: "Full mountain profile content is pending editorial review.",
  highlights: [],
  bestSeason: "Pending verification",
  requirements: [],
  safetyNotes: [],
  lastVerified: "Pending editorial verification",
  sources: [],
};

export const mountains: Mountain[] = [
  {
    slug: "mount-pulag",
    name: "Mt. Pulag",
    location: "Benguet",
    elevationMeters: 2926,
    difficulty: 3,
    ...draftProfileFields,
    summary: "A celebrated Cordillera climb known for highland grasslands and sunrise views.",
    image: "/assets/hike_20260902_224742-1707.jpg",
    trails: [
      { name: "Ambangeg", difficulty: 3, note: "The most approachable and popular route." },
      { name: "Akiki", difficulty: 6, note: "A steeper, more demanding ascent." },
      { name: "Tawangan", difficulty: 7, note: "A longer route through mossy forest." },
    ],
  },
  {
    slug: "mount-apo",
    name: "Mt. Apo",
    location: "Davao del Sur and Cotabato",
    elevationMeters: 2954,
    difficulty: 7,
    ...draftProfileFields,
    summary: "The Philippines’ highest peak, with forest, boulder fields, and volcanic terrain.",
    image: "/assets/sibuyan_0f35c182-dda7-4c56-a413-dd37c1cf72bf.jpg",
    trails: [
      { name: "Kapatagan", difficulty: 6 },
      { name: "Kidapawan", difficulty: 7 },
    ],
  },
  {
    slug: "mount-pinatubo",
    name: "Mt. Pinatubo",
    location: "Central Luzon",
    elevationMeters: 1486,
    difficulty: 2,
    ...draftProfileFields,
    summary: "A broad volcanic landscape leading to an iconic crater-lake viewpoint.",
    image: "/assets/hike_20260902_172653-1190.jpg",
    trails: [
      { name: "Capas route", difficulty: 2 },
      { name: "Botolan route", difficulty: 4 },
    ],
  },
  {
    slug: "mount-daraitan",
    name: "Mt. Daraitan",
    location: "Rizal",
    elevationMeters: 739,
    difficulty: 5,
    ...draftProfileFields,
    summary: "A limestone summit climb often paired with the river and Tinipak formations.",
    image: "/assets/sibuyan_PXL_20260829_051147406.jpg",
    trails: [
      { name: "Daraitan trail", difficulty: 5 },
      { name: "Tinipak traverse", difficulty: 5 },
    ],
  },
  {
    slug: "mount-batulao",
    name: "Mt. Batulao",
    location: "Batangas",
    elevationMeters: 811,
    difficulty: 3,
    ...draftProfileFields,
    summary: "Rolling ridgelines and open slopes make this a popular introduction to hiking.",
    image: "/assets/hike_20260902_224742-1707.jpg",
    trails: [
      { name: "Old trail", difficulty: 3 },
      { name: "New trail", difficulty: 3 },
    ],
  },
  {
    slug: "mount-guiting-guiting",
    name: "Mt. Guiting-Guiting",
    location: "Romblon",
    elevationMeters: 2058,
    difficulty: 9,
    ...draftProfileFields,
    summary: "A highly technical Sibuyan climb defined by exposed ridges and rugged rock formations.",
    image: "/assets/sibuyan_0f35c182-dda7-4c56-a413-dd37c1cf72bf.jpg",
    trails: [
      { name: "Tampayan trail", difficulty: 9 },
      { name: "Olango trail", difficulty: 9 },
    ],
  },
];
