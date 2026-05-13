import Link from "next/link";
import type { ConsensusData } from "@/lib/consensus";

// 종목 상세 페이지용 컴팩트 분석 섹션
// /consensus 전체 페이지와 다르게 "이 종목 1개" + 핵심 4 카드 + 자세히 보기 링크

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "증권사 목표주가 분석",
    source: "네이버 금융 리서치",
    brokers: "증권사",
    units: "개",
    avgTarget: "평균 목표가",
    upside: "상승여력",
    upsideRef: "증권사 평균 대비", // 첫 방문자가 "뭘 기준으로?" 헷갈리지 않게 명시
    upsideBreakdown: "현재", // "현재 ₩X → 평균 ₩Y" breakdown
    upsideArrow: "→",
    median: "중앙값",
    max: "최고",
    min: "최저",
    seeAll: "전체 분석 보기 (증권사별 목표가 + 분포)",
    rangeFrom: "범위",
    sourceFooter: "출처: 네이버 금융 리서치 (한국 13~14개 증권사 평균 목표주가)",
    disclaimer: "본 정보는 단순 참고용이며 투자 권유가 아닙니다.",
  },
  en: {
    title: "Korean Broker Consensus",
    source: "Naver Finance Research",
    brokers: "brokers",
    units: "",
    avgTarget: "Avg target",
    upside: "Upside",
    upsideRef: "vs avg broker target",
    upsideBreakdown: "Now",
    upsideArrow: "→",
    median: "Median",
    max: "High",
    min: "Low",
    seeAll: "View full consensus (broker-level targets & distribution)",
    rangeFrom: "Range",
    sourceFooter: "Source: Naver Finance Research (13–14 Korean broker avg targets)",
    disclaimer: "For informational purposes only. Not investment advice.",
  },
} as const;

function fmtKRW(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function ConsensusSection({
  data,
  locale = "ko",
}: {
  data: ConsensusData;
  locale?: Locale;
}) {
  const c = data.consensus;
  const t = I18N[locale];

  // upside는 부모에서 enrich되어 들어옴 — 없으면 null
  const upside = c.upside_pct;
  const upsideColor =
    upside == null
      ? "text-text-muted"
      : upside > 0
      ? "text-accent-green"
      : upside < 0
      ? "text-accent-blue"
      : "text-text-muted";

  const consensusHref = locale === "en" ? "/en/consensus" : "/consensus";

  return (
    <section className="mb-6 p-5 rounded-2xl bg-accent-purple/5 border border-accent-purple/20">
      {/* 헤더 — 출처 + 증권사 개수 */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="text-xs text-text-dim">
          {t.title} ·{" "}
          <span className="text-text-muted">
            {c.broker_count}{locale === "ko" ? t.units : ""} {t.brokers}
          </span>
        </div>
        <div className="text-[10px] text-text-dim shrink-0">
          {t.source}
        </div>
      </div>

      {/* 메인: 평균 목표가 + 상승여력 */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="text-xs text-text-dim mb-1">{t.avgTarget}</div>
          <div className="text-3xl md:text-4xl font-bold tabular text-accent-purple">
            ₩{fmtKRW(c.avg_target_krw)}
          </div>
          <div className="text-[11px] text-text-dim tabular mt-1">
            {t.rangeFrom}: ₩{fmtKRW(c.min_target_krw)} ~ ₩{fmtKRW(c.max_target_krw)}
          </div>
        </div>

        {upside != null && c.current_price_krw != null && (
          <div className="text-right">
            {/* 라벨 — "상승여력" 큰 글자 + "(증권사 평균 대비)" 작은 sub 한 줄에 배치
                형님 지적: 첫 방문자가 "뭘 기준으로?" 헷갈리지 않게 reference 명시 */}
            <div className="text-xs text-text-dim mb-1">
              {t.upside}
              <span className="ml-1 text-[10px] opacity-80">({t.upsideRef})</span>
            </div>
            <div className={`text-3xl md:text-4xl font-bold tabular ${upsideColor}`}>
              {upside > 0 ? "▲ +" : upside < 0 ? "▼ " : ""}
              {Math.abs(upside).toFixed(2)}%
            </div>
            {/* 명시적 breakdown — "현재 ₩X → 평균 ₩Y" 양쪽 가격 노출 */}
            <div className="text-[11px] text-text-dim tabular mt-1 whitespace-nowrap">
              {t.upsideBreakdown} ₩{fmtKRW(Math.round(c.current_price_krw))}
              {" "}{t.upsideArrow}{" "}
              ₩{fmtKRW(c.avg_target_krw)}
            </div>
          </div>
        )}
      </div>

      {/* 미니 카드 3개: 중앙값 / 최고 / 최저 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-bg-card/70 border border-line rounded-lg p-2.5">
          <div className="text-[10px] text-text-dim">{t.median}</div>
          <div className="text-sm font-bold tabular text-text mt-0.5">
            ₩{fmtKRW(c.median_target_krw)}
          </div>
        </div>
        <div className="bg-bg-card/70 border border-line rounded-lg p-2.5">
          <div className="text-[10px] text-text-dim">{t.max}</div>
          <div className="text-sm font-bold tabular text-accent-green mt-0.5">
            ₩{fmtKRW(c.max_target_krw)}
          </div>
          <div className="text-[9px] text-text-dim truncate mt-0.5">
            {c.max_broker}
          </div>
        </div>
        <div className="bg-bg-card/70 border border-line rounded-lg p-2.5">
          <div className="text-[10px] text-text-dim">{t.min}</div>
          <div className="text-sm font-bold tabular text-accent-blue mt-0.5">
            ₩{fmtKRW(c.min_target_krw)}
          </div>
          <div className="text-[9px] text-text-dim truncate mt-0.5">
            {c.min_broker}
          </div>
        </div>
      </div>

      {/* 자세히 보기 + 출처 + disclaimer */}
      <Link
        href={consensusHref as any}
        className="block text-[11px] text-accent-blue hover:underline mb-2"
      >
        → {t.seeAll}
      </Link>
      <p className="text-[10px] text-text-dim/80 leading-relaxed mb-1">{t.sourceFooter}</p>
      <p className="text-[10px] text-text-dim leading-relaxed">{t.disclaimer}</p>
    </section>
  );
}
