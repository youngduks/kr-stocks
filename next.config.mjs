/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  // 짧은 주소 → 실제 페이지 (2026-11-16 정보 구조 재정비). 전부 예전엔 404 였던 주소라 기존 페이지에는 영향 없음.
  //   /samsung 등 종목 짧은 주소 → 종목 상세, /private·/korea·/us·/global → 시세 허브의 해당 카드
  async redirects() {
    return [
      { source: "/samsung", destination: "/korea/samsung", permanent: true },
      { source: "/hynix", destination: "/korea/hynix", permanent: true },
      { source: "/hyundai", destination: "/korea/hyundai", permanent: true },
      { source: "/private", destination: "/markets#private", permanent: false },
      { source: "/korea", destination: "/markets#korea", permanent: false },
      { source: "/us", destination: "/markets#us", permanent: false },
      { source: "/global", destination: "/markets#global", permanent: false },
      // SpaceX 는 상장 후 us 카테고리로 옮겨져 예전 주소가 404 — 404 안내 페이지·외부 링크 보호
      { source: "/private/spacex", destination: "/us/spacex", permanent: true },
    ];
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
