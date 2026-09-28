import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: [string, number][] = [
    ["", 1],
    ["/shop", 0.9],
    ["/delivery", 0.8],
    ["/about", 0.6],
    ["/contact", 0.7],
  ];
  return pages.map(([path, priority]) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority,
  }));
}
