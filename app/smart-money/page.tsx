// 고수 지갑 vs 손실 지갑 (/smart-money) — 하이퍼리퀴드에서 누적으로 크게 번 지갑과 크게 잃은 지갑이
// 지금 코인별로 롱·숏 어느 쪽에 있는지 비교. 데이터: data/smart_money/latest.json
// (scripts/update-smart-money.mjs — 하이퍼리퀴드 공개 리더보드 + 지갑별 포지션 자체 집계).
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { AsOf } from "@/components/ui/AsOf";
import { MoreDetails } from "@/components/ui/MoreDetails";
import { fetchAllPrices } from "@/lib/fetchPrices";
import {
  getSmartMoney,
  stanceOf,
  fmtUsdShort,
  STRONG,
  MIN_WALLETS,
  type SmartMoneyCoin,
  type SmartMoneySide,
  type Stance,
} from "@/lib/smartMoney";

export const revalidate = 600;

const URL = "https://kr-stocks.com/smart-money";
const TITLE = "고수 지갑 vs 손실 지갑 — 하이퍼리퀴드 코인별 롱·숏 비교";
const DESC =
  "하이퍼리퀴드에서 누적으로 크게 번 지갑(고수 지갑)과 크게 잃은 지갑(손실 지갑)이 지금 비트코인·이더리움·솔라나·HYPE 등 코인별로 롱·숏 어디에 있는지 공개 데이터로 직접 집계했어요. 지갑 수 기준·금액 기준 롱 비율과 24시간 변화.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["하이퍼리퀴드", "고래 지갑", "스마트 머니", "롱숏 비율", "비트코인 롱숏", "고수 포지션", "Hyperliquid"],
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const SUMMARY_COINS = ["BTC", "ETH", "SOL", "HYPE"];
/** 한 지갑이 금액의 이 비율 이상이면 금액 비율 옆에 표시 */
const WHALE_SHARE = 50;

const STANCE_COPY: Record<Exclude<Stance, null>, { label: string; pill: string; row: string }> = {
  "split-smart-short": { label: "엇갈림 · 고수 숏 / 손실 롱", pill: "ds-pill-warn", row: "bg-warn-bg" },
  "split-smart-long": { label: "엇갈림 · 고수 롱 / 손실 숏", pill: "ds-pill-warn", row: "bg-warn-bg" },
  "both-long": { label: "둘 다 롱", pill: "ds-pill-up", row: "bg-up-bg" },
  "both-short": { label: "둘 다 숏", pill: "ds-pill-down", row: "bg-down-bg" },
};

function pctClass(v: number | null): string {
  if (v == null) return "text-text-dim";
  if (v >= 60) return "text-up";
  if (v <= 40) return "text-down";
  return "text-text";
}

function fmtPct0(v: number | null): string {
  return v == null ? "—" : `${Math.round(v)}%`;
}

function fmtPp(v: number | null | undefined): string {
  if (v == null) return "—";
  const r = Math.round(v);
  if (r === 0) return "0";
  return r > 0 ? `+${r}` : `−${Math.abs(r)}`;
}

function ppClass(v: number | null | undefined): string {
  if (v == null || Math.round(v) === 0) return "text-text-dim";
  return v > 0 ? "text-up" : "text-down";
}

