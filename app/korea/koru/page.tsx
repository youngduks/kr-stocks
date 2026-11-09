// KORU(코루) 24시간 페이지 — 2026-11-09
// 네이버 월간 검색량: KORU 34,150 · 코루 6,280 (2026-11-09 코디네이터 조회)
// /korea/kospi-night 과 같은 방식(lib/ewy.ts fetchEtfPerp): 달러 가격 + 미국 종가 대비 등락률. 원화 환산 없음(5/11 교훈).
// universe_map(홈 종목 목록)에는 넣지 않음 — 2026-05 "ETF 빼라" 결정 유지.
//
// 상품 사실 근거: SEC 요약 투자설명서(497K, 2026-02-27) "Direxion Daily MSCI South Korea Bull 3X ETF", Ticker KORU, NYSE Arca
//   - MSCI Korea 25/50 Index 하루 성과의 300%(수수료·비용 전)를 추구
//   - 하루보다 긴 기간 수익률은 매일 복리 결과라 300%와 매우 달라질 가능성이 큼
//   - 지수가 하루 33% 넘게 하락하면 하루 만에 원금 전액 손실 가능
//   원문 사본: artifacts/krstocks_1109/sources/koru_497k.htm

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { AsOf } from "@/components/ui/AsOf";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchEtfPerp, KORU_CFG, EWY_CFG, type EwySnapshot, type EwyPerp } from "@/lib/ewy";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

const URL = "https://kr-stocks.com/korea/koru";
const TITLE = "KORU(코루) 24시간 시세 — 한국 3배 레버리지 ETF";
const DESC =
  "KORU(코루, Direxion Daily MSCI South Korea Bull 3X ETF) 24시간 시세. 바이낸스 KORUUSDT·하이퍼리퀴드 xyz:KORU 무기한 선물 가격을 미국 정규장 종가 대비 등락률로 보여줍니다. 하루 3배 레버리지 상품의 위험 안내 포함.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["KORU", "코루", "KORU 시세", "KORU 주가", "한국 3배 레버리지 ETF", "KORUUSDT", "Direxion KORU"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  alternates: { canonical: URL },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "KORU(코루)는 무엇인가요?",
    a: "미국 Direxion이 운용하는 레버리지 ETF예요. 정식 이름은 Direxion Daily MSCI South Korea Bull 3X ETF이고 미국 NYSE Arca에 상장돼 있어요. 한국 대형·중형주로 구성된 MSCI Korea 25/50 지수의 하루 등락을 3배로 따라가도록 설계됐어요.",
  },
  {
    q: "KORU를 오래 들고 있으면 지수 수익률의 3배가 되나요?",
    a: "아니요. 운용사 투자설명서에 따르면 KORU는 하루 단위로만 지수의 300%(수수료·비용 전)를 추구해요. 하루보다 긴 기간의 수익률은 매일의 수익률이 복리로 쌓인 결과라 지수 수익률의 3배와 크게 달라질 수 있고, 지수가 제자리여도 손실이 날 수 있어요.",
  },
  {
    q: "KORU는 얼마나 위험한가요?",
    a: "운용사 투자설명서는 지수가 하루에 33% 넘게 빠지면 하루 만에 원금 전체를 잃을 수 있다고 밝히고 있어요. 레버리지 때문에 같은 하루 동안 지수보다 훨씬 크게 움직여요.",
  },
  {
    q: "이 페이지의 KORU 가격은 무엇인가요?",
    a: "미국 ETF 자체가 아니라 KORU 가격을 따라가는 바이낸스 KORUUSDT·하이퍼리퀴드 xyz:KORU 무기한 선물 가격이에요. 미국 장이 닫힌 밤·주말에도 거래되지만 실제 KORU 가격과 차이가 날 수 있어요.",
  },
  {
    q: "주말에도 KORU 가격이 보이나요?",
    a: "네. 미국 주식시장이 쉬는 주말에도 무기한 선물은 거래가 이어져 가격이 움직여요. 월요일 미국 정규장 시작 가격과는 다를 수 있어요.",
  },
  {
    q: "왜 원화가 아니라 달러와 등락률로 보여주나요?",
    a: "KORU는 1주 가격이 달러로 매겨지는 미국 ETF라 코스피 지수나 원화 주가와 단위가 달라요. 오해를 줄이려고 가격은 달러로만, 핵심은 미국 종가 대비 등락률(%)로 보여줘요.",
  },
];

