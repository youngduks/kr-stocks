// 종목별 동적 OG 이미지 — viral paste / 카톡 / X 공유 시 sublime thumbnail
// 2026-05-13 도입 (형님 D 작업)
// 가격 + 변동률 + 카테고리 + 종목명 — 한 번에 종목 정보 압축 노출

import { ImageResponse } from "next/og";
import { bySlug, CATEGORY_LABELS } from "@/lib/universe";
import { fetchAllPrices } from "@/lib/fetchPrices";

export const runtime = "nodejs"; // fetchAllPrices의 Upbit + HL 호출 안전 환경
export const revalidate = 300; // 5분 캐시 (paste 시 정확도 + 응답성 균형)
export const alt = "kr-stocks.com — 24시간 종목 시세";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: { category: string; slug: string } };

export default async function OGImage({ params }: Props) {
  const meta = bySlug(params.slug);

  // 종목 못 찾으면 default fallback
  if (!meta || meta.category !== params.category) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#15181D",
            color: "#fff",
            fontSize: 60,
            fontWeight: 700,
          }}
        >
          kr-stocks.com
        </div>
      ),
      { ...size }
    );
  }

  const catLabel = CATEGORY_LABELS[meta.category];
  const nameKo = meta.name_ko || meta.name_en || params.slug;
  const nameEn = meta.name_en || "";
  const ticker = meta.ticker;
  const krxCode = meta.krx_code;

  // 가격 + 변동률 — fetch 실패해도 fallback 으로 렌더
  let priceText: string | null = null;
  let chgText: string | null = null;
  let chgColor = "#9CA3AF";
  let chgArrow = "";
  let chgLabel = "";
  let subPrice: string | null = null;
  try {
    const data = await fetchAllPrices();
    const row = data.symbols.find((r) => r.slug === params.slug);
    if (row && row.market) {
      const m = row.market;
      const chg = m.main_change_pct ?? m.change_24h_pct ?? 0;
      chgLabel = m.main_change_label ?? "24h";
      const isUp = chg > 0;
      const isDn = chg < 0;
      chgArrow = isUp ? "▲" : isDn ? "▼" : "•";
      chgColor = isUp ? "#1FAE6F" : isDn ? "#3182F6" : "#9CA3AF";
      chgText = `${chgArrow} ${isUp ? "+" : isDn ? "−" : ""}${Math.abs(chg).toFixed(2)}%`;

      // 메인 가격 — 카테고리별
      if (meta.is_index) {
        priceText = (m.main_display_usd ?? m.mark_px_usd).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else if (meta.category === "korea") {
        const krw = m.main_display_krw ?? m.per_share_krw ?? m.krw_price;
        priceText = `₩${Math.round(krw).toLocaleString("ko-KR")}`;
        // closed phase 시 달러 sub (5/13 형님 정책)
        if (m.market_phase === "closed") {
          const usd = m.main_display_usd ?? m.per_share_usd ?? m.mark_px_usd;
          if (usd != null) {
            subPrice = `≈ $${usd >= 10000 ? Math.round(usd).toLocaleString("en-US") : usd.toFixed(2)}`;
          }
        }
      } else {
        const usd = m.main_display_usd ?? m.mark_px_usd;
        priceText = `$${usd >= 10000 ? Math.round(usd).toLocaleString("en-US") : usd.toFixed(2)}`;
        // 미국주식·테마·비상장 — 원화 sub
        if (m.krw_price) {
          subPrice = `≈ ₩${Math.round(m.krw_price).toLocaleString("ko-KR")}`;
        }
      }
    }
  } catch {
    // fetch 실패 — 가격 없는 default 디자인으로 렌더
  }

  // 비상장·지수 배지
  const badges: string[] = [];
  if (meta.is_private) badges.push("비상장 perp");
  if (meta.is_index) badges.push("지수");
  if (meta.is_etf) badges.push("ETF");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 70px",
          background:
            "linear-gradient(135deg, #15181D 0%, #1A1E26 50%, #15181D 100%)",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* 헤더 — 사이트 브랜드 + 카테고리 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#1FAE6F",
                boxShadow: "0 0 20px #1FAE6F",
              }}
            />
            <div
              style={{
                fontSize: "26px",
                color: "#9CA3AF",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              KR-STOCKS · 24H LIVE
            </div>
          </div>
          <div
            style={{
              fontSize: "26px",
              color: "#9CA3AF",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "32px" }}>{catLabel.emoji}</span>
            <span>{catLabel.ko}</span>
          </div>
        </div>

        {/* 종목명 — 큰 글자 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "50px",
          }}
        >
          <div
            style={{
              fontSize: "92px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            {nameKo}
          </div>
          {nameEn && nameEn !== nameKo && (
            <div
              style={{
                fontSize: "32px",
                color: "#9CA3AF",
                marginTop: "12px",
                fontWeight: 500,
              }}
            >
              {nameEn}
            </div>
          )}
          <div
            style={{
              fontSize: "22px",
              color: "#6B7280",
              marginTop: "10px",
              fontFamily: "monospace",
              display: "flex",
              gap: "10px",
            }}
          >
            <span>{ticker}</span>
            {krxCode && <span>· {krxCode}</span>}
            {badges.map((b, i) => (
              <span
                key={i}
                style={{
                  fontSize: "18px",
                  padding: "3px 12px",
                  borderRadius: "8px",
                  background: meta.is_private
                    ? "rgba(168, 85, 247, 0.18)"
                    : "rgba(245, 158, 11, 0.18)",
                  color: meta.is_private ? "#A855F7" : "#F59E0B",
                  fontWeight: 700,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* 가격 + 변동률 — fetch 성공 시만 */}
        {priceText && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: "auto",
              marginBottom: "30px",
              gap: "30px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "76px",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {priceText}
              </div>
              {subPrice && (
                <div
                  style={{
                    fontSize: "26px",
                    color: "#6B7280",
                    marginTop: "8px",
                    fontWeight: 500,
                  }}
                >
                  {subPrice}
                </div>
              )}
            </div>
            {chgText && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    fontSize: "60px",
                    fontWeight: 800,
                    color: chgColor,
                    lineHeight: 1,
                  }}
                >
                  {chgText}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    color: "#6B7280",
                    marginTop: "8px",
                    fontWeight: 500,
                  }}
                >
                  {chgLabel}
                </div>
              </div>
            )}
          </div>
        )}

        {/* footer — 사이트 USP */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "20px",
            color: "#6B7280",
            marginTop: priceText ? "0" : "auto",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "20px",
          }}
        >
          <span style={{ color: "#3182F6", fontWeight: 700 }}>kr-stocks.com</span>
          <span style={{ color: "#374151" }}>·</span>
          <span>정규장 + NXT + Hyperliquid 24h 통합</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
