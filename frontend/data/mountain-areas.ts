// Climbing areas for the directory, not administrative boundaries.
// Coordinates locate climbing areas, not trailheads or exact summits.
export const mountainAreas = [
  { id: "cordillera", name: "Cordillera", detail: "Benguet highlands", coordinates: [120.8, 16.7], mountainSlugs: ["mount-pulag"] },
  { id: "central-luzon", name: "Central Luzon", detail: "Zambales volcanic range", coordinates: [120.35, 15.3], mountainSlugs: ["mount-pinatubo"] },
  { id: "calabarzon", name: "CALABARZON", detail: "Rizal & Batangas", coordinates: [121.3, 14.2], mountainSlugs: ["mount-daraitan", "mount-batulao"] },
  { id: "romblon", name: "Romblon", detail: "Sibuyan Island", coordinates: [122.55, 12.4], mountainSlugs: ["mount-guiting-guiting"] },
  { id: "apo", name: "Davao & Cotabato", detail: "Mt. Apo highlands", coordinates: [125.3, 7], mountainSlugs: ["mount-apo"] },
  { id: "ilocos", name: "Ilocos", detail: "Northern Luzon", coordinates: [120.95, 18.1], mountainSlugs: [] },
  { id: "bicol", name: "Bicol", detail: "Southeastern Luzon", coordinates: [123.6, 13.3], mountainSlugs: [] },
  { id: "mindoro", name: "Mindoro", detail: "Mindoro mountain ranges", coordinates: [121.05, 13], mountainSlugs: [] },
  { id: "marinduque", name: "Marinduque", detail: "Southern Marinduque", coordinates: [122.02, 13.24], mountainSlugs: [] },
  { id: "palawan", name: "Palawan", detail: "Southern Palawan", coordinates: [117.99, 8.81], mountainSlugs: [] },
  { id: "panay", name: "Panay", detail: "Antique & Aklan", coordinates: [122.2, 11.3], mountainSlugs: [] },
  { id: "negros", name: "Negros", detail: "Negros mountain ranges", coordinates: [123.15, 10.3], mountainSlugs: [] },
  { id: "cebu", name: "Cebu", detail: "Southern Cebu", coordinates: [123.44, 9.82], mountainSlugs: [] },
  { id: "leyte", name: "Leyte", detail: "Leyte highlands", coordinates: [124.74, 11.11], mountainSlugs: [] },
  { id: "camiguin", name: "Camiguin", detail: "Camiguin volcanoes", coordinates: [124.69, 9.19], mountainSlugs: [] },
  { id: "bukidnon", name: "Bukidnon", detail: "Central Mindanao highlands", coordinates: [124.9, 8.05], mountainSlugs: [] },
  { id: "south-cotabato", name: "South Cotabato", detail: "Southern Mindanao", coordinates: [125, 6.25], mountainSlugs: [] },
  { id: "cagayan-valley", name: "Cagayan Valley", detail: "Batanes, Cagayan, Isabela & Quirino", coordinates: [121.7, 17.3], mountainSlugs: [] },
  { id: "central-visayas", name: "Bohol & Siquijor", detail: "Central Visayas peaks", coordinates: [124.1, 9.8], mountainSlugs: [] },
  { id: "eastern-visayas", name: "Samar & Biliran", detail: "Eastern Visayas peaks", coordinates: [124.9, 11.8], mountainSlugs: [] },
  { id: "northern-mindanao", name: "Northern Mindanao", detail: "Misamis & Lanao del Norte", coordinates: [124.4, 8.3], mountainSlugs: [] },
  { id: "caraga", name: "Caraga", detail: "Agusan, Surigao & Dinagat", coordinates: [125.8, 8.9], mountainSlugs: [] },
  { id: "zamboanga", name: "Zamboanga Peninsula", detail: "Western Mindanao", coordinates: [122.7, 7.8], mountainSlugs: [] },
  { id: "barmm", name: "Bangsamoro", detail: "Lanao del Sur, Maguindanao & island provinces", coordinates: [124.3, 7.2], mountainSlugs: [] },
] as const;

export type MountainAreaId = (typeof mountainAreas)[number]["id"];

// Match the catalogue's province labels, keeping map and directory grouping identical.
export function getMountainArea(mountain: { location: string }): MountainAreaId | undefined {
  const location = mountain.location;
  if (/South Cotabato|Sarangani|Sultan Kudarat/.test(location)) return "south-cotabato";
  if (/Davao|Cotabato/.test(location)) return "apo";
  if (/Benguet|Ifugao|Nueva Vizcaya|Mountain Province|Abra|Apayao|Kalinga/.test(location)) return "cordillera";
  if (/Central Luzon|Zambales|Tarlac|Pampanga|Bataan|Bulacan|Nueva Ecija|Aurora/.test(location)) return "central-luzon";
  if (/Rizal|Batangas|Laguna|Quezon|Cavite/.test(location)) return "calabarzon";
  if (/Romblon/.test(location)) return "romblon";
  if (/Ilocos|La Union|Pangasinan/.test(location)) return "ilocos";
  if (/Cagayan|Isabela|Quirino|Batanes/.test(location)) return "cagayan-valley";
  if (/Albay|Camarines|Sorsogon|Masbate|Catanduanes/.test(location)) return "bicol";
  if (/Mindoro/.test(location)) return "mindoro";
  if (/Marinduque/.test(location)) return "marinduque";
  if (/Palawan/.test(location)) return "palawan";
  if (/Antique|Aklan|Iloilo|Capiz|Guimaras/.test(location)) return "panay";
  if (/Negros/.test(location)) return "negros";
  if (/Cebu/.test(location)) return "cebu";
  if (/Leyte/.test(location)) return "leyte";
  if (/Camiguin/.test(location)) return "camiguin";
  if (/Bukidnon/.test(location)) return "bukidnon";
  if (/Bohol|Siquijor/.test(location)) return "central-visayas";
  if (/Samar|Biliran/.test(location)) return "eastern-visayas";
  if (/Misamis|Lanao del Norte/.test(location)) return "northern-mindanao";
  if (/Agusan|Surigao|Dinagat/.test(location)) return "caraga";
  if (/Zamboanga/.test(location)) return "zamboanga";
  if (/Lanao del Sur|Maguindanao|Basilan|Sulu|Tawi-Tawi|Muslim Mindanao|Bangsamoro/.test(location)) return "barmm";
}
