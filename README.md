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

## 보이스노트 (`/voicenote`)

회의를 녹음하면서 실시간으로 **자막 · 번역(한국어 ↔ 영어·일본어·중국어) · 회의록**을 만드는 단일 HTML 앱.
주식 사이트와 코드를 공유하지 않는 독립 도구이고, 이 사이트는 HTTPS 호스팅만 빌려준다
(마이크는 HTTPS에서만 열린다). 검색 노출은 막아 두었다.

- 파일: `public/voicenote/index.html` + `rules.js` — 외부 라이브러리 없음
- 주소: `/voicenote` (`next.config.mjs`의 rewrite)
- **서버 없음. 사용자가 자기 Gemini 무료 키를 한 번 넣으면 브라우저가 Gemini를 바로 부른다.** 운영 비용 0원.
  키는 그 브라우저(localStorage)에만 저장되고 `x-goog-api-key` 헤더로만 나간다.
- PC 크롬, 아이폰·아이패드 Safari, 안드로이드 모두 같은 방식으로 동작한다.

### 쓰는 법

1. https://aistudio.google.com/apikey 에서 구글 로그인 → API 키 만들기 → 복사
2. `/voicenote` 첫 화면 칸에 붙여넣고 저장 (처음 한 번만)
3. 상대 언어(영어·일본어·중국어) 고르고 **녹음 시작** → 끝나면 **종료** → Gemini가 회의록을 쓴다

### 동작 방식

| 단계 | 방식 |
|---|---|
| 녹음 | 마이크 하나를 MediaRecorder(녹음 파일 → IndexedDB)와 음성 조각 추출이 같이 쓴다 |
| 받아쓰기 + 번역 | 7초가 지난 뒤 말이 0.35초 끊기는 곳(최대 14초)에서 16kHz WAV 조각을 잘라 Gemini에 보낸다. 한 번의 호출로 받아쓰기·언어 판별·번역을 JSON으로 받는다. 말소리가 거의 없는 조각은 보내지 않는다 |
| 녹음 중 정리 | 규칙 기반(`rules.js`) — 배경·주요 논의·결정·할 일·계획·미결. 지연 0 |
| 회의록 | 종료하면 녹취록 전체를 Gemini에 한 번 보내 개요·배경·주요 논의·결정 사항·향후 계획(할 일·담당·기한 / 일정)·미결 사항·키워드를 받는다 |
| 키가 없을 때 | 브라우저 음성 인식(Web Speech)으로 녹음·자막만 |

- 모델은 `gemini-flash-lite-latest`(받아쓰기) · `gemini-flash-latest`(회의록) 별칭을 먼저 쓰고, 없으면(404) 다음 후보로 넘어가며 성공한 모델을 기억한다.
- 429(분당 한도)는 `retryDelay`만큼 기다렸다 같은 조각을 다시 보낸다. 하루 한도를 넘기면 조각을 모아 두고 ‘못 받아쓴 구간 다시’ 버튼으로 나중에 보낸다.
- 무료 키는 Google이 보낸 내용을 서비스 개선에 쓸 수 있다 — 화면에 안내되어 있다. 민감한 회의는 유료 결제 키를 쓰거나 키 없이 녹음만 할 것.

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
