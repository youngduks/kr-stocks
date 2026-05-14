// 가이드 — NXT 시간외 거래 완전 가이드
// long-tail SEO: "NXT 시간외" / "NXT 거래소" / "시간외 단일가" (5/14)

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "NXT 시간외 거래 완전 가이드 — 프리장·애프터장 시간 + 활용법",
  description:
    "NXT(Next Trade) 한국 대체거래소 시간외 거래 — 프리장 (08:00~08:50) + 애프터장 (15:30~20:00). " +
    "KRX 정규장과 차이 + retail 투자자가 활용하는 법.",
  keywords: [
    "NXT 시간외",
    "NXT 거래소",
    "NXT 시간외 단일가",
    "넥스트레이드",
    "한국 ATS",
    "시간외 거래",
    "프리장",
    "애프터장",
    "한국주식 시간외 가격",
  ],
  openGraph: {
    title: "NXT 시간외 거래 완전 가이드 — kr-stocks.com",
    description:
      "프리장 08:00~08:50 + 애프터장 15:30~20:00 NXT 거래소 시간외 거래 가이드.",
    url: "https://kr-stocks.com/guide/nxt-after-hours",
    type: "article",
  },
  alternates: {
    canonical: "https://kr-stocks.com/guide/nxt-after-hours",
  },
};

