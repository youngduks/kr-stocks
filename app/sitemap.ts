import type { MetadataRoute } from "next";
import { SYMBOLS } from "@/lib/universe";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kr-stocks.com";
  const now = new Date();

  const home: MetadataRoute.Sitemap[number] = {
    url: base,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 1.0,
  };

  const symbolPages: MetadataRoute.Sitemap = SYMBOLS.map((s) => ({
    url: `${base}/${s.category}/${s.slug}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: s.is_private
      ? 0.95 // 비상장 — 트래픽 핵심
      : s.category === "korea"
      ? 0.9
      : s.category === "us"
      ? 0.75
      : 0.5,
  }));

  return [home, ...symbolPages];
}
