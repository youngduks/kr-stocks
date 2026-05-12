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

  const guides: MetadataRoute.Sitemap = [
    {
      url: `${base}/guide/hyperliquid-onramp`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${base}/consensus`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.92, // 한국 retail mainstream 키워드 (목표주가) — 高 priority
    },
  ];

  // 영어 페이지 — 홈 + 가이드 + 컨센서스
  const enPages: MetadataRoute.Sitemap = [
    {
      url: `${base}/en`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${base}/en/guide/hyperliquid-onramp`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/en/consensus`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  return [home, ...symbolPages, ...guides, ...enPages];
}