function fmtKst(ms: number): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")}월 ${get("day")}일 ${get("hour")}:${get("minute")}`;
}
const fmtMd = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일`;
const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;
const usd = (n: number) => `$${n.toFixed(2)}`;
function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
const toneClass = (n: number | null | undefined) =>
  n == null ? "text-text-muted" : n > 0 ? "text-up" : n < 0 ? "text-down" : "text-text-muted";
const primaryOf = (s: EwySnapshot): EwyPerp | null => (s.primary === "binance" ? s.binance : s.primary === "hl" ? s.hl : null);

function buildSummary(s: EwySnapshot, ewy: EwySnapshot | null): string {
  const t = fmtKst(s.fetchedAt);
  const p = primaryOf(s);
  if (!p) return `${t} 현재 바이낸스·하이퍼리퀴드의 KORU 시세를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.`;
  const src = s.primary === "binance" ? "바이낸스 KORUUSDT" : "하이퍼리퀴드 xyz:KORU";
  const staleNote = s.stale ? " (일시 오류로 이 시각에 받은 마지막 값)" : "";
  let out: string;
  if (s.us && s.vsUsClosePct != null) {
    const ref = `${s.us.usLive ? "전일 미국 종가" : "직전 미국 정규장 종가"}(${fmtMd(s.us.sessionDate)} ${usd(s.us.close)})`;
    const live = s.us.usLive ? "지금은 미국 정규장이 열려 있어요. " : "";
    out = `${t} 기준${staleNote} ${live}KORU(코루) 24시간 시세는 ${ref} 대비 ${signedPct(s.vsUsClosePct)}, 24시간 전 대비 ${signedPct(p.chg24hPct)}예요(${src} ${usd(p.price)}).`;
  } else {
    out = `${t} 기준${staleNote} KORU(코루) 24시간 시세는 24시간 전 대비 ${signedPct(p.chg24hPct)}예요(${src} ${usd(p.price)}).`;
  }
  if (ewy && ewy.vsUsClosePct != null) out += ` 같은 기준으로 레버리지 없는 한국 ETF(EWY)는 ${signedPct(ewy.vsUsClosePct)}예요.`;
  return out;
}

export default async function KoruPage() {
  const [koru, ewy, fx] = await Promise.all([
    fetchEtfPerp(KORU_CFG),
    fetchEtfPerp(EWY_CFG).catch(() => null),
    fetchAllPrices()
      .then((d) => d.fx)
      .catch(() => ({ krw_per_usdt: 0, change_24h_pct: 0 })),
  ]);

  const summary = buildSummary(koru, ewy);
  const p = primaryOf(koru);
  const mainPct = koru.vsUsClosePct ?? p?.chg24hPct ?? null;
  const mainLabel =
    koru.vsUsClosePct != null && koru.us
      ? `${koru.us.usLive ? "전일 미국 종가" : "직전 미국 정규장 종가"}(${fmtMd(koru.us.sessionDate)}, ${usd(koru.us.close)}) 대비`
      : p
        ? "24시간 전 가격 대비"
        : null;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "kr-stocks.com", item: "https://kr-stocks.com" },
        { "@type": "ListItem", position: 2, name: "KORU(코루)", item: URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      {ld.map((d) => (
        <script key={d["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
      <Header fxRate={fx.krw_per_usdt} fxChange={fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle backHref="/" eyebrow={<>🇰🇷 한국 주식 · 미국 상장 3배 레버리지 ETF</>} title={TITLE} />

        {/* 첫 화면 위험 안내 — 운용사 투자설명서 근거 */}
        <section className="ds-card mt-4 mb-4 border-l-4 border-accent-amber">
          <p className="ds-explain">
            <b className="text-text">KORU는 하루 등락의 3배를 추구하는 레버리지 ETF예요.</b> 운용사 투자설명서에 따르면 하루보다 오래
            들고 있으면 복리 효과로 지수 수익률의 3배와 크게 달라질 수 있어요. 이 페이지 가격은 KORU를 따라가는 무기한 선물 시세이며,
            정보 제공용이고 매매 권유가 아닙니다.
          </p>
        </section>

        <section className="ds-card mb-4" aria-labelledby="koru-now">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 id="koru-now" className="ds-eyebrow">
              지금 KORU(코루)는
            </h2>
            {koru.primary && (
              <span className="text-[10px] font-bold text-accent-blue shrink-0">
                {koru.primary === "binance" ? "Binance" : "Hyperliquid"} 24시간
              </span>
            )}
          </div>
          {mainPct != null ? (
            <>
              <div className={`text-4xl md:text-5xl font-bold tabular ${toneClass(mainPct)}`}>
                {mainPct > 0 ? "▲ " : mainPct < 0 ? "▼ " : ""}
                {signedPct(mainPct)}
              </div>
              {mainLabel && <div className="ds-meta mt-1">{mainLabel}</div>}
            </>
          ) : (
            <div className="text-lg font-semibold text-text-muted">시세를 불러오지 못했어요</div>
          )}
          <p className="ds-explain mt-3">{summary}</p>
          <AsOf at={koru.fetchedAt} className="mt-2" note="약 1분마다 갱신" autoRefresh />
        </section>

        <section className="ds-card mb-4" aria-labelledby="koru-src">
          <h2 id="koru-src" className="text-[17px] font-extrabold mb-2">
            소스별 KORU 시세 (달러)
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="ds-meta text-left">
                <th className="py-1 font-medium">소스</th>
                <th className="py-1 font-medium text-right">가격</th>
                <th className="py-1 font-medium text-right">24시간 전 대비</th>
                <th className="py-1 font-medium text-right hidden sm:table-cell">24시간 거래대금</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {(
                [
                  ["바이낸스 선물 KORUUSDT", koru.binance],
                  ["하이퍼리퀴드 xyz:KORU", koru.hl],
                ] as const
              ).map(([name, v]) => (
                <tr key={name} className="border-t border-line">
                  <td className="py-2 text-text">{name}</td>
                  <td className="py-2 text-right text-text">{v ? usd(v.price) : "—"}</td>
                  <td className={`py-2 text-right font-semibold ${toneClass(v?.chg24hPct)}`}>{v ? signedPct(v.chg24hPct) : "—"}</td>
                  <td className="py-2 text-right text-text-muted hidden sm:table-cell">{v ? fmtVol(v.volume24hUsd) : "—"}</td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="py-2 text-text">{koru.us?.usLive ? "미국 정규장 장중가 (NYSE Arca)" : "미국 정규장 종가 (NYSE Arca)"}</td>
                <td className="py-2 text-right text-text">
                  {koru.us ? usd(koru.us.usLive && koru.us.livePrice != null ? koru.us.livePrice : koru.us.close) : "—"}
                </td>
                <td className="py-2 text-right ds-meta" colSpan={2}>
                  {koru.us
                    ? koru.us.usLive
                      ? `전일 종가 ${usd(koru.us.close)} (${fmtMd(koru.us.sessionDate)})`
                      : `${fmtMd(koru.us.sessionDate)} 종가 (뉴욕 현지 날짜)`
                    : "불러오지 못함"}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="ds-meta mt-3">
            무기한 선물은 실제 ETF가 아니라 KORU 가격을 따라가도록 설계된 계약이라 미국 ETF 가격과 차이가 날 수 있어요. 출처: Binance
            USDT-M 선물 · Hyperliquid · Yahoo Finance.
          </p>
        </section>

        <section className="ds-card mb-4" aria-labelledby="koru-what">
          <h2 id="koru-what" className="text-[17px] font-extrabold mb-2">
            KORU 한눈에
          </h2>
          <table className="w-full text-sm">
            <tbody className="text-text-muted">
              {[
                ["정식 이름", "Direxion Daily MSCI South Korea Bull 3X ETF"],
                ["상장", "미국 NYSE Arca (티커 KORU)"],
                ["따르는 지수", "MSCI Korea 25/50 지수 (한국 대형·중형주)"],
                ["목표", "지수 하루 성과의 300% (수수료·비용 전)"],
                ["주의", "하루보다 긴 기간은 복리 때문에 3배와 달라짐 · 지수 하루 −33% 넘으면 원금 전액 손실 가능"],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-line first:border-t-0">
                  <td className="py-2 pr-3 text-text font-semibold whitespace-nowrap">{k}</td>
                  <td className="py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ds-meta mt-3">출처: Direxion 요약 투자설명서(미국 SEC 제출, 2026년 2월 27일).</p>
        </section>

        <section className="ds-card mb-4" aria-labelledby="koru-faq">
          <h2 id="koru-faq" className="text-[17px] font-extrabold mb-3">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-text mb-1 text-[15px]">Q. {f.q}</h3>
                <p className="ds-explain">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ds-card mb-4" aria-labelledby="koru-links">
          <h2 id="koru-links" className="text-[17px] font-extrabold mb-2">
            같이 보기
          </h2>
          <div className="space-y-2 text-sm">
            <Link href="/korea/kospi-night" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → 코스피 야간선물 대신 보는 한국 ETF(EWY) 24시간 시세
            </Link>
            <Link href="/liquidation" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → 청산맵 (KORU 청산 지도 바로가기 포함)
            </Link>
            <Link href="/guide/kospi-night-futures-hours" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → 코스피200 야간선물 거래시간 정리
            </Link>
          </div>
        </section>

        <p className="ds-meta pt-2">
          본 페이지는 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다. 레버리지 ETF는 손실이 빠르게 커질 수 있습니다. 표시 가격은 무기한
          선물 시세로 실제 KORU 가격과 차이가 있을 수 있습니다.
        </p>
      </main>

      <Footer />
    </>
  );
}
