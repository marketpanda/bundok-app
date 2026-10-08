import type { MountainPhoto } from "@/data/mountain-photos";

export function PhotoCredit({ photo, caption = false, light = true }: { photo: MountainPhoto; caption?: boolean; light?: boolean }) {
  return <div className={"text-[11px] leading-5 " + (light ? "text-muted-foreground" : "text-muted-foreground")}>
    {caption && <p className={"mb-1 text-xs " + (light ? "text-muted-foreground" : "text-zinc-300")}>{photo.caption}</p>}
    Photo: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded hover:text-moss-deep hover:underline focus-visible:outline-2 focus-visible:outline-moss-deep">{photo.author}</a>
    {" · "}<a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="rounded hover:text-moss-deep hover:underline focus-visible:outline-2 focus-visible:outline-moss-deep">{photo.license}</a>
    {" · Wikimedia Commons · Cropped to fit"}
  </div>;
}
