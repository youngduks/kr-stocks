import Link from "next/link";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    dataSources: "데이터 출처",
    pricesLabel: "가격",
    fxLabel: "KRW 환율",
    refresh: "업데이트 주기: 30초",
    analysisGuide: "분석 · 가이드",
    consensusTitle: "증권사 목표주가 분석",
    consensusDesc:
      "삼성전자 · SK하이닉스 · 현대차 13~14개 증권사 평균 목표가 + 상승여력",
    guideTitle: "한국에서 Hyperliquid 거래하는 법",
    guideDesc: "비상장 빅테크 + 한국주식 야간 perp 단계별 안내",
    adTitle: "광고 · 제휴 문의",
    adAffiliate: "배너 · 네이티브 · 증권사/거래소 affiliate 제휴 환영",
    adResponse: "응답: 평일 24h 이내",
    disclaimer: "면책 (Disclaimer)",
    disclaimerBody:
      "본 서비스는 정보 제공만을 목적으로 하며, 투자 권유·자문·예측이 아닙니다. 표시 가격은 perp DEX 시세로 정규장 거래소 가격과 차이가 있을 수 있습니다. 비상장 회사 가격은 implied valuation 기반의 추정치입니다.",
    copyrightSuffix: "Not investment advice.",
    consensusHref: "/consensus",
    guideHref: "/guide/hyperliquid-onramp",
    mailtoSubject: "[광고문의] kr-stocks.com",
    mailtoBody:
      "■ 업체명:\n■ 담당자:\n■ 상품/서비스:\n■ 희망 지면/기간:\n■ 예산:\n■ 문의내용:\n",
  },
  en: {
    dataSources: "Data Sources",
    pricesLabel: "Prices",
    fxLabel: "KRW FX",
    refresh: "Refresh: every 30 seconds",
    analysisGuide: "Analysis · Guide",
    consensusTitle: "Korean Broker Consensus",
    consensusDesc:
      "Samsung · SK Hynix · Hyundai — 13~14 Korean broker avg target & upside",
    guideTitle: "How to trade Hyperliquid from Korea",
    guideDesc:
      "Step-by-step onramp for private big tech + Korean stock overnight perps",
    adTitle: "Advertising · Partnerships",
    adAffiliate: "Banner · native · broker/exchange affiliate welcome",
    adResponse: "Response: within 24h on weekdays",
    disclaimer: "Disclaimer",
    disclaimerBody:
      "This service is for informational purposes only and is not investment advice or solicitation. Prices shown are perp DEX quotes and may diverge from regular-session exchange prices. Private company prices are implied-valuation estimates.",
    copyrightSuffix: "Not investment advice.",
    consensusHref: "/en/consensus",
    guideHref: "/en/guide/hyperliquid-onramp",
    mailtoSubject: "[Ad Inquiry] kr-stocks.com",
    mailtoBody:
      "■ Company:\n■ Contact:\n■ Product/Service:\n■ Desired placement/period:\n■ Budget:\n■ Message:\n",
  },
} as const;

export function Footer({ locale = "ko" }: { locale?: Locale } = {}) {
  const t = I18N[locale];
  const mailtoHref = `mailto:contact@kr-stocks.com?subject=${encodeURIComponent(
    t.mailtoSubject
  )}&body=${encodeURIComponent(t.mailtoBody)}`;

  return (
    <footer className="border-t border-line mt-12">
      <div className="max-w-6xl mx-auto px-5 py-8 text-xs text-text-dim leading-6">
        <div className="mb-3 text-text-muted font-semibold">{t.dataSources}</div>
        <ul className="space-y-1 mb-6">
          <li>
            • {t.pricesLabel}:{" "}
            <a
              href="https://hyperliquid.xyz"
              className="text-accent-blue hover:underline"
              target="_blank"
              rel="noopener"
            >
              Hyperliquid HIP-3 (xyz, vntl) DEX perp
            </a>
          </li>
          <li>
            • {t.fxLabel}:{" "}
            <a
              href="https://upbit.com"
              className="text-accent-blue hover:underline"
              target="_blank"
              rel="noopener"
            >
              Upbit KRW/USDT spot
            </a>
          </li>
          <li>• {t.refresh}</li>
        </ul>

        <div className="mb-3 text-text-muted font-semibold">{t.analysisGuide}</div>
        <ul className="space-y-1 mb-6">
          <li>
            •{" "}
            <Link
              href={t.consensusHref as any}
              className="text-accent-blue hover:underline"
            >
              {t.consensusTitle}
            </Link>{" "}
            — {t.consensusDesc}
          </li>
          <li>
            •{" "}
            <Link
              href={t.guideHref as any}
              className="text-accent-blue hover:underline"
            >
              {t.guideTitle}
            </Link>{" "}
            — {t.guideDesc}
          </li>
        </ul>

        <div className="mb-3 text-text-muted font-semibold">{t.adTitle}</div>
        <ul className="space-y-1 mb-6">
          <li>
            •{" "}
            <a
              href={mailtoHref}
              className="text-accent-blue hover:underline"
            >
              contact@kr-stocks.com
            </a>
          </li>
          <li>• {t.adAffiliate}</li>
          <li>• {t.adResponse}</li>
        </ul>

        <div className="mb-3 text-text-muted font-semibold">{t.disclaimer}</div>
        <p className="mb-3">{t.disclaimerBody}</p>
        <p className="text-text-dim">© 2026 KR Stocks. {t.copyrightSuffix}</p>
      </div>
    </footer>
  );
}
