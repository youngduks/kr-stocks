// 코스피 야간선물 검색 수요(네이버 월 18.8만) 대응 페이지 — 2026-11-08
// 실제 KRX 코스피200 야간선물 시세는 공개 API가 없어 보여줄 수 없음 → 24시간 거래되는
// 한국 ETF(EWY) 무기한 선물의 '등락률'을 대용 지표로 보여준다.
//
// ⚠ 5/11 혼동 재발 방지 원칙 (lib/regularClose.ts 19행 참고):
//   - 원화 환산 가격·지수 포인트처럼 보이는 숫자 금지. 핵심 표시는 등락률(%) + 기준점 명시.
//   - 가격은 반드시 $ 단위로만.
//   - "실제 야간선물과 다른 대용 지표" 안내를 첫 화면에.
//
// 렌더: ISR(revalidate) — 정적 HTML에 요약 문장이 그대로 들어가도록 force-dynamic 쓰지 않음.

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { AsOf } from "@/components/ui/AsOf";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchEwy, type EwySnapshot, type EwyPerp } from "@/lib/ewy";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

const URL = "https://kr-stocks.com/korea/kospi-night";
const TITLE = "코스피 야간선물 대신 보는 24시간 한국 ETF(EWY) 시세";
const DESC =
  "코스피 야간선물(KRX 코스피200 야간선물) 대신 24시간 거래되는 한국 ETF(EWY) 무기한 선물의 등락률을 미국 정규장 종가 대비로 보여줍니다. " +
  "바이낸스 EWYUSDT·하이퍼리퀴드 xyz:EWY 기준, 실제 야간선물과는 다른 대용 지표입니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "코스피 야간선물",
    "야간선물",
    "코스피200 야간선물",
    "코스피 야간",
    "EWY",
    "EWY 시세",
    "한국 ETF 24시간",
    "EWYUSDT",
  ],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  alternates: { canonical: URL },
};

