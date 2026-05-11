export function Footer() {
  return (
    <footer className="border-t border-line mt-12">
      <div className="max-w-6xl mx-auto px-5 py-8 text-xs text-text-dim leading-6">
        <div className="mb-3 text-text-muted font-semibold">데이터 출처</div>
        <ul className="space-y-1 mb-6">
          <li>• 가격: <a href="https://hyperliquid.xyz" className="text-accent-blue hover:underline" target="_blank" rel="noopener">Hyperliquid HIP-3 (xyz, vntl) DEX perp</a></li>
          <li>• KRW 환율: <a href="https://upbit.com" className="text-accent-blue hover:underline" target="_blank" rel="noopener">Upbit KRW/USDT spot</a></li>
          <li>• 업데이트 주기: 30초</li>
        </ul>

        <div className="mb-3 text-text-muted font-semibold">광고 · 제휴 문의</div>
        <ul className="space-y-1 mb-6">
          <li>
            • <a
                href="mailto:contact@kr-stocks.com?subject=%5B%EA%B4%91%EA%B3%A0%EB%AC%B8%EC%9D%98%5D%20kr-stocks.com&body=%E2%96%A0%20%EC%97%85%EC%B2%B4%EB%AA%85%3A%0D%0A%E2%96%A0%20%EB%8B%B4%EB%8B%B9%EC%9E%90%3A%0D%0A%E2%96%A0%20%EC%83%81%ED%92%88%2F%EC%84%9C%EB%B9%84%EC%8A%A4%3A%0D%0A%E2%96%A0%20%ED%9D%AC%EB%A7%9D%20%EC%A7%80%EB%A9%B4%2F%EA%B8%B0%EA%B0%84%3A%0D%0A%E2%96%A0%20%EC%98%88%EC%82%B0%3A%0D%0A%E2%96%A0%20%EB%AC%B8%EC%9D%98%EB%82%B4%EC%9A%A9%3A%0D%0A"
                className="text-accent-blue hover:underline"
              >
                contact@kr-stocks.com
              </a>
          </li>
          <li>• 배너 · 네이티브 · 증권사/거래소 affiliate 제휴 환영</li>
          <li>• 응답: 평일 24h 이내</li>
        </ul>

        <div className="mb-3 text-text-muted font-semibold">면책 (Disclaimer)</div>
        <p className="mb-3">
          본 서비스는 정보 제공만을 목적으로 하며, 투자 권유·자문·예측이 아닙니다. 표시 가격은 perp DEX 시세로 정규장 거래소 가격과 차이가 있을 수 있습니다.
          비상장 회사 가격은 implied valuation 기반의 추정치입니다.
        </p>
        <p className="text-text-dim">© 2026 KR Stocks. Not investment advice.</p>
      </div>
    </footer>
  );
}
