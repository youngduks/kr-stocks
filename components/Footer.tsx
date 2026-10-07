import Link from "next/link";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    dataSources: "데이터 출처",
    pricesLabel: "가격",
    fxLabel: "KRW 환율",
    regularLabel: "정규장 가격",
    refresh: "갱신: 종목 페이지 약 30초 · 홈 약 2분 간격",
    analysisGuide: "분석 · 가이드",
    consensusTitle: "증권사 목표주가 분석",
    consensusDesc:
      "삼성전자 · SK하이닉스 · 현대차 증권사 평균 목표가 + 상승여력 (네이버 금융 리서치 기준)",
    newsTitle: "뉴스룸",
    newsDesc: "국제정세 · 삼성전자 · SK하이닉스 · 현대차 — 한경/머투/연합 RSS · 네이버 금융 공시 1시간마다 자동 수집",
    pollTitle: "인간지표 — 개미 투표 vs 실제 결과",
    pollDesc: "내일 상승/하락 집단예측 vs 실제 결과 · 적중률 공개",
    guideTitle: "한국에서 Hyperliquid 거래하는 법",
    guideDesc: "비상장 빅테크 + 한국주식 야간 perp 단계별 안내",
    guideBinanceTitle: "바이낸스에서 한국주식 거래하는 법",
    guideBinanceDesc: "삼성·SK하이닉스·현대차 24h 선물 — 가입부터 진입까지",
    adTitle: "광고 · 제휴 문의",
    adAffiliate: "배너 · 네이티브 · 증권사/거래소 affiliate 제휴 환영",
    adResponse: "응답: 평일 24h 이내",
    disclaimer: "면책 (Disclaimer)",
    disclaimerBody:
      "본 서비스는 정보 제공만을 목적으로 하며, 투자 권유·자문·예측이 아닙니다. 정규장이 닫힌 시간에 표시되는 가격은 무기한 선물(perp) 시세로 정규장 거래소 가격과 차이가 있을 수 있습니다. 비상장 회사 가격은 implied valuation 기반의 추정치입니다.",
    copyrightSuffix: "Not investment advice.",
    privacyLabel: "개인정보처리방침",
    aboutLabel: "데이터 원칙·이용법",
    consensusHref: "/consensus",
    newsHref: "/news",
    pollHref: "/poll",
    guideHref: "/guide/hyperliquid-onramp",
    guideBinanceHref: "/guide/binance-korea-stocks",
    privacyHref: "/privacy",
    mailtoSubject: "[광고문의] kr-stocks.com",
    mailtoBody:
      "■ 업체명:\n■ 담당자:\n■ 상품/서비스:\n■ 희망 지면/기간:\n■ 예산:\n■ 문의내용:\n",
  },
  en: {
    dataSources: "Data Sources",
    pricesLabel: "Prices",
    fxLabel: "KRW FX",
    regularLabel: "Regular-session prices",
    refresh: "Refresh: ~30s on symbol pages · ~2 min on home",
    analysisGuide: "Analysis · Guide",
    consensusTitle: "Korean Broker Consensus",
    consensusDesc:
      "Samsung · SK Hynix · Hyundai — avg Korean broker target & upside (Naver Finance Research)",
    newsTitle: "Newsroom",
    newsDesc: "Global politics · Samsung · SK Hynix · Hyundai — auto-aggregated hourly from KR media RSS and Naver Finance disclosures",
    pollTitle: "Sentiment — Crowd Vote vs Reality",
    pollDesc: "Retail up/down crowd prediction vs actual market result · hit-rate",
    guideTitle: "How to trade Hyperliquid from Korea",
    guideDesc:
      "Step-by-step onramp for private big tech + Korean stock overnight perps",
    guideBinanceTitle: "How to trade Korean stocks on Binance",
    guideBinanceDesc:
      "Samsung · SK Hynix · Hyundai 24h perps — signup to entry",
    adTitle: "Advertising · Partnerships",
    adAffiliate: "Banner · native · broker/exchange affiliate welcome",
    adResponse: "Response: within 24h on weekdays",
    disclaimer: "Disclaimer",
    disclaimerBody:
      "This service is for informational purposes only and is not investment advice or solicitation. Prices shown outside regular sessions are perpetual-futures quotes and may diverge from regular-session exchange prices. Private company prices are implied-valuation estimates.",
    copyrightSuffix: "Not investment advice.",
    privacyLabel: "Privacy Policy",
    aboutLabel: "Data principles (KR)",
    consensusHref: "/en/consensus",
    newsHref: "/news",
    pollHref: "/poll",
    guideHref: "/en/guide/hyperliquid-onramp",
    guideBinanceHref: "/en/guide/binance-korea-stocks",
    privacyHref: "/privacy",
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
      <div className="max-w-3xl mx-auto px-4 sm:px-5 py-8 text-xs text-text-dim leading-6">
        <div className="mb-3 text-text-muted font-semibold">{t.dataSources}</div>
        <ul className="space-y-1 mb-6">
          <li>
            • {t.pricesLabel}:{" "}
            <a
              href="https://www.binance.com"
              className="text-accent-blue hover:underline"
              target="_blank"
              rel="noopener"
            >
              Binance USDT-M perp
            </a>
            {" · "}
            <a
              href="https://hyperliquid.xyz"
              className="text-accent-blue hover:underline"
              target="_blank"
              rel="noopener"
            >
              Hyperliquid HIP-3 (xyz, vntl) DEX perp
            </a>
          </li>
          <li>• {t.regularLabel}: Naver Finance (KR) · Yahoo Finance (US)</li>
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
              prefetch={false}
              className="text-accent-blue hover:underline"
            >
              {t.consensusTitle}
            </Link>{" "}
            — {t.consensusDesc}
          </li>
          <li>
            •{" "}
            <Link
              href={t.newsHref as any}
              prefetch={false}
              className="text-accent-blue hover:underline"
            >
              {t.newsTitle}
            </Link>{" "}
            — {t.newsDesc}
          </li>
          <li>
            •{" "}
            <Link
              href={t.pollHref as any}
              prefetch={false}
              className="text-accent-blue hover:underline"
            >
              {t.pollTitle}
            </Link>{" "}
            — {t.pollDesc}
          </li>
          <li>
            •{" "}
            <Link
              href={t.guideBinanceHref as any}
              prefetch={false}
              className="text-accent-blue hover:underline"
            >
              {t.guideBinanceTitle}
            </Link>{" "}
            — {t.guideBinanceDesc}
          </li>
          <li>
            •{" "}
            <Link
              href={t.guideHref as any}
              prefetch={false}
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
        <p className="text-text-dim">
          © 2026 KR Stocks. {t.copyrightSuffix}{" "}
          <Link href={t.privacyHref as any} prefetch={false} className="text-accent-blue hover:underline">
            {t.privacyLabel}
          </Link>
          {" · "}
          <Link href="/about" prefetch={false} className="text-accent-blue hover:underline">
            {t.aboutLabel}
          </Link>
        </p>
      </div>
    </footer>
  );
}
