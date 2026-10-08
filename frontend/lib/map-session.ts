import { readMapCamera, writeMapCamera, type MapCamera } from "./map-url";

const CAMERA_KEY = "ambangeg:map-camera:v1";
let lastCamera: MapCamera | undefined;

export function readRememberedMapCamera(): MapCamera | undefined {
  if (lastCamera) return lastCamera;
  try {
    const saved = window.sessionStorage.getItem(CAMERA_KEY);
    if (saved) lastCamera = readMapCamera(new URL(saved, window.location.origin));
  } catch { /* Browsing can continue when session storage is unavailable. */ }
  return lastCamera;
}

export function rememberMapCamera(camera: MapCamera): void {
  lastCamera = camera;
  try {
    window.sessionStorage.setItem(CAMERA_KEY, writeMapCamera(new URL(window.location.href), camera));
  } catch { /* In-memory restoration still works when storage is blocked. */ }
}
