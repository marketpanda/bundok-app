import type { MetadataRoute } from "next";

import { mountainGuides } from "@/data/mountain-guides";

export const dynamic = "force-static";

const siteUrl = "https://ambangeg.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Account pages and catalogue entries without published guides are omitted.
  const publicPaths = [
    "/",
    "/mountains/",
    "/about-us/",
    "/contact-us/",
    "/privacy/",
    "/terms/",
  ];

  return [
    ...publicPaths.map((path) => ({ url: `${siteUrl}${path}` })),
    ...mountainGuides.map(({ slug }) => ({
      url: `${siteUrl}/mountains/${slug}/`,
    })),
  ];
}
