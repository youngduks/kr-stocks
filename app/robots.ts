import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Yeti", allow: "/" }, // Naver crawler
    ],
    sitemap: "https://kr-stocks.com/sitemap.xml",
    host: "https://kr-stocks.com",
  };
}
