/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  async headers() {
    return [
      {
        // 자체 호스팅 폰트 청크 — 파일명에 콘텐츠 해시 포함 → 1년 immutable
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // 보이스노트 — 주식 사이트와 무관한 도구라 검색 노출에서 뺀다.
        source: "/voicenote/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async rewrites() {
    // public/voicenote/index.html(단일 파일 앱)을 /voicenote 로 연다.
    return [{ source: "/voicenote", destination: "/voicenote/index.html" }];
  },
  env: {
    // 빌드 시점 Vercel 환경(production/preview/development) → 클라이언트 AdSlot 게이트용.
    // Vercel 외 로컬 빌드는 "development" → 광고 스크립트 미로드.
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "development",
  },
};
export default nextConfig;
