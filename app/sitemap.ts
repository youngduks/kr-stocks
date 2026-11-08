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
      url: `${base}/korea/kospi-night`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9, // "코스피 야간선물"(네이버 월 18.8만) — EWY 24h 대용 지표 (2026-11-08)
    },
    // 해설 가이드 (2026-11-08, 네이버 월간 검색량 기준 선정)
    { url: `${base}/guide/vix-index`, lastModified: now, changeFrequency: "monthly", priority: 0.85 }, // VIX지수 62,610
    { url: `${base}/guide/kospi-night-futures-hours`, lastModified: now, changeFrequency: "monthly", priority: 0.85 }, // 코스피200야간선물 50,340
    { url: `${base}/guide/fear-greed-index`, lastModified: now, changeFrequency: "monthly", priority: 0.8 }, // CNN공포탐욕지수 16,530
    { url: `${base}/guide/liquidation-map`, lastModified: now, changeFrequency: "monthly", priority: 0.75 }, // 청산맵 3,320
    {
      url: `${base}/guide/hyperliquid-onramp`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${base}/guide/binance-korea-stocks`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88, // "바이낸스 삼성전자 선물" — 신규 상장 키워드, 한국 retail
    },
    {
      url: `${base}/guide/korean-overnight-prices`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88, // "삼성전자 야간" / "한국주식 24시간" — 한국 retail mainstream
    },
    {
      url: `${base}/guide/nxt-after-hours`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82, // "NXT 시간외" 키워드
    },
    {
      url: `${base}/consensus`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.92, // 한국 retail mainstream 키워드 (목표주가) — 高 priority
    },
    {
      url: `${base}/liquidation`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8, // "청산맵" — 토큰화 주식 트레이더 키워드
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4, // 데이터 원칙·이용법 — 신뢰 신호 페이지
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/shopping`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7, // "쿠팡 핫딜" — 트래픽 유입용 신규 카테고리
    },
    {
      url: `${base}/pick`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6, // 줍줍파파 숙소 PICK — 인스타 프로필 링크 랜딩
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
      url: `${base}/en/guide/binance-korea-stocks`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82,
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
