import type { MetadataRoute } from "next";

// robots.txt — Layer 2 방어 (권고 수준, 양심적 봇만 따름)
// 검색·SNS 봇은 명시 white-list, AI 학습/SEO scraper는 명시 black-list
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // === 검색엔진 봇 — 전체 허용 (SEO 핵심) ===
      { userAgent: "Googlebot", allow: "/", disallow: ["/api/"] },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "Googlebot-Mobile", allow: "/" },
      { userAgent: "Bingbot", allow: "/", disallow: ["/api/"] },
      { userAgent: "Yeti", allow: "/", disallow: ["/api/"] },             // Naver (★ 한국 retail 필수)
      { userAgent: "NaverBot", allow: "/", disallow: ["/api/"] },
      { userAgent: "Daum", allow: "/", disallow: ["/api/"] },
      { userAgent: "Daumoa", allow: "/", disallow: ["/api/"] },
      { userAgent: "DuckDuckBot", allow: "/", disallow: ["/api/"] },
      { userAgent: "Slurp", allow: "/", disallow: ["/api/"] },            // Yahoo
      { userAgent: "Applebot", allow: "/", disallow: ["/api/"] },

      // === 광고 / SNS 미리보기 봇 — 허용 (viral · monetization 핵심) ===
      { userAgent: "AdsBot-Google", allow: "/" },
      { userAgent: "Mediapartners-Google", allow: "/" },                  // AdSense 검수 (★ D90 필수)
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "Facebot", allow: "/" },
      { userAgent: "Twitterbot", allow: "/" },
      { userAgent: "LinkedInBot", allow: "/" },
      { userAgent: "Kakaotalk-scrap", allow: "/" },                       // 카톡 미리보기 (★ viral 핵심)
      { userAgent: "Discordbot", allow: "/" },
      { userAgent: "Slackbot", allow: "/" },
      { userAgent: "WhatsApp", allow: "/" },
      { userAgent: "TelegramBot", allow: "/" },

      // === AI 검색·실시간 열람 봇 — 허용 (2026-10-19 대표님 결정: 인용 유입은 받고 학습용 수집은 계속 차단) ===
      // 사용자가 ChatGPT·Perplexity·Claude에서 질문할 때 페이지를 읽고 출처로 링크하는 봇. 학습 데이터 수집용 아님.
      { userAgent: "OAI-SearchBot", allow: "/", disallow: ["/api/"] },    // ChatGPT 검색
      { userAgent: "ChatGPT-User", allow: "/", disallow: ["/api/"] },     // ChatGPT 사용자 요청 열람
      { userAgent: "PerplexityBot", allow: "/", disallow: ["/api/"] },    // Perplexity 검색 색인
      { userAgent: "Perplexity-User", allow: "/", disallow: ["/api/"] },  // Perplexity 사용자 요청 열람
      { userAgent: "Claude-SearchBot", allow: "/", disallow: ["/api/"] }, // Claude 검색
      { userAgent: "Claude-User", allow: "/", disallow: ["/api/"] },      // Claude 사용자 요청 열람

      // === AI 학습 봇 — 전체 차단 ===
      { userAgent: "GPTBot", disallow: "/" },                             // OpenAI
      { userAgent: "ClaudeBot", disallow: "/" },                          // Anthropic
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },                    // Bard/Gemini 학습
      { userAgent: "CCBot", disallow: "/" },                              // Common Crawl (대형 AI 학습 원천)
      { userAgent: "Bytespider", disallow: "/" },                         // ByteDance / TikTok
      { userAgent: "Amazonbot", disallow: "/" },                          // Alexa AI
      { userAgent: "FacebookBot", disallow: "/" },                        // Meta AI
      { userAgent: "Meta-ExternalAgent", disallow: "/" },
      { userAgent: "Diffbot", disallow: "/" },
      { userAgent: "ImagesiftBot", disallow: "/" },
      { userAgent: "Omgilibot", disallow: "/" },
      { userAgent: "YouBot", disallow: "/" },
      { userAgent: "cohere-ai", disallow: "/" },
      { userAgent: "Timpibot", disallow: "/" },

      // === SEO / 마케팅 scraper — 차단 ===
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DataForSeoBot", disallow: "/" },
      { userAgent: "BLEXBot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
      { userAgent: "PetalBot", disallow: "/" },
      { userAgent: "SeznamBot", disallow: "/" },
      { userAgent: "MegaIndex", disallow: "/" },
      { userAgent: "serpstatbot", disallow: "/" },

      // === default — 그 외 봇 허용 (위 명시 black-list 외) ===
      // 명시 안 한 봇은 정상 봇 가정. middleware가 UA 패턴 검사로 추가 차단.
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
    ],
    sitemap: "https://kr-stocks.com/sitemap.xml",
    host: "https://kr-stocks.com",
  };
}
