/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  env: {
    // 빌드 시점 Vercel 환경(production/preview/development) → 클라이언트 AdSlot 게이트용.
    // Vercel 외 로컬 빌드는 "development" → 광고 스크립트 미로드.
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "development",
  },
};
export default nextConfig;
