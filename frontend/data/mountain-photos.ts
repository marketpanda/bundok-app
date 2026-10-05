import catalogue from "./mountain-photos.json";

export type MountainPhoto = {
  src: string;
  alt: string;
  caption: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  originalUrl: string;
  downloadUrl: string;
  changes: string;
  retrievedOn: string;
};

export const mountainPhotos: Record<string, MountainPhoto> = catalogue;
const photoKeys: Record<string, string> = {
  "mount-ulap": "ulap-gungal",
  "mount-pulag": "pulag", "mount-apo": "apo", "mount-pinatubo": "pinatubo",
  "mount-daraitan": "daraitan", "mount-batulao": "batulao", "mount-guiting-guiting": "guiting-guiting",
  "cawag-hexa": "zambales-view", "cawag-hepta": "zambales-view", "nasugbu-trilogy": "talamitam",
  "bakun-trio": "kabunian", "montalban-undecology": "pamitinan", "kibungan-cross-country": "kibungan",
  "arayat-quad-peak": "arayat", "kayapa-quad-peak": "kayapa",
};
export function getMountainPhoto(slug: string): MountainPhoto | undefined {
  return mountainPhotos[photoKeys[slug]];
}
export const guideDetailPhotos: Record<string, MountainPhoto> = {
  "mount-pulag": mountainPhotos["pulag-trail"],
  "mount-apo": mountainPhotos["apo-terrain"],
  "mount-guiting-guiting": mountainPhotos["guiting-view"],
};
