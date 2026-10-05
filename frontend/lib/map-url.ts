export type MapCamera = { center: [number, number]; zoom: number; bearing?: number; pitch?: number };

export function readMapCamera(url: URL): MapCamera | undefined {
  const values = ["lng", "lat", "zoom"].map((key) => url.searchParams.get(key));
  if (values.some((value) => value === null || value.trim() === "")) return;
  const [longitude, latitude, zoom] = values.map(Number);
  if (![longitude, latitude, zoom].every(Number.isFinite)) return;
  if (longitude < -180 || longitude > 180 || latitude < -85 || latitude > 85 || zoom < 3 || zoom > 12) return;
  const bearing = Number(url.searchParams.get("bearing") ?? 0);
  const pitch = Number(url.searchParams.get("pitch") ?? 0);
  if (!Number.isFinite(bearing) || bearing < -180 || bearing > 180 || !Number.isFinite(pitch) || pitch < 0 || pitch > 60) return;
  return { center: [longitude, latitude], zoom, bearing, pitch };
}

export function writeMapCamera(url: URL, camera: MapCamera): string {
  const updated = new URL(url);
  updated.searchParams.set("lng", camera.center[0].toFixed(6));
  updated.searchParams.set("lat", camera.center[1].toFixed(6));
  updated.searchParams.set("zoom", camera.zoom.toFixed(3));
  for (const key of ["bearing", "pitch"] as const) {
    if (camera[key]) updated.searchParams.set(key, camera[key].toFixed(3));
    else updated.searchParams.delete(key);
  }
  return `${updated.pathname}${updated.search}${updated.hash}`;
}
