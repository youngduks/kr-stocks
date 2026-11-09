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

회의를 녹음하면서 실시간으로 자막·번역·회의록을 만드는 **단일 HTML 앱**.
주식 사이트와 코드를 공유하지 않는 독립 도구이고, 이 사이트는 HTTPS 호스팅만 빌려준다
(마이크와 브라우저 내장 AI는 HTTPS에서만 동작한다). 검색 노출은 막아 두었다.

- 파일: `public/voicenote/index.html` — 외부 라이브러리 없음, 이 파일 하나가 전부
- 주소: `/voicenote` (`next.config.mjs`의 rewrite)
- **서버도 API 키도 쓰지 않는다. 운영 비용 0원.**

| 기능 | 방식 | 비고 |
|---|---|---|
| 음성 인식 | Web Speech API | Chrome은 Google 서버에서 처리(무료). Safari는 Apple |
| 녹음 파일 | MediaRecorder → IndexedDB | 이 브라우저 안에만 저장, 내려받기 가능 |
| 실시간 번역 | Chrome 기기 내 Translator API | 한국어 ↔ 영어·일본어·중국어. 없으면 MyMemory 무료 API(선택, 외부 전송) |
| 회의 정리 (녹음 중) | 규칙 기반 | 한·영·일·중 어미/표현 패턴. 지연 0, 모든 브라우저 |
| 회의 정리 (종료 후) | Chrome 기기 내 Prompt API (Gemini Nano) | 한국어 미지원이라 번역기로 영어를 거쳐 정리한 뒤 한국어로 되돌림 |

정리 항목: 개요 · 배경 · 주요 논의 · 결정 사항 · 향후 계획(할 일·담당·기한 / 일정) · 미결 사항 · 키워드.

**아이폰·아이패드**
- 웹(Safari): 자막·녹음·규칙 정리 + **‘아이폰 AI로 정리’** — 단축어 앱의 ‘모델 사용’(Apple Intelligence)으로
  회의록을 만든다(무료). Safari엔 웹용 번역 API가 없어 실시간 번역은 외부 무료 번역(선택)만 된다.
- 전용 앱: [`ios/VoiceNote.swiftpm`](ios/README.md) — 기기 내 음성 인식·실시간 번역·AI 회의록 전부 무료.
  아이패드는 Swift Playgrounds로 바로 실행, 아이폰은 Mac(Xcode)으로 설치.

규칙 엔진은 `public/voicenote/rules.js` 한 곳에 있고, 아이폰 앱이 그 사본을 JavaScriptCore로 실행한다.
고친 뒤 `scripts/sync-voicenote-rules.sh`로 사본을 맞출 것.

### 구현하면서 확인한 브라우저 동작 (Chromium 153)

설계에 직접 영향을 준 것들이다. 같은 문제를 다시 밟지 않도록 남긴다.

- `Translator.availability()`가 **응답 없이 멈추는** 경우가 있다. 번역 큐와 종료 처리가
  이걸 기다리면 앱 전체가 멈추므로, 내장 AI 호출에는 전부 시한을 건다(`withTimeout`).
- `LanguageModel.availability()`는 한국어 입출력에 `"unavailable"`을 준다.
  그래서 AI 정리는 ko→en 번역 → 영어로 정리 → en→ko 번역 경로를 탄다.
- `SpeechRecognition.available({ processLocally: true })`가 **탭을 크래시**시켰다.
  기기 내 음성 인식은 설정의 실험 옵션(기본 꺼짐)으로만 둔다.
- 기기 내 모델은 **사용자 클릭 직후에만** 내려받기를 시작할 수 있다. 녹음 시작·언어 전환·
  "AI로 정리하기" 클릭 핸들러 안에서 번역기/AI를 준비한다.

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
