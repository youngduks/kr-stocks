import Link from "next/link";
import { fetchAllPrices, type PriceRow } from "@/lib/fetchPrices";
import { CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomeHero } from "@/components/HomeHero";
import { PollWidget } from "@/components/PollWidget";
import { PersonCardCompact } from "@/components/PersonCard";
import { getHumanIndicators } from "@/lib/humanIndicators";
import AffiliateStrip from "@/components/AffiliateStrip";
import { fetchSemiSignal, type SemiSignal } from "@/lib/semiSignal";
import { AdSlot } from "@/components/AdSlot";
import { StatusCard, StatTile, type StatusTone } from "@/components/ui/StatusCard";
import { StockRow } from "@/components/home/StockRow";
import { fetchSparkCloses } from "@/lib/fetchCandles";
import { getTradingFlow, formatBigKRW } from "@/lib/tradingFlow";
import { changeTextClass, formatPct } from "@/lib/colors";
import { fetchDealsPreview } from "@/lib/dealsPreview";

export const revalidate = 120; // ISR 캐시 30s → 120s (Free tier 최적화, 5/25)

// ── 상태 카드 문구: SemiSignal.direction(= SOXL÷3, 임계값 ±0.4 / ±1.5 — lib/semiSignal.ts classify) 그대로 번역.
//    과거 통계(HistoryDots 등)는 실데이터 검증 전까지 넣지 않음 (Phase C).
const SIGNAL_COPY: Record<
  SemiSignal["direction"],
  { tone: StatusTone; pill: string; head: string; hl: string; outlook: string | null }
> = {
  strong_down: { tone: "down", pill: "▼ 강한 약세 신호", head: "미국 반도체가", hl: "많이 약해요", outlook: "약하게 시작할 가능성" },
  down: { tone: "down", pill: "▼ 약세 신호", head: "미국 반도체가", hl: "조금 약해요", outlook: "약하게 시작할 가능성" },
  flat: { tone: "flat", pill: "― 보합", head: "미국 반도체가", hl: "평소와 비슷해요", outlook: null },
  up: { tone: "up", pill: "▲ 강세 신호", head: "미국 반도체가", hl: "조금 강해요", outlook: "강하게 시작할 가능성" },
  strong_up: { tone: "up", pill: "▲ 강한 강세 신호", head: "미국 반도체가", hl: "많이 강해요", outlook: "강하게 시작할 가능성" },
  unknown: { tone: "flat", pill: "신호 대기", head: "미국 반도체 신호를", hl: "아직 못 받았어요", outlook: null },
};

function kstTime(epochSec: number | null): string | null {
  if (!epochSec) return null;
  try {
    return new Date(epochSec * 1000).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return null;
  }
}

function TomorrowStatusCard({ semi, fxRate, fxChange }: { semi: SemiSignal; fxRate: number; fxChange: number }) {
  const c = SIGNAL_COPY[semi.direction];
  const when = semi.direction === "unknown" ? "" : semi.isLive ? "지금 " : "밤사이 ";
  const soxlPct = semi.soxl?.changePct ?? null;
  const asOf = kstTime(semi.asOf);
  return (
    <StatusCard
      eyebrow="그래서 내일 아침 한국장은?"
      pill={{ tone: c.tone, label: c.pill }}
      headline={
        <>
          {when}
          {c.head}
          <br />
          <span className="ds-hl">{semi.isLive || semi.direction === "unknown" ? c.hl : c.hl.replace(/해요$/, "했어요")}</span>
        </>
      }
      explain={
        semi.direction === "unknown" ? (
          <>미국 반도체 ETF 시세를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</>
        ) : c.outlook ? (
          <>
            반도체 3배 ETF(SOXL)가 {formatPct(soxlPct)} 움직였어요. 삼성전자·SK하이닉스는 내일 아침{" "}
            <b className="text-text">{c.outlook}</b>이 있어요.
          </>
        ) : (
          <>반도체 3배 ETF(SOXL) 변화가 작아요({formatPct(soxlPct)}). 내일 아침 반도체 쪽 큰 방향 신호는 없어요.</>
        )
      }
      more={{
        summary: "조금 더 — 이 신호는 어떻게 만드나요?",
        content: (
          <>
            SOXL(미국 반도체 3배 ETF) 등락을 3으로 나눠 반도체지수 변화를 추정해요. 추정치가 0.4% 넘게 빠지거나
            오르면 약세·강세, 1.5%를 넘으면 강한 신호로 표시해요. 방향을 맞히는 예측이 아니라 밤사이 분위기
            요약이에요.
            {semi.nvda && <> 참고로 엔비디아는 {formatPct(semi.nvda.changePct)}예요.</>}
            {asOf && (
              <>
                {" "}
                (미국 시세 기준: {asOf} KST{semi.isLive ? ", 미국 정규장 거래 중" : ""})
              </>
            )}
          </>
        ),
      }}
    >
      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatTile
          label="SOXL (반도체 3배)"
          value={formatPct(soxlPct)}
          valueClass={changeTextClass(soxlPct)}
          sub={
            semi.impliedSemiPct != null ? (
              <>
                반도체지수 환산 <b className={changeTextClass(semi.impliedSemiPct)}>{formatPct(semi.impliedSemiPct)}</b>
              </>
            ) : (
              "—"
            )
          }
        />
        <StatTile
          label="원·달러 환율"
          value={fxRate > 0 ? `₩${fxRate.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}` : "—"}
          sub={
            <>
              <b className={changeTextClass(fxChange)}>{formatPct(fxChange)}</b> · 업비트 USDT 24시간
            </>
          }
        />
      </div>
    </StatusCard>
  );
}