export default async function GuideNxtAfterHours() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4 space-y-6">
          <header className="mb-2">
            <div className="text-xs text-text-dim mb-2">📖 가이드 · 한국 ATS · NXT</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
              NXT 시간외 거래 완전 가이드
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              NXT(Next Trade) 한국 대체거래소 시간외 거래 시간 + KRX 정규장과 차이점 + retail 활용법.
            </p>
          </header>

          <section className="p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-lg font-bold mb-3">🏛️ NXT(Next Trade) 란?</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-2">
              <strong className="text-text">NXT(Next Trade)</strong>는 한국 대체거래소(ATS) 입니다.
              한국거래소(KRX) 외 추가로 운영되는 거래소로, 정규장 시간 외에도 한국주식 거래를 가능하게 합니다.
            </p>
            <ul className="space-y-1 text-sm text-text-muted leading-relaxed ml-4 list-disc">
              <li>금융위원회 인가 ATS</li>
              <li>증권사 HTS·MTS 에서 NXT 호가 / 체결 노출</li>
              <li>네이버 금융 · 다음 금융 등 portal 에서 NXT 가격 확인 가능</li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">⏰ NXT 운영 시간 (KST 기준)</h2>
            <div className="space-y-3 text-sm text-text-muted leading-relaxed">
              <div className="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30">
                <div className="font-semibold text-accent-amber mb-1">
                  🌅 프리장 — 08:00 ~ 08:50
                </div>
                <div className="text-xs">
                  KRX 정규장 시작 (09:00) 전 50분간 거래. 미국장 마감 직후 흐름 반영 → 정규장 시초가 단서.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30">
                <div className="font-semibold text-accent-amber mb-1">
                  🌙 애프터장 — 15:30 ~ 20:00
                </div>
                <div className="text-xs">
                  KRX 정규장 마감 (15:30) 후 4시간 30분 거래. 종가 발표 후 retail 매매·뉴스 반영.
                </div>
              </div>
              <div className="text-xs text-text-dim leading-relaxed mt-2">
                ※ NXT 정확한 호가 정책·매매 단위는 증권사·시기별 다를 수 있음. 거래 전 본인 증권사 HTS/MTS
                공지 확인 필수.
              </div>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-accent-green/5 border border-accent-green/20">
            <h2 className="text-lg font-bold mb-3">📊 KRX 정규장 vs NXT 시간외 차이</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-line/60 text-text-dim">
                    <th className="text-left py-2 pr-3 font-medium">항목</th>
                    <th className="text-left py-2 pr-3 font-medium">KRX 정규장</th>
                    <th className="text-left py-2 font-medium">NXT 시간외</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  <tr className="border-b border-line/30">
                    <td className="py-2 pr-3 font-semibold text-text">운영 시간</td>
                    <td className="py-2 pr-3">09:00~15:30</td>
                    <td className="py-2">08:00~08:50 + 15:30~20:00</td>
                  </tr>
                  <tr className="border-b border-line/30">
                    <td className="py-2 pr-3 font-semibold text-text">거래량</td>
                    <td className="py-2 pr-3">대량 (메인 시장)</td>
                    <td className="py-2">소량 (정규장의 일부)</td>
                  </tr>
                  <tr className="border-b border-line/30">
                    <td className="py-2 pr-3 font-semibold text-text">가격 결정</td>
                    <td className="py-2 pr-3">시초가·종가 단일가 + 접속매매</td>
                    <td className="py-2">호가 매칭 방식 (증권사별 정책)</td>
                  </tr>
                  <tr className="border-b border-line/30">
                    <td className="py-2 pr-3 font-semibold text-text">상한가·하한가</td>
                    <td className="py-2 pr-3">전일 종가 ±30%</td>
                    <td className="py-2">증권사·NXT 정책에 따름</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-text">활용 시점</td>
                    <td className="py-2 pr-3">주요 매매</td>
                    <td className="py-2">정규장 흐름 보강 · 시초가 단서</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">💡 retail 투자자 활용법</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed ml-4 list-disc">
              <li>
                <strong className="text-text">프리장 (08:00~08:50)</strong>: 미국장 마감 직후 흐름 반영 →
                정규장 시초가 prediction
              </li>
              <li>
                <strong className="text-text">애프터장 (15:30~20:00)</strong>: 정규장 종가 + 야간 뉴스
                반영. 다음 날 시초가 단서.
              </li>
              <li>
                <strong className="text-text">정규장 외 시간 매매 가능</strong> — 직장인·해외 거주자 친화
              </li>
              <li>
                <strong className="text-text">호가 분포 확인</strong> — 정규장 종가 ±X% 분포로 retail
                sentiment 추적
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-lg font-bold mb-3">⚠️ NXT 거래 시 주의사항</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">유동성 낮음</strong> — 정규장의 1~5% 수준 거래량. 슬리피지 위험.
              </li>
              <li>
                <strong className="text-text">호가 spread 큼</strong> — 매수·매도 호가 차이가 정규장보다 큼.
                지정가 권장.
              </li>
              <li>
                <strong className="text-text">증권사별 정책 차이</strong> — NXT 지원 여부·수수료·호가 단위
                증권사마다 다름.
              </li>
              <li>
                <strong className="text-text">변동성 ↑</strong> — 단일 매매에 가격 흔들림 큼.
              </li>
              <li>
                <strong className="text-text">정규장과 가격 괴리 가능</strong> — 정규장 시초가가 NXT 마감가와
                다를 수 있음.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-lg font-bold mb-3">🔍 kr-stocks.com 에서 NXT 가격 보기</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              본 사이트는 KRX 정규장 + <strong className="text-text">NXT 시간외</strong> + Hyperliquid 야간 가격을 자동
              전환해서 보여줍니다. NXT 운영 시간 (08:00~08:50, 15:30~20:00) 에 한국주식 페이지 들어가면 자동으로
              NXT phase 가격이 메인으로 노출.
            </p>
            <div className="space-y-2">
              <Link
                href="/korea/samsung"
                className="block p-3 rounded-xl bg-bg-card hover:bg-bg-hover border border-line transition"
              >
                <div className="text-sm font-semibold text-accent-blue">→ 삼성전자 NXT 가격 확인</div>
              </Link>
              <Link
                href="/korea/hynix"
                className="block p-3 rounded-xl bg-bg-card hover:bg-bg-hover border border-line transition"
              >
                <div className="text-sm font-semibold text-accent-blue">→ SK하이닉스 NXT 가격 확인</div>
              </Link>
              <Link
                href="/korea/hyundai"
                className="block p-3 rounded-xl bg-bg-card hover:bg-bg-hover border border-line transition"
              >
                <div className="text-sm font-semibold text-accent-blue">→ 현대차 NXT 가격 확인</div>
              </Link>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">📚 관련 가이드</h2>
            <div className="space-y-2">
              <Link
                href="/guide/korean-overnight-prices"
                className="block p-3 rounded-xl bg-accent-purple/5 hover:bg-accent-purple/10 border border-accent-purple/20 transition"
              >
                <div className="text-sm font-semibold text-accent-purple">
                  → 삼성전자 야간 가격 확인하는 법
                </div>
                <div className="text-xs text-text-dim mt-0.5">
                  정규장 + NXT + Hyperliquid 24시간 추적 완전 가이드
                </div>
              </Link>
              <Link
                href="/guide/hyperliquid-onramp"
                className="block p-3 rounded-xl bg-accent-purple/5 hover:bg-accent-purple/10 border border-accent-purple/20 transition"
              >
                <div className="text-sm font-semibold text-accent-purple">
                  → 한국에서 Hyperliquid 거래하는 법
                </div>
                <div className="text-xs text-text-dim mt-0.5">
                  비상장 빅테크 + 한국주식 야간 perp 단계별 안내
                </div>
              </Link>
              <Link
                href="/consensus"
                className="block p-3 rounded-xl bg-accent-purple/5 hover:bg-accent-purple/10 border border-accent-purple/20 transition"
              >
                <div className="text-sm font-semibold text-accent-purple">
                  → 증권사 컨센서스 분석
                </div>
                <div className="text-xs text-text-dim mt-0.5">
                  한국 13~14개 증권사 평균 목표주가 + 상승여력
                </div>
              </Link>
            </div>
          </section>

          <p className="text-[10px] text-text-dim leading-relaxed pt-4 border-t border-line/40">
            본 가이드는 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다. NXT 거래 정책·호가 단위·수수료는
            증권사마다 다르므로 거래 전 본인 증권사 공지 확인 필수.
          </p>
        </article>
      </main>

      <Footer />
    </>
  );
}
