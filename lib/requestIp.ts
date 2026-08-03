import { NextRequest } from "next/server";

/** Vercel이 붙이는 x-forwarded-for 첫 값 — 레이트리밋/신고 중복방지용 (신원 특정 목적 아님). */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
