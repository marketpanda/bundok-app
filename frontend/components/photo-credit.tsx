import type { MountainPhoto } from "@/data/mountain-photos";

export function PhotoCredit({ photo, caption = false }: { photo: MountainPhoto; caption?: boolean }) {
  return <div className="text-[11px] leading-5 text-zinc-400">
    {caption && <p className="mb-1 text-xs text-zinc-300">{photo.caption}</p>}
    Photo: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded hover:text-turquoise hover:underline focus-visible:outline-2 focus-visible:outline-turquoise">{photo.author}</a>
    {" · "}<a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="rounded hover:text-turquoise hover:underline focus-visible:outline-2 focus-visible:outline-turquoise">{photo.license}</a>
    {" · Wikimedia Commons · Cropped to fit"}
  </div>;
}
