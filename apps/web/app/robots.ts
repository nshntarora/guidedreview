import type { MetadataRoute } from "next";
import { SITE_URL } from "@web/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      other: {
        "Content-Signal": "ai-train=no, search=yes, ai-input=yes",
      },
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
