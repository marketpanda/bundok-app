export const MAX_CLIMB_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_STORED_PHOTO_LENGTH = 240_000;

export function isClimbPhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_STORED_PHOTO_LENGTH && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

// Keep journal photos small enough to share the browser's storage with other climbs.
export async function prepareClimbPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP photo.");
  }
  if (file.size > MAX_CLIMB_PHOTO_BYTES) throw new Error("Choose a photo smaller than 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable. Try another browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.45, 0.3]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      if (isClimbPhoto(photo)) return photo;
    }
    throw new Error("This photo is too detailed to save. Try a smaller image.");
  } catch (error) {
    if (error instanceof DOMException) throw new Error("This photo could not be opened. Try another JPG, PNG or WebP image.");
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