/** 한국 주식 행 보조 설명 — 실데이터만: ADR 괴리율 / 외국인 5일 순매수(data/trading_flow) / 시장 상태 */
function koreaSub(row: PriceRow): React.ReactNode {
  const m = row.market;
  if (row.is_adr && m?.adr_premium_pct != null) {
    const p = m.adr_premium_pct;
    return (
      <>
        <span className={`font-bold ${Math.abs(p) >= 5 ? "text-warn" : "text-flat"}`}>
          본주 대비 {p > 0 ? "+" : p < 0 ? "−" : ""}
          {Math.abs(p).toFixed(1)}%
        </span>
        <span> · 미국 ADR</span>
      </>
    );
  }
  const phase = m?.market_phase === "live" ? "정규장" : m?.market_phase === "nxt" ? "NXT 시간외" : "24시간 참조가";
  const flow = getTradingFlow(row.slug);
  if (flow) {
    const w = flow.cumulative_5d.foreign_won;
    const { display, sign } = formatBigKRW(w);
    return (
      <>
        <span className={`font-bold ${changeTextClass(w)}`}>
          외국인 5일 {sign}
          {display}
        </span>
        <span> · {phase}</span>
      </>
    );
  }
  return phase;
}

export default async function Home() {
  const [data, semiSignal, people, deals] = await Promise.all([
    fetchAllPrices(),
    fetchSemiSignal(),
    getHumanIndicators(),
    fetchDealsPreview(3),
  ]);

  // is_fx(원화 환율)는 헤더 환율 위젯과 소스가 달라(HL perp vs 업비트) 숫자가 어긋나 보임 → 리스트 제외
  const koreaRows = data.symbols.filter((r) => r.category === "korea" && !r.is_fx);
  const sparks = await Promise.all(koreaRows.map((r) => fetchSparkCloses(r)));

  // 나머지 카테고리 순서 (형님 명시): 비상장 → 미국주식 → ETF(테마) → 글로벌 지수
  const order: SymbolMeta["category"][] = ["private", "us", "themes", "global"];
  const grouped = order
    .map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      rows: data.symbols.filter((r) => r.category === cat && !r.is_fx),
    }))
    // 카테고리 전멸 시 빈 섹션 방지
    .filter((g) => g.rows.length > 0);
  const restCount = grouped.reduce((n, g) => n + g.rows.length, 0);

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} asOf={data.fetched_at} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <h1 className="ds-meta mb-3">
          24시간 글로벌 자산 시세 · 한국 정규장 휴장에도 끊기지 않는 실시간 가격 · 비상장 빅테크(SpaceX·OpenAI·Anthropic) 포함
        </h1>

        {/* ① 상태 카드 — 미장 반도체 야간 신호 + 환율 (실데이터만) */}
        <TomorrowStatusCard semi={semiSignal} fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

        {/* ② 한국 주식 — 1줄 = 1종목 */}
        {koreaRows.length > 0 && (
          <section className="ds-card mt-4" style={{ padding: "8px 20px" }} aria-labelledby="kr-stocks-h">
            <div className="flex items-center justify-between gap-3 pt-3 pb-1">
              <h2 id="kr-stocks-h" className="text-[17px] font-extrabold">
                한국 주식
              </h2>
              <span className="ds-meta truncate">선 = 최근 24시간</span>
            </div>
            <div>
              {koreaRows.map((row, i) => (
                <StockRow key={row.slug} row={row} sub={koreaSub(row)} spark={sparks[i]} />
              ))}
            </div>
            <a href="#markets" className="flex items-center justify-center min-h-[48px] text-[15px] font-bold text-down border-t border-line">
              미국·비상장 {restCount}종목 전체 보기 →
            </a>
          </section>
        )}

        {/* ③ 광고 — 섹션 경계, 첫 화면 밖, 투표 버튼과 32px+ 분리. 모바일 페이지당 1개. AdFit 유닛 ID 유지 */}
        <AdSlot
          adsenseSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
          adfitMobile={{ unit: "DAN-sRrDqAryVxJFyyGr", width: 320, height: 50 }}
          adfitDesktop={{ unit: "DAN-1gxi6c73rjhTXT18", width: 728, height: 90 }}
        />

        {/* ④ 인간지표 — 내일 상승/하락 투표 (NXT 프리장 오픈 전 마감). 지난 결과 → /poll
            ⚠ pollId / question 은 scripts/update-poll.mjs 가 정규식으로 매일 교체 — 속성 형태 유지 */}
        <PollWidget
          pollId="market-updown-2026-09-30"
          title="인간지표 · 재미로 보는 군중 예측"
          question="9/30(수) 한국 증시, 오를까요 내릴까요?"
          yesLabel="▲ 오른다"
          noLabel="▼ 내린다"
          historyHref="/poll"
        />

        {/* ⑤ 인물 지표(번외) — 얇은 카드, 상세는 /poll */}
        {people.length > 0 && (
          <section className="mb-6" aria-labelledby="people-h">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h2 id="people-h" className="text-[17px] font-extrabold">
                인물 지표 <span className="ds-meta font-medium">역발상 참고용</span>
              </h2>
              <Link href="/poll" prefetch={false} className="text-[13px] font-bold text-text-muted hover:text-text shrink-0">
                더보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {people.map((p) => (
                <PersonCardCompact key={p.id} person={p} />
              ))}
            </div>
          </section>
        )}

        {/* ⑥ 한국주식 종합 분석 (기존 컴포넌트 유지) */}
        <HomeHero rows={data.symbols} locale="ko" />

        {/* ⑦ 핫딜 미리보기 — 실데이터(/shopping 과 같은 소스). 항목은 /shopping 으로만 이동(외부·제휴 링크 X) */}
        {deals.length > 0 && (
          <section className="ds-card mb-8" style={{ padding: "8px 20px" }} aria-labelledby="deals-h">
            <div className="flex items-center justify-between pt-3 pb-1">
              <h2 id="deals-h" className="text-[17px] font-extrabold">
                오늘의 핫딜
              </h2>
              <span className="ds-meta">줍줍쇼핑</span>
            </div>
            {deals.map((d) => (
              <Link key={d.id} href="/shopping" prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
                <div className="flex-1 min-w-0">
                  <div className="font-sys text-[15px] font-semibold truncate text-text">{d.product}</div>
                  <div className="text-[12px] truncate mt-[2px] text-text-dim">
                    {d.lowest60 ? <span className="font-bold text-up">최근 2개월 최저가 · </span> : null}
                    {d.store}
                  </div>
                </div>
                <div className="text-right flex-none max-w-[45%]">
                  <div className="num text-[15px] font-bold text-text truncate">{d.price}</div>
                  {d.discountPct != null && d.discountPct > 0 && (
                    <div className="num text-[13px] font-bold text-up">−{d.discountPct}%</div>
                  )}
                </div>
              </Link>
            ))}
            <Link
              href="/shopping"
              prefetch={false}
              className="flex items-center justify-center min-h-[48px] text-[15px] font-bold text-down border-t border-line"
            >
              핫딜 전체 보기 →
            </Link>
          </section>
        )}

        {/* ⑧ 미국·비상장·ETF·글로벌 — 1줄 = 1종목 */}
        <div id="markets" className="scroll-mt-20">
          {grouped.map(({ cat, label, rows }) => (
            <section key={cat} className="ds-card mb-4" style={{ padding: "8px 20px" }} aria-labelledby={`cat-${cat}`}>
              <div className="flex items-center justify-between pt-3 pb-1">
                <h2 id={`cat-${cat}`} className="text-[17px] font-extrabold">
                  {label.ko}
                </h2>
                <span className="ds-meta">{rows.length}종목</span>
              </div>
              {rows.map((row) => (
                <StockRow key={row.slug} row={row} />
              ))}
            </section>
          ))}
        </div>

        <AffiliateStrip />
      </main>

      <Footer />
    </>
  );
}
