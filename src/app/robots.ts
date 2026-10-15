import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/event";

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/book/confirmation/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
