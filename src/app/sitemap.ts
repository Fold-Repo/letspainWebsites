import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/event";
import { listPublishedEvents } from "@/lib/events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteUrl();
  const staticPaths = ["", "/about", "/book", "/contact", "/events", "/partnerships", "/privacy"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/book" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/book" || path === "/events" ? 0.9 : 0.6,
  }));

  try {
    const events = await listPublishedEvents();
    for (const hangout of events) {
      entries.push({
        url: `${base}/events/${hangout.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Sitemap still returns public pages if the database is briefly unavailable.
  }

  return entries;
}
