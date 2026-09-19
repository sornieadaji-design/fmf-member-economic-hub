import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Public URLs only — member and admin areas are gated and not indexed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE.url}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
