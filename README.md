# kr-stocks.com — 24h Global Markets Dashboard

Next.js 14 App Router · Tailwind CSS · 토스/뱅크샐러드 풍 다크 테마

## 데이터 소스

- **Hyperliquid HIP-3 `xyz` dex** — 28종목 (한국 6 + 미국 25 + 글로벌 5)
- **Hyperliquid HIP-3 `vntl` dex** — 비상장 3종목 (SpaceX, OpenAI, Anthropic)
- **Upbit KRW/USDT** — 실시간 환율
- 30초 캐시 (Vercel Edge / Next.js revalidate)

총 39종목 (universe_map.json 정의).

## 로컬 개발

```bash
cd /Users/trollman/.openclaw/workspace/sandbox/kr_stocks_dashboard/nextjs_scaffold
npm install
npm run dev
# → http://localhost:3000
```

확인:
- `/` — 38종목 그리드 (카테고리별 섹션)
- `/private/anthropic` — Anthropic 상세
- `/korea/samsung` — 삼성전자 상세 (1주 환산)
- `/us/tesla` — 테슬라 상세
- `/api/prices` — 통합 가격 JSON

## Vercel 배포 가이드

### 1단계: 도메인 등록

추천: 가비아 / 후이즈 / Cloudflare Registrar
- `kr-stocks.com` 등록 (보통 1.5만원/년)

### 2단계: GitHub 리포 생성

```bash
cd /Users/trollman/.openclaw/workspace/sandbox/kr_stocks_dashboard/nextjs_scaffold
git init
git add .
git commit -m "Initial scaffold"
gh repo create kr-stocks --private --source=. --push
```

### 3단계: Vercel 연결

1. https://vercel.com/new → "Import Git Repository"
2. kr-stocks 선택 → "Deploy"
3. 자동 빌드 후 `kr-stocks.vercel.app` URL 발급

### 4단계: 도메인 연결

Vercel 프로젝트 → Settings → Domains → `kr-stocks.com` 추가
→ 가비아 DNS:
- A record `@` → `76.76.21.21`
- CNAME `www` → `cname.vercel-dns.com`

전파 5~30분.

## 트래픽 전략

### 즉시 (D5)
- 디시 주식갤: "비상장 빅테크 24h 가격 보는 사이트 만들었음" 글
- 카카오톡 주식방: 링크 공유
- 트위터: "Anthropic, OpenAI, SpaceX 24h 추적"

### 1주 후 (D12)
- 네이버 카페 (주식 카페 5~10개) backlink
- 블로그 포스팅: "OpenAI 시가총액 실시간 보는 법"

### 1개월 후
- AdSense 등록 신청 (PV 1,000+/일 충족 시)

### 3개월 후
- 증권사 affiliate 신청 (키움/토스/한투)

## 사이트 구조

```
/                  홈 (38종목 그리드)
/[category]/[slug] 종목 상세 (dynamic)
  - /korea/samsung
  - /korea/hynix
  - /korea/hyundai
  - /private/anthropic   ★ 트래픽 핵심
  - /private/openai      ★
  - /private/spacex      ★
  - /us/tesla
  - /us/nvidia
  - ... (38개)
/api/prices        통합 가격 JSON (캐시 30s)
```

## 향후 추가 기능 (Phase 2~3)

- [ ] 24h 가격 차트 (Recharts + Hyperliquid candle API)
- [ ] 정규장 종가 비교 (KRX/NASDAQ API)
- [ ] 카카오톡 공유 버튼
- [ ] AdSense 단위 (3개월 후)
- [ ] 종목 검색/필터
- [ ] 다국어 (한/영)
- [ ] 즐겨찾기 (localStorage)
- [ ] 로그인 + 알림 (선택)

## 면책

본 서비스는 정보 제공만을 목적으로 하며, 투자 권유·자문·예측이 아닙니다.
