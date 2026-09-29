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
    ];
  },
  env: {
    // 빌드 시점 Vercel 환경(production/preview/development) → 클라이언트 AdSlot 게이트용.
    // Vercel 외 로컬 빌드는 "development" → 광고 스크립트 미로드.
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "development",
  },
};
export default nextConfig;
