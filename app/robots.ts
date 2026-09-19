import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Only the public landing page is indexable; member/admin/API routes are disallowed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/dashboard",
        "/contributions",
        "/loans",
        "/investments",
        "/welfare",
        "/notices",
        "/onboarding",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
