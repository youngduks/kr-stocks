import { NextRequest, NextResponse } from "next/server";

// Layer 3 방어 — Next.js middleware로 자동화 도구 UA 직접 403 차단
// robots.txt(권고)는 양심적 봇만 따르므로 강제 차단 필수

// 검색·SNS 봇 — 무조건 통과 (BLOCKED 패턴에 잡혀도 ALLOWED 우선)
const ALLOWED_UA = [
  /Googlebot/i,
  /Bingbot/i,
  /Yeti/i,                          // Naver (★ 한국 검색 핵심)
  /NaverBot/i,
  /Daumoa/i,
  /Daum\//i,
  /DuckDuckBot/i,
  /Slurp/i,                         // Yahoo
  /Applebot/i,
  /AdsBot-Google/i,
  /Mediapartners-Google/i,          // AdSense 검수
  /facebookexternalhit/i,
  /Facebot/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Kakaotalk-scrap/i,               // 카톡 미리보기 (★ viral)
  /Discordbot/i,
  /Slackbot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Vercel/i,                        // Vercel 자체 헬스체크
];

// 알려진 AI 학습 봇 — 차단
const BLOCKED_AI_UA = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,
  /ClaudeBot/i,
  /anthropic-ai/i,
  /Claude-Web/i,
  /Google-Extended/i,
  /PerplexityBot/i,
  /Perplexity-User/i,
  /CCBot/i,
  /Bytespider/i,
  /Amazonbot/i,
  /FacebookBot/i,
  /Meta-ExternalAgent/i,
  /Diffbot/i,
  /ImagesiftBot/i,
  /Omgilibot/i,
  /YouBot/i,
  /cohere-ai/i,
  /Timpibot/i,
];

// 알려진 SEO scraper — 차단
const BLOCKED_SEO_UA = [
  /AhrefsBot/i,
  /SemrushBot/i,
  /MJ12bot/i,
  /DataForSeoBot/i,
  /BLEXBot/i,
  /DotBot/i,
  /PetalBot/i,
  /SeznamBot/i,
  /MegaIndex/i,
  /serpstatbot/i,
];

// 일반 자동화 HTTP client — 차단
const BLOCKED_AUTOMATION_UA = [
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /\bcurl\//i,
  /\bwget\b/i,
  /PhantomJS/i,
  /Selenium/i,
  /\bnode-fetch\b/i,
  /axios\//i,
  /Java\/[0-9]/i,
  /Go-http-client/i,
  /libwww-perl/i,
  /httpie/i,
  /\bokhttp\b/i,
  /Apache-HttpClient/i,
  /Ruby$/i,
  /WordPress/i,
];

const FORBIDDEN_HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>403 Forbidden</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}main{text-align:center;max-width:480px;padding:24px}h1{font-size:48px;margin:0 0 8px;color:#fff}p{color:#888;line-height:1.6}</style>
</head><body><main>
<h1>403</h1>
<p>Automated access blocked. If you are a human and seeing this in error, please use a standard web browser.</p>
<p style="font-size:11px;margin-top:24px;opacity:.4">kr-stocks.com</p>
</main></body></html>`;

function block(reason: string) {
  return new NextResponse(FORBIDDEN_HTML, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Block-Reason": reason,
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const path = req.nextUrl.pathname;

  // 정적 자산 / API / SEO 메타 통과 (성능 + sitemap/robots 자체는 봇이 접근 OK)
  if (
    path.startsWith("/_next/") ||
    path.startsWith("/api/") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.startsWith("/opengraph-image") ||
    path.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  // 1) white-list 봇 — 무조건 통과 (Googlebot, Yeti, 카톡 etc)
  if (ALLOWED_UA.some((p) => p.test(ua))) {
    return NextResponse.next();
  }

  // 2) UA 없음 또는 너무 짧음 → 차단
  if (!ua || ua.length < 8) {
    return block("empty-ua");
  }

  // 3) AI 학습 봇 차단
  if (BLOCKED_AI_UA.some((p) => p.test(ua))) {
    return block("ai-bot");
  }

  // 4) SEO scraper 차단
  if (BLOCKED_SEO_UA.some((p) => p.test(ua))) {
    return block("seo-scraper");
  }

  // 5) 자동화 HTTP client 차단 (curl, python-requests 등)
  if (BLOCKED_AUTOMATION_UA.some((p) => p.test(ua))) {
    return block("automation");
  }

  return NextResponse.next();
}

// _next/static, _next/image, favicon, og/icon 라우트는 matcher에서 제외
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|opengraph-image|icon).*)",
  ],
};
