// Climbing areas for the directory, not administrative boundaries.
// Coordinates locate climbing areas, not trailheads or exact summits.
export const mountainAreas = [
  { id: "cordillera", name: "Cordillera", detail: "Benguet highlands", coordinates: [120.8, 16.7], mountainSlugs: ["mount-pulag"] },
  { id: "central-luzon", name: "Central Luzon", detail: "Zambales volcanic range", coordinates: [120.35, 15.3], mountainSlugs: ["mount-pinatubo"] },
  { id: "calabarzon", name: "CALABARZON", detail: "Rizal & Batangas", coordinates: [121.3, 14.2], mountainSlugs: ["mount-daraitan", "mount-batulao"] },
  { id: "romblon", name: "Romblon", detail: "Sibuyan Island", coordinates: [122.55, 12.4], mountainSlugs: ["mount-guiting-guiting"] },
  { id: "apo", name: "Davao & Cotabato", detail: "Mt. Apo highlands", coordinates: [125.3, 7], mountainSlugs: ["mount-apo"] },
] as const;

export type MountainAreaId = (typeof mountainAreas)[number]["id"];