/** 롱(빨강)·숏(파랑) 비율 막대 */
function LongBar({ pct }: { pct: number | null }) {
  if (pct == null) return <div className="h-2 rounded-full bg-line" aria-hidden="true" />;
  return (
    <div className="h-2 rounded-full overflow-hidden flex bg-down" aria-hidden="true">
      <div className="bg-up h-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

function walletsOf(s: SmartMoneySide) {
  return s.longWallets + s.shortWallets;
}

function SideBlock({ name, s, pp }: { name: string; s: SmartMoneySide; pp: number | null | undefined }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-text-muted">{name}</span>
        <span className="ds-meta num">{walletsOf(s).toLocaleString("ko-KR")}개</span>
      </div>
      <div className={`num text-[22px] leading-tight font-extrabold mt-0.5 ${pctClass(s.walletLongPct)}`}>
        롱 {fmtPct0(s.walletLongPct)}
      </div>
      <LongBar pct={s.walletLongPct} />
      <div className="ds-meta mt-1 num">
        금액 롱 <b className={pctClass(s.usdLongPct)}>{fmtPct0(s.usdLongPct)}</b>
        {s.topWalletSharePct != null && s.topWalletSharePct >= WHALE_SHARE && <span title="한 지갑이 금액의 절반 이상"> *</span>}
        {" · "}24h <b className={ppClass(pp)}>{fmtPp(pp)}</b>
      </div>
    </div>
  );
}

function SummaryCard({ c }: { c: SmartMoneyCoin }) {
  const st = stanceOf(c);
  const copy = st ? STANCE_COPY[st] : null;
  return (
    <div className="ds-tile min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[17px] font-extrabold">{c.coin}</span>
        {copy ? (
          <span className={`ds-pill ${copy.pill}`} style={{ padding: "2px 8px", whiteSpace: "normal" }}>
            {copy.label}
          </span>
        ) : (
          <span className="ds-meta">{fmtUsdShort(c.totalUsd)}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <SideBlock name="고수 지갑" s={c.smart} pp={c.change24h?.smartWalletLongPct} />
        <SideBlock name="손실 지갑" s={c.losing} pp={c.change24h?.losingWalletLongPct} />
      </div>
    </div>
  );
}

function Cell({ s, pp }: { s: SmartMoneySide; pp: number | null | undefined }) {
  const whale = s.topWalletSharePct != null && s.topWalletSharePct >= WHALE_SHARE;
  return (
    <>
      <td className={`px-2 py-2 text-right num font-bold ${pctClass(s.walletLongPct)}`}>{fmtPct0(s.walletLongPct)}</td>
      <td className={`px-2 py-2 text-right num ${pctClass(s.usdLongPct)}`}>
        {fmtPct0(s.usdLongPct)}
        {whale && <span className="text-text-dim">*</span>}
      </td>
      <td className="px-2 py-2 text-right num text-text-muted">{walletsOf(s).toLocaleString("ko-KR")}</td>
      <td className={`px-2 py-2 text-right num ${ppClass(pp)}`}>{fmtPp(pp)}</td>
    </>
  );
}

/** 데스크톱 표 — 두 묶음 나란히 */
function WideTable({ coins }: { coins: SmartMoneyCoin[] }) {
  return (
    <div className="hidden sm:block ds-card overflow-x-auto" style={{ padding: "8px 12px" }}>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-text-muted text-[12px]">
            <th rowSpan={2} className="px-2 py-2 text-left align-bottom">코인</th>
            <th colSpan={4} className="px-2 pt-2 text-center border-b border-line">고수 지갑</th>
            <th colSpan={4} className="px-2 pt-2 text-center border-b border-line">손실 지갑</th>
          </tr>
          <tr className="text-text-dim text-[12px]">
            {[0, 1].map((k) => (
              <SubHead key={k} />
            ))}
          </tr>
        </thead>
        <tbody>
          {coins.map((c) => {
            const st = stanceOf(c);
            const copy = st ? STANCE_COPY[st] : null;
            return (
              <tr key={c.coin} className={`border-t border-line ${copy ? copy.row : ""}`}>
                <td className="px-2 py-2">
                  <div className="font-bold">{c.coin}</div>
                  {copy && <div className="text-[11px] font-bold text-text-muted whitespace-nowrap">{copy.label}</div>}
                </td>
                <Cell s={c.smart} pp={c.change24h?.smartWalletLongPct} />
                <Cell s={c.losing} pp={c.change24h?.losingWalletLongPct} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubHead() {
  return (
    <>
      <th className="px-2 py-1 text-right font-semibold whitespace-nowrap">지갑 롱%</th>
      <th className="px-2 py-1 text-right font-semibold whitespace-nowrap">금액 롱%</th>
      <th className="px-2 py-1 text-right font-semibold whitespace-nowrap">지갑 수</th>
      <th className="px-2 py-1 text-right font-semibold whitespace-nowrap">24h</th>
    </>
  );
}

/** 모바일 표 — 코인마다 두 줄(고수/손실) */
function NarrowTable({ coins }: { coins: SmartMoneyCoin[] }) {
  return (
    <div className="sm:hidden ds-card" style={{ padding: "4px 8px" }}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-text-dim text-[11px]">
            <th className="px-1.5 py-2 text-left font-semibold">코인</th>
            <th className="px-1.5 py-2 text-left font-semibold">묶음</th>
            <th className="px-1.5 py-2 text-right font-semibold">지갑 롱%</th>
            <th className="px-1.5 py-2 text-right font-semibold">금액 롱%</th>
            <th className="px-1.5 py-2 text-right font-semibold">지갑 수</th>
            <th className="px-1.5 py-2 text-right font-semibold">24h</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((c) => {
            const st = stanceOf(c);
            const copy = st ? STANCE_COPY[st] : null;
            const rows: [string, SmartMoneySide, number | null | undefined][] = [
              ["고수", c.smart, c.change24h?.smartWalletLongPct],
              ["손실", c.losing, c.change24h?.losingWalletLongPct],
            ];
            return rows.map(([name, s, pp], i) => (
              <tr key={`${c.coin}-${i}`} className={`${i === 0 ? "border-t border-line" : ""} ${copy ? copy.row : ""}`}>
                {i === 0 && (
                  <td rowSpan={2} className="px-1.5 py-1.5 align-middle">
                    <div className="font-bold">{c.coin}</div>
                    {copy && <div className="text-[10px] leading-tight font-bold text-text-muted">{copy.label.replace("엇갈림 · ", "")}</div>}
                  </td>
                )}
                <td className="px-1.5 py-1.5 text-text-muted whitespace-nowrap">{name}</td>
                <td className={`px-1.5 py-1.5 text-right num font-bold ${pctClass(s.walletLongPct)}`}>{fmtPct0(s.walletLongPct)}</td>
                <td className={`px-1.5 py-1.5 text-right num ${pctClass(s.usdLongPct)}`}>
                  {fmtPct0(s.usdLongPct)}
                  {s.topWalletSharePct != null && s.topWalletSharePct >= WHALE_SHARE && <span className="text-text-dim">*</span>}
                </td>
                <td className="px-1.5 py-1.5 text-right num text-text-muted">{walletsOf(s).toLocaleString("ko-KR")}</td>
                <td className={`px-1.5 py-1.5 text-right num ${ppClass(pp)}`}>{fmtPp(pp)}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function SmartMoneyPage() {
  const [prices, data] = await Promise.all([fetchAllPrices(), getSmartMoney()]);

  const coins = data?.coins ?? [];
  const summary = SUMMARY_COINS.map((s) => coins.find((c) => c.coin === s)).filter((c): c is SmartMoneyCoin => !!c);
  const flagged = coins.filter((c) => {
    const st = stanceOf(c);
    return st === "split-smart-short" || st === "split-smart-long";
  });

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="하이퍼리퀴드 공개 데이터 · 자체 집계" title="고수 지갑 vs 손실 지갑" backHref="/signals" backLabel="신호로">
          {data && <AsOf at={data.updatedAtMs} note="약 30분마다 갱신" />}
        </PageTitle>

        {!data ? (
          <section className="ds-card mt-4">
            <div className="ds-eyebrow">고수 지갑과 손실 지갑은 지금 어느 쪽?</div>
            <h2 className="ds-status mt-2">집계 데이터를 아직 못 받았어요</h2>
            <p className="ds-explain mt-2">잠시 후 다시 확인해 주세요.</p>
          </section>
        ) : (
          <article className="mt-4 space-y-4">
            {/* ① 요약 — 주요 4개 코인 */}
            <section className="ds-card">
              <div className="ds-eyebrow">
                고수 지갑 {data.groups.smart.swept.toLocaleString("ko-KR")}개 · 손실 지갑 {data.groups.losing.swept.toLocaleString("ko-KR")}개의 지금 포지션
              </div>
              <h2 className="ds-status mt-2">
                {flagged.length > 0 ? (
                  <>
                    두 묶음이 <span className="ds-hl">크게 엇갈린 코인 {flagged.length}개</span>
                  </>
                ) : (
                  <>지금은 크게 엇갈린 코인이 없어요</>
                )}
              </h2>
              <p className="ds-explain mt-2">
                누적으로 <b className="text-text">$20만 이상 번 지갑</b>과 <b className="text-text">$10만~$100만 잃은 지갑</b>이 코인별로 롱·숏 어느
                쪽에 있는지 모았어요. 큰 숫자는 <b className="text-text">지갑 수 기준 롱 비율</b>이에요.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {summary.map((c) => (
                  <SummaryCard key={c.coin} c={c} />
                ))}
              </div>
              <div className="ds-meta mt-2">
                빨강 = 롱 우세 · 파랑 = 숏 우세 · 24h = 지갑 롱 비율 24시간 변화(%p)
                {data.change24hBase == null && " — 기록이 하루치 쌓이면 보여요"}
              </div>
            </section>

            {/* ② 코인별 표 */}
            <section aria-labelledby="sm-table-h">
              <h2 id="sm-table-h" className="ds-h2 mb-1 mt-6">
                코인별 비교 (포지션 금액 상위 {coins.length}개)
              </h2>
              <p className="ds-meta mb-3">
                색칠된 줄 — 노랑: 한쪽 롱 {STRONG}% 이상인데 다른 쪽 숏 {STRONG}% 이상(엇갈림) · 빨강: 둘 다 롱 {STRONG}% 이상 · 파랑: 둘 다 숏{" "}
                {STRONG}% 이상 (양쪽 모두 지갑 {MIN_WALLETS}개 이상일 때만) · * 한 지갑이 금액의 절반 이상
              </p>
              <WideTable coins={coins} />
              <NarrowTable coins={coins} />
            </section>

            {/* ③ 정의·주의 */}
            <h2 className="ds-h2 mt-6">이 숫자 읽는 법</h2>
            <section className="ds-card" style={{ paddingTop: 4, paddingBottom: 4 }} aria-label="정의와 주의">
              <MoreDetails summary="고수 지갑·손실 지갑은 어떻게 골랐나요?" className="!mt-0 !border-t-0">
                하이퍼리퀴드 공개 리더보드의 누적 손익(전체 기간)과 계좌 평가액으로 저희가 직접 골라요.{" "}
                <b className="text-text">고수 지갑</b> = 누적 손익 +$20만 이상, <b className="text-text">손실 지갑</b> = 누적 손익 −$10만 ~ −$100만.
                둘 다 계좌 평가액 $2천 이상만 넣고, 여러 사람 돈을 맡아 굴리는 vault 지갑은 공개 vault 목록으로 뺐어요. 이번 집계 대상은 고수{" "}
                {data.groups.smart.eligible.toLocaleString("ko-KR")}개(vault {data.groups.smart.vaultExcluded}개 제외), 손실{" "}
                {data.groups.losing.eligible.toLocaleString("ko-KR")}개(vault {data.groups.losing.vaultExcluded}개 제외)예요.
              </MoreDetails>
              <MoreDetails summary="지갑 수 기준과 금액 기준은 뭐가 달라요?" className="!mt-0">
                <b className="text-text">지갑 수 기준</b>은 그 코인 포지션을 가진 지갑 중 롱인 지갑의 비율이에요(한 지갑 = 한 표).{" "}
                <b className="text-text">금액 기준</b>은 포지션 평가액으로 잰 롱 비율이라 큰손 몇 명이 비율을 거의 정할 수 있어요. 표에서 *가 붙은
                칸은 한 지갑이 그 묶음 금액의 절반 이상을 차지한다는 뜻이에요. 두 기준이 다르면 지갑 수 기준을 먼저 보세요.
              </MoreDetails>
              <MoreDetails summary="어떤 포지션이 들어가나요?" className="!mt-0">
                하이퍼리퀴드 기본 무기한 선물 포지션만 세요(현물·별도 상장 시장 제외). 헤지·차익거래용 포지션도 구분 없이 들어가요. 포지션은
                집계하는 순간의 모습이라 몇 분 뒤 바뀔 수 있고, 집계 하나에 15분 가까이 걸려 지갑마다 조회 시각이 조금씩 달라요.
              </MoreDetails>
              <MoreDetails summary="이걸로 매매해도 되나요?" className="!mt-0">
                아니요. 과거에 많이 번 지갑이 앞으로도 맞힌다는 보장은 없고, 손실 지갑의 반대가 정답이라는 근거도 아직 검증하지 않았어요. 참고
                지표로만 봐 주세요.
              </MoreDetails>
            </section>

            <Link href="/liquidation" prefetch={false} className="inline-block ds-meta underline hover:text-text-muted">
              청산맵 · 체결강도도 같이 보기 →
            </Link>
          </article>
        )}

        <p className="ds-meta pt-6">
          참고 지표이며 매매 신호가 아니에요. 하이퍼리퀴드 공개 데이터로 저희가 직접 집계했고, 금액 비율은 큰손 몇 명이 좌우할 수 있어요.
          투자 권유가 아니에요.
        </p>
      </main>
      <Footer />
    </>
  );
}
