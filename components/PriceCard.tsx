import Link from "next/link";
import type { PriceRow } from "@/lib/fetchPrices";

// 페르소나 재정의 (2026-05-13): 한국 주식 retail 타겟. HL은 24시간 시세 source 만,
// 거래 라우팅 CTA 미노출 (코인 트레이더 페르소나 회피, 주식 정보 사이트 정체성 명확화).

// HL funding rate → 상승 베팅 % (FundingBar / HomeHero 와 동일 heuristic)
// 음수 funding = 숏 우세, 양수 = 롱 우세
function fundingToLongPct(funding: number): number {
  const raw = 50 + funding * 10000;
  return Math.max(5, Math.min(95, raw));
}

function formatKRW(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("ko-KR");
}

function formatUSD(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function formatIndex(n: number | null | undefined): string {
  // 지수: $ 없이 숫자만, comma 포맷 (예: 7,387.60)
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type Locale = "ko" | "en";

const i18n = {
  ko: {
    badgePrivate: "비상장",
    badgeIndex: "지수",
    badgeEtf: "ETF",
    vsRegular: "정규장 대비",
    sentLong: "상승",
    sentShort: "하락",
    fundingLabel: "펀딩",
    // 형님 5/13 지적: "롱포지션 유리" = 수익 함의 (모순) / "상승 베팅 우세" = 베팅 비율 (정확)
    // FundingBar(종목 상세)와 라벨 통일 — 3-screen 일관성 확보
    longFavor: "상승 베팅 우세",
    shortFavor: "하락 베팅 우세",
    balanced: "균형",
  },
  en: {
    badgePrivate: "Private",
    badgeIndex: "Index",
    badgeEtf: "ETF",
    vsRegular: "vs Regular",
    sentLong: "Bull",
    sentShort: "Bear",
    fundingLabel: "Funding",
    longFavor: "Bullish bets dominant",
    shortFavor: "Bearish bets dominant",
    balanced: "Balanced",
  },
} as const;

export function PriceCard({ row, locale = "ko" }: { row: PriceRow; locale?: Locale }) {
  const m = row.market;
  // phase 인지 변동률 — live/nxt: 전일 대비 / closed: HL 24h
  const chg = m?.main_change_pct ?? m?.change_24h_pct ?? 0;
  const chgLabel = m?.main_change_label ?? (locale === "en" ? "24h" : "24h");
  const isUp = chg > 0;
  const isDn = chg < 0;
  const cat = row.category;
  const t = i18n[locale];
  // 영어 페이지는 카드 클릭 시에도 영어 컨텍스트 유지 (현재 Phase 1: 종목 상세는 한국어만이라 /en 유지 시 lang 토글로 돌아갈 수 있음)
  const href = locale === "en" ? `/${cat}/${row.slug}` : `/${cat}/${row.slug}`;
  // 종목명: 영어 페이지면 name_en 우선
  const displayName = locale === "en"
    ? (row.name_en || row.name_ko || row.slug)
    : (row.name_ko || row.name_en || row.slug);

  // 표시 가격 결정 — 시간대 인지 메인 (장중 = 정규장 실시간, 그 외 = HL 야간)
  const displayKRW = m?.main_display_krw ?? m?.per_share_krw ?? m?.krw_price ?? null;
  const displayUSD = m?.main_display_usd ?? m?.per_share_usd ?? m?.mark_px_usd ?? null;
  const showSharePrefix = m?.per_share_krw != null && row.share_ratio !== 1.0;

  // 메인 통화: 한국 주식만 KRW 메인, 지수는 단위 없는 숫자, 그 외 USD 메인
  // ADR(미국 상장·USD)은 korea 카테고리여도 미국주식처럼 달러 메인 + 원화 보조로 렌더
  const isKR = cat === "korea" && row.is_adr !== true;
  const isIndex = row.is_index === true;
  const mainPrice = isIndex
    ? formatIndex(displayUSD) // 지수: 7,387.60 같이 단위 없는 숫자
    : isKR
      ? `₩${formatKRW(displayKRW)}`
      : `$${formatUSD(displayUSD)}`;
  // 보조 표시 매트릭스:
  //   - 환율 / 지수: 보조 없음
  //   - 한국주식 live (KRX 장중) / nxt: 보조 없음 (원화 그 자체)
  //   - 한국주식 closed (Hyperliquid phase): ★ 달러 보조 (HL은 원래 USD 거래, 형님 5/13 요청)
  //   - 미국주식 / 비상장 / 테마 ETF: 원화 보조 (한국 retail 환산 reference)
  const isKrHlPhase = isKR && m?.market_phase === "closed";
  const subPrice = (row.is_fx || isIndex)
    ? null
    : isKR
      ? (isKrHlPhase && displayUSD != null ? `≈ $${formatUSD(displayUSD)}` : null)
      : (displayKRW != null ? `≈ ₩${formatKRW(displayKRW)}` : null);

  return (
    <Link href={href as any}>
      <div className="card-lift group bg-bg-card hover:bg-bg-hover border border-line hover:border-accent-blue/40 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            {/* 종목명 — 한 줄 단독 (truncate 자유, phase pill 끼지 않음) */}
            <div className="text-base font-semibold text-text truncate">{displayName}</div>
            {/* ticker + phase pill 같은 줄 (작은 글씨, 카드 공간 절약) */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-text-dim font-medium tracking-wider shrink-0 whitespace-nowrap">{row.ticker.split(":")[1]}</span>
              {/* 3-phase dot + 텍스트 — 정규장 🟢 / NXT 🟠 / Hyperliquid 🔵. 비상장 phase 없음. */}
              {!row.is_private && m?.market_phase && (() => {
                const phase = m.market_phase;
                const cfg =
                  phase === "live"
                    ? {
                        color: "bg-accent-green",
                        textColor: "text-accent-green",
                        pulse: true,
                        label: locale === "en" ? "Regular" : "정규장",
                        title: locale === "en" ? "Market open" : "정규장 거래중",
                      }
                    : phase === "nxt"
                    ? {
                        color: "bg-accent-amber",
                        textColor: "text-accent-amber",
                        pulse: true,
                        label: "NXT",
                        title: locale === "en" ? "NXT after-hours" : "NXT 시간외 거래",
                      }
                    : row.is_adr
                    ? {
                        color: "bg-text-dim",
                        textColor: "text-text-dim",
                        pulse: false,
                        label: locale === "en" ? "Nasdaq closed" : "나스닥 마감",
                        title: locale === "en" ? "Nasdaq regular session closed" : "나스닥 정규장 마감",
                      }
                    : {
                        color: "bg-accent-blue",
                        textColor: "text-accent-blue",
                        pulse: false,
                        label: row.source === "binance" ? "Binance" : "Hyperliquid",
                        title:
                          row.source === "binance"
                            ? locale === "en"
                              ? "Binance futures 24h"
                              : "Binance 선물 24h 기준"
                            : locale === "en"
                            ? "Hyperliquid 24h"
                            : "Hyperliquid 24h 기준",
                      };
                return (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold tabular ${cfg.textColor} shrink min-w-0 truncate`}
                    title={cfg.title}
                    aria-label={cfg.title}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.color} ${cfg.pulse ? "animate-pulse-soft" : ""} shrink-0`} />
                    <span className="truncate">{cfg.label}</span>
                  </span>
                );
              })()}
            </div>
          </div>
          {/* 우측 배지 — 가로 자연 자리 (whitespace-nowrap 으로 세로 깨짐 방지) */}
          {row.is_private && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/15 text-accent-purple font-semibold whitespace-nowrap shrink-0">{t.badgePrivate}</span>}
          {row.is_index && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-amber/15 text-accent-amber font-semibold whitespace-nowrap shrink-0">{t.badgeIndex}</span>}
          {row.is_etf && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-blue/15 text-accent-blue font-semibold whitespace-nowrap shrink-0">{t.badgeEtf}</span>}
        </div>

        <div className="flex flex-col gap-0.5 mb-1.5">
          <div className="text-2xl font-bold tabular text-text">{mainPrice}</div>
          {subPrice && <div className="text-[11px] text-text-dim tabular">{subPrice}</div>}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`tabular font-semibold ${isUp ? "text-accent-green" : isDn ? "text-accent-blue" : "text-text-muted"}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {Math.abs(chg).toFixed(2)}%
          </span>
          <span className="text-[10px] text-text-dim tabular">{chgLabel}</span>
        </div>

        {m?.hl_premium_pct != null && (() => {
          const isUS = cat === "us";
          // phase 인지 — 카드 메인 가격 vs KRX 종가 (메인이 NXT 면 NXT vs KRX 종가, 메인이 HL 면 HL vs KRX 종가).
          // 형님 지적 : 차액이 메인 가격과 매칭되어야 retail 정합.
          const mainKrw = m.main_display_krw ?? m.per_share_krw ?? m.krw_price;
          const mainUsd = m.main_display_usd ?? m.mark_px_usd;
          let gapText: string | null = null;
          let pct: number = m.hl_premium_pct;
          if (isKR && m.regular_close_krw != null && m.regular_close_krw > 0) {
            const g = Math.round(mainKrw - m.regular_close_krw);
            pct = ((mainKrw - m.regular_close_krw) / m.regular_close_krw) * 100;
            gapText = `${g > 0 ? "+" : g < 0 ? "−" : ""}₩${Math.abs(g).toLocaleString("ko-KR")}`;
          } else if (isUS && m.regular_close_usd != null && m.regular_close_usd > 0) {
            const g = mainUsd - m.regular_close_usd;
            pct = ((mainUsd - m.regular_close_usd) / m.regular_close_usd) * 100;
            gapText = `${g > 0 ? "+" : g < 0 ? "−" : ""}$${Math.abs(g).toFixed(2)}`;
          }
          const premColor = pct > 0 ? "text-accent-green" : pct < 0 ? "text-accent-blue" : "text-text-muted";
          return (
            <div className={`mt-2 pt-2 border-t border-line/60 flex items-start justify-between gap-2 tabular ${isKR ? "text-sm" : "text-xs"}`}>
              <span className="text-text-dim pt-0.5 text-xs whitespace-nowrap shrink-0">
                {t.vsRegular}
              </span>
              <span className={`text-right ${isKR ? "text-base font-bold" : "font-semibold"} ${premColor}`}>
                {pct > 0 ? "▲ +" : pct < 0 ? "▼ " : ""}{Math.abs(pct).toFixed(2)}%
                {gapText && (
                  <span className="block text-[11px] font-normal mt-0.5 opacity-90">
                    {gapText}
                  </span>
                )}
              </span>
            </div>
          );
        })()}

        {/* ADR 프리미엄 — ADR 비율(예: 10주=보통주 1주) 환산가를 국내 정규장 종가와 비교 (형님 요청) */}
        {row.is_adr && m?.adr_premium_pct != null && (() => {
          const pct = m.adr_premium_pct;
          const ratio = row.adr_ratio ?? 1;
          const premColor = pct > 0 ? "text-accent-green" : pct < 0 ? "text-accent-blue" : "text-text-muted";
          return (
            <div className="mt-2 pt-2 border-t border-line/60 flex items-start justify-between gap-2 tabular text-xs">
              <span className="text-text-dim pt-0.5 whitespace-nowrap shrink-0">
                {locale === "en" ? `${ratio} ADR ≈ 1 share, vs KR` : `ADR ${ratio}주 환산 국내대비`}
              </span>
              <span className={`text-right font-semibold ${premColor}`}>
                {pct > 0 ? "▲ +" : pct < 0 ? "▼ " : ""}{Math.abs(pct).toFixed(2)}%
                {m.adr_implied_krw != null && (
                  <span className="block text-[11px] font-normal mt-0.5 opacity-90">
                    ₩{Math.round(m.adr_implied_krw).toLocaleString("ko-KR")}
                  </span>
                )}
              </span>
            </div>
          );
        })()}

        {/* 정규장 종가 줄 — premium 박스 아래 (형님 요청: KRX 종가 → 정규장 대비 아래로 이동). nxt + closed phase 표시. */}
        {/* 비상장은 regular_close 매핑 없음 → null 자동 */}
        {m?.market_phase && m.market_phase !== "live" && (() => {
          // ADR은 메인 가격 자체가 마지막 정규장 가격 → 별도 종가 줄 중복이라 생략
          if (row.is_adr) return null;
          if (isIndex && m.regular_close_usd != null) {
            const v = m.regular_close_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return <div className="mt-1.5 text-[10px] text-text-dim tabular">{locale === "en" ? `Reg close ${v}` : `정규장 종가 ${v}`}</div>;
          }
          if (isKR && m.regular_close_krw != null) {
            const v = Math.round(m.regular_close_krw).toLocaleString("ko-KR");
            // KRX(네이버) vs 해외 상장 ADR(Yahoo) — 소스에 따라 라벨 분기 (하이닉스 ADR 등)
            const label =
              m.regular_source === "yahoo"
                ? locale === "en"
                  ? `ADR close ₩${v}`
                  : `ADR 종가 ₩${v}`
                : locale === "en"
                ? `KRX close ₩${v}`
                : `KRX 종가 ₩${v}`;
            return <div className="mt-1.5 text-[10px] text-text-dim tabular">{label}</div>;
          }
          if (!isKR && !isIndex && !row.is_private && m.regular_close_usd != null) {
            return <div className="mt-1.5 text-[10px] text-text-dim tabular">{locale === "en" ? `Reg close $${m.regular_close_usd.toFixed(2)}` : `정규장 종가 $${m.regular_close_usd.toFixed(2)}`}</div>;
          }
          return null;
        })()}

        {/* 시장 sentiment — HL 거래자 포지션 기반 (형님 5/13 요청 확장: 미국주식·비상장·테마·지수 모두 노출)
            줄 1: 📊 ↑상승 X% / ↓하락 Y% (베팅 비율)
            줄 2: 펀딩 +0.0X% · 롱포지션 유리 / 숏포지션 유리 / 균형
            환율(is_fx)은 funding 의미 약함 → 자동 hide. ADR은 perp 없어 funding 무의미 → hide */}
        {!row.is_fx && !row.is_adr && m?.funding != null && !isNaN(m.funding) && (() => {
          const longPct = fundingToLongPct(m.funding);
          const shortPct = 100 - longPct;
          const isBull = m.funding > 0.00001;
          const isBear = m.funding < -0.00001;
          const fundingPctText = (m.funding * 100).toFixed(4);
          const fundingSign = m.funding > 0 ? "+" : "";
          const favorLabel = isBull ? t.longFavor : isBear ? t.shortFavor : t.balanced;
          const favorColor = isBull
            ? "text-accent-green"
            : isBear
            ? "text-accent-blue"
            : "text-text-muted";
          // 5/14 형님 지적: 우측 💰 거래대금 mini가 좁은 카드 폭에서 wrap → 상승/하락 두 줄로 밀림.
          //   롤백 — 카드 grid는 sentiment 비율 + favor 라벨이 핵심. 24h 거래대금은 종목 상세 Stat tile로 충분.
          return (
            <div className="mt-2 pt-2 border-t border-line/40">
              <div className="text-[10px] text-text-dim tabular leading-tight">
                📊{" "}
                <span className={isBull ? "text-accent-green" : "text-text-dim"}>
                  ↑{t.sentLong} {longPct.toFixed(0)}%
                </span>
                <span className="text-text-dim/60"> / </span>
                <span className={isBear ? "text-accent-blue" : "text-text-dim"}>
                  ↓{t.sentShort} {shortPct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-text-dim tabular leading-tight">
                {t.fundingLabel} {fundingSign}{fundingPctText}%{" "}
                <span className={`font-semibold ${favorColor}`}>
                  · {favorLabel}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </Link>
  );
}