// 자주 묻는 질문 — 화면과 FAQPage JSON-LD 가 이 배열 하나를 같이 씀 (문구 불일치 방지)
// 거래시간: 한국거래소 2026-11-06 수능일 거래시간 안내 보도(다수 언론) 기준 "평소 오후 6시 개장, 다음 날 오전 6시 종료".
//          야간 파생상품시장 자체 개장일 2025-06-09 (한국거래소 개장식 보도).
const FAQ: { q: string; a: string }[] = [
  {
    q: "코스피 야간선물이 뭔가요?",
    a: "한국거래소(KRX) 야간 파생상품시장에서 정규장이 끝난 뒤 저녁부터 다음 날 새벽까지 거래되는 코스피200 선물을 흔히 코스피 야간선물이라고 불러요. 한국거래소는 2025년 6월 9일 자체 야간 파생상품시장을 열었어요.",
  },
  {
    q: "코스피 야간선물은 몇 시에 거래되나요?",
    a: "2026년 11월 한국거래소 안내 기준으로 평소 오후 6시에 열려 다음 날 오전 6시에 끝나요. 수능일처럼 거래시간이 임시로 바뀌는 날이 있으니 정확한 일정은 한국거래소나 이용하는 증권사 공지를 확인하세요.",
  },
  {
    q: "이 페이지의 EWY 시세는 코스피 야간선물과 무엇이 다른가요?",
    a: "EWY(iShares MSCI South Korea ETF)는 미국에 상장된 한국 주식 ETF로, 코스피200이 아니라 MSCI 한국 지수를 따르고 달러로 거래돼요. 그래서 담긴 종목·비중이 다르고 원/달러 환율 변화도 함께 반영돼요. 이 페이지는 그 EWY를 따라가는 바이낸스·하이퍼리퀴드 무기한 선물 가격을 쓰기 때문에, 코스피 야간선물 가격이 아니라 밤사이 한국 주식 분위기를 가늠하는 대용 지표로만 봐 주세요.",
  },
  {
    q: "등락률은 무엇을 기준으로 계산하나요?",
    a: "EWY의 직전 미국 정규장 종가를 기준으로 지금 무기한 선물 가격이 몇 % 다른지 계산해요. 미국 정규장(뉴욕 시간 오전 9시 30분~오후 4시)이 열려 있는 동안에는 전일 미국 종가가 기준이에요. 24시간 전 가격 대비 등락률도 함께 보여줘요.",
  },
  {
    q: "주말에도 시세가 보이나요?",
    a: "네. 한국과 미국 주식시장이 쉬는 주말에도 바이낸스·하이퍼리퀴드의 EWY 무기한 선물은 거래가 이어져 가격이 움직여요. 다만 거래가 적을 때는 몇 건의 거래에도 크게 흔들릴 수 있고, 월요일 실제 시장 시작 가격과 다를 수 있어요.",
  },
  {
    q: "왜 원화 가격이 아니라 달러와 등락률로 보여주나요?",
    a: "EWY는 1주 가격이 달러로 매겨지는 ETF라 코스피200 지수 포인트나 원화 주가와 단위가 달라요. 원화로 바꿔 보여주면 지수 값처럼 오해하기 쉬워서, 가격은 달러로만 표시하고 핵심은 등락률(%)로 보여줘요.",
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

function fmtMdFromIso(ymd: string): string {
  const [, mm, dd] = ymd.split("-");
  return `${Number(mm)}월 ${Number(dd)}일`;
}

function signedPct(n: number): string {
  const s = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${s}${Math.abs(n).toFixed(2)}%`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function toneClass(n: number | null | undefined): string {
  if (n == null) return "text-text-muted";
  return n > 0 ? "text-up" : n < 0 ? "text-down" : "text-text-muted";
}

/** 서버 HTML에 그대로 들어가는 요약 문장 (실데이터만, 없으면 안내 문구) */
function buildSummary(s: EwySnapshot): string {
  const t = fmtKst(s.fetchedAt);
  const p: EwyPerp | null = s.primary === "binance" ? s.binance : s.primary === "hl" ? s.hl : null;
  if (!p) {
    return `${t} 현재 바이낸스·하이퍼리퀴드의 한국 ETF(EWY) 시세를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.`;
  }
  const src = s.primary === "binance" ? "바이낸스 EWYUSDT" : "하이퍼리퀴드 xyz:EWY";
  const staleNote = s.stale ? " (일시 오류로 이 시각에 받은 마지막 값)" : "";
  if (s.us && s.vsUsClosePct != null) {
    const ref = `${s.us.usLive ? "전일 미국 종가" : "직전 미국 정규장 종가"}(${fmtMdFromIso(s.us.sessionDate)} ${usd(s.us.close)})`;
    const live = s.us.usLive ? "지금은 미국 정규장이 열려 있어요. " : "";
    return `${t} 기준${staleNote} ${live}한국 ETF(EWY) 24시간 시세는 ${ref} 대비 ${signedPct(s.vsUsClosePct)}, 24시간 전 대비 ${signedPct(p.chg24hPct)}예요(${src} ${usd(p.price)}).`;
  }
  return `${t} 기준${staleNote} 한국 ETF(EWY) 24시간 시세는 24시간 전 대비 ${signedPct(p.chg24hPct)}예요(${src} ${usd(p.price)}). 미국 종가 기준값은 지금 불러오지 못했어요.`;
}

export default async function KospiNightPage() {
  const [ewy, fx] = await Promise.all([
    fetchEwy(),
    // 헤더 환율 위젯용 — 실패해도 페이지는 그대로 (환율 줄만 숨김)
    fetchAllPrices()
      .then((d) => d.fx)
      .catch(() => ({ krw_per_usdt: 0, change_24h_pct: 0 })),
  ]);

  const summary = buildSummary(ewy);
  const p = ewy.primary === "binance" ? ewy.binance : ewy.primary === "hl" ? ewy.hl : null;
  const mainPct = ewy.vsUsClosePct ?? p?.chg24hPct ?? null;
  const mainLabel =
    ewy.vsUsClosePct != null && ewy.us
      ? `${ewy.us.usLive ? "전일 미국 종가" : "직전 미국 정규장 종가"}(${fmtMdFromIso(ewy.us.sessionDate)}, ${usd(ewy.us.close)}) 대비`
      : p
        ? "24시간 전 가격 대비"
        : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "kr-stocks.com", item: "https://kr-stocks.com" },
      { "@type": "ListItem", position: 2, name: "코스피 야간선물", item: URL },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Header fxRate={fx.krw_per_usdt} fxChange={fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle backHref="/" eyebrow={<>🇰🇷 한국 주식 · 코스피 야간선물 대용 지표</>} title={TITLE} />

        {/* 첫 화면 안내 — 실제 야간선물 아님 */}
        <section className="ds-card mt-4 mb-4 border-l-4 border-accent-amber">
          <p className="ds-explain">
            <b className="text-text">실제 KRX 코스피200 야간선물 시세가 아니에요.</b> 미국에 상장된 한국 ETF(EWY)를 따라가는
            무기한 선물의 등락률을 보여주는 <b className="text-text">대용 지표</b>예요. 정보 제공용이며 매매 권유가 아닙니다.
          </p>
        </section>

        {/* ① 요약 — 서버 HTML에 문장 그대로 */}
        <section className="ds-card mb-4" aria-labelledby="ewy-now">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 id="ewy-now" className="ds-eyebrow">
              지금 한국 ETF(EWY)는
            </h2>
            {ewy.primary && (
              <span className="text-[10px] font-bold text-accent-blue shrink-0">
                {ewy.primary === "binance" ? "Binance" : "Hyperliquid"} 24시간
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
          <AsOf at={ewy.fetchedAt} className="mt-2" note="약 1분마다 갱신" autoRefresh />
        </section>

        {/* ② 소스별 시세 — 달러 단위만 */}
        <section className="ds-card mb-4" aria-labelledby="ewy-src">
          <h2 id="ewy-src" className="text-[17px] font-extrabold mb-2">
            소스별 EWY 시세 (달러)
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
                  ["바이낸스 선물 EWYUSDT", ewy.binance],
                  ["하이퍼리퀴드 xyz:EWY", ewy.hl],
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
                <td className="py-2 text-text">
                  {ewy.us?.usLive ? "미국 정규장 장중가 (NYSE Arca)" : "미국 정규장 종가 (NYSE Arca)"}
                </td>
                <td className="py-2 text-right text-text">
                  {ewy.us ? usd(ewy.us.usLive && ewy.us.livePrice != null ? ewy.us.livePrice : ewy.us.close) : "—"}
                </td>
                <td className="py-2 text-right ds-meta" colSpan={2}>
                  {ewy.us
                    ? ewy.us.usLive
                      ? `전일 종가 ${usd(ewy.us.close)} (${fmtMdFromIso(ewy.us.sessionDate)})`
                      : `${fmtMdFromIso(ewy.us.sessionDate)} 종가 (뉴욕 현지 날짜)`
                    : "불러오지 못함"}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="ds-meta mt-3">
            무기한 선물은 실제 ETF가 아니라 EWY 가격을 따라가도록 설계된 계약이라 미국 ETF 가격과도 차이가 날 수 있어요. 출처: Binance
            USDT-M 선물 · Hyperliquid · Yahoo Finance.
          </p>
        </section>

        {/* ③ 코스피 야간선물 vs 이 페이지 */}
        <section className="ds-card mb-4" aria-labelledby="ewy-diff">
          <h2 id="ewy-diff" className="text-[17px] font-extrabold mb-2">
            코스피 야간선물과 무엇이 다른가요
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="ds-meta text-left">
                <th className="py-1 font-medium"> </th>
                <th className="py-1 font-medium">KRX 코스피 야간선물</th>
                <th className="py-1 font-medium">이 페이지 (EWY 무기한 선물)</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr className="border-t border-line">
                <td className="py-2 pr-2 text-text font-semibold">따르는 대상</td>
                <td className="py-2 pr-2">코스피200 지수</td>
                <td className="py-2">MSCI 한국 지수를 따르는 미국 ETF(EWY)</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-2 pr-2 text-text font-semibold">단위</td>
                <td className="py-2 pr-2">지수 포인트 (원화)</td>
                <td className="py-2">1주 가격 (달러) — 그래서 등락률(%)로 비교</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-2 pr-2 text-text font-semibold">거래시간</td>
                <td className="py-2 pr-2">평소 오후 6시 ~ 다음 날 오전 6시</td>
                <td className="py-2">24시간 (주말 포함)</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-2 pr-2 text-text font-semibold">거래하는 곳</td>
                <td className="py-2 pr-2">한국거래소</td>
                <td className="py-2">바이낸스 · 하이퍼리퀴드</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ④ 자주 묻는 질문 — FAQPage JSON-LD 와 같은 배열 */}
        <section className="ds-card mb-4" aria-labelledby="ewy-faq">
          <h2 id="ewy-faq" className="text-[17px] font-extrabold mb-3">
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

        {/* ⑤ 같이 보기 */}
        <section className="ds-card mb-4" aria-labelledby="ewy-links">
          <h2 id="ewy-links" className="text-[17px] font-extrabold mb-2">
            같이 보기
          </h2>
          <div className="space-y-2 text-sm">
            <Link href="/korea/samsung" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → 삼성전자 24시간 시세 (야간·주말)
            </Link>
            <Link href="/korea/hynix" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → SK하이닉스 24시간 시세 (야간·주말)
            </Link>
            <Link href="/korea/koru" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → KORU(코루) 한국 3배 레버리지 ETF 24시간 시세
            </Link>
            <Link href="/guide/kospi-night-futures-hours" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → 코스피200 야간선물 거래시간 정리
            </Link>
            <Link href="/guide/korean-overnight-prices" prefetch={false} className="block font-semibold text-accent-blue hover:underline">
              → 한국 주식 야간 가격 확인하는 법
            </Link>
          </div>
        </section>

        <p className="ds-meta pt-2">
          본 페이지는 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다. 표시 가격은 무기한 선물 시세로 실제 KRX 코스피200
          야간선물·미국 EWY 가격과 차이가 있을 수 있습니다.
        </p>
      </main>

      <Footer />
    </>
  );
}
