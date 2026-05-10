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
