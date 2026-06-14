# kr-stocks.com 인수인계서

> 다른 봇/세션이 이어받아 작업할 수 있도록 작성된 자급식 인수인계서. 작성 기준일: 2026-06-14.

## 1. 프로젝트 정체성 (무엇 / 왜)

- **한 줄**: 형님 본인 프로젝트. 한국 주식 정보 사이트 kr-stocks.com.
- **주요 콘텐츠 축**:
  1. **삼성/SK하이닉스/현대차 시세** — 바이낸스 USDT-M perp(cash-settled, 1주=1계약)로 실시간 표시
  2. **비상장/해외 시세** (`/private`) — Anthropic·OpenAI·SpaceX 등, Hyperliquid 데이터. 마케팅 진입점
  3. **뉴스룸** (`/news`) — 국제정세 + 한국 핵심 3종목 키워드 필터 뉴스
  4. **인간지표 폴** (`/poll`) — 개미 내일 상승/하락 집단예측 vs 실제결과 + 적중률
- **마케팅**: 디시 주식갤/주식 카톡방 viral paste. 슬로건 "Anthropic, OpenAI, SpaceX 지금 가격 보기 → kr-stocks.com/private"

## 2. 위치 / 인프라

| 항목 | 값 |
|---|---|
| 로컬 경로 (repo root) | `/Users/trollman/.openclaw/workspace/sandbox/kr_stocks_dashboard/nextjs_scaffold/` |
| 도메인 | **kr-stocks.com** (Cloudflare Registrar, $9.59/년). www → apex redirect |
| DNS | Cloudflare nameserver, Vercel A record `76.76.21.21` |
| 호스팅 | Vercel (youngduks-projects 팀, orgId `team_5tzm8HHcGRFS4kc9PgStHTER`) |
| 리전 | **icn1 (서울) 고정** — `vercel.json`의 `{"regions":["icn1"]}` |

## 3. 스택

- **Next.js 14.2.33** (App Router) + TypeScript + Tailwind/PostCSS
- **@upstash/redis 1.38.0** — `/poll` 카운터 + 방문자 통계
- 시세: 삼성/하이닉스/현대차 = **바이낸스 USDT-M perp**(SAMSUNGUSDT·SKHYNIXUSDT·HYUNDAIUSDT). 미국·비상장·글로벌 종목 = **Hyperliquid**

## 4. 라우트 / 페이지

- 페이지: `/` | `/samsung` | `/poll` | `/news` | `/consensus` | `/en/*` (다국어) | `/guide/*`
- 동적: `/[category]/[slug]/` (뉴스 상세)
- API: `/api/prices` | `/api/stats` | `/api/visit` | `/api/poll`

## 5. 환경변수 / 자격증명

Vercel 프로젝트 환경변수에 설정됨. **키 이름만**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

(`lib/poll.ts`, `lib/visitorStats.ts`가 사용)

## 6. ⚠️ 배포 절차 — 반드시 이대로 (커밋 author 게이트 + rebase)

이 프로젝트는 배포 규칙이 엄격하다. 안 지키면 배포가 막히거나 깨진다.

1. **커밋 author 게이트 (필수)**: 반드시 youngduks 신원으로 커밋.
   ```bash
   git commit --author="youngduks <130581659+youngduks@users.noreply.github.com>" -m "..."
   ```
   - 이 author가 아니면 배포 차단됨.
   - **`Co-Authored-By: Claude` 트레일러 넣지 말 것** (레포 관례 = bullet 본문만).
2. **push 전 rebase 필수**: origin/main에 news-cron이 주기적으로 자동 커밋한다.
   ```bash
   git fetch origin main && git rebase origin/main && git push origin main
   ```
3. push → Vercel 자동 배포.

## 7. 자동화 (GitHub Actions / cron)

| 워크플로우 | 스케줄 | 역할 |
|---|---|---|
| `aggregate-news.yml` | **1시간 cron** | 뉴스 수집 → `data/news/`에 커밋 |
| `update-trading-flow.yml` | UTC 월–금 08:00 (KST 17:00) | 트레이딩 플로우 갱신 |

> ⚠️ **메모리 드리프트 정정**: 과거 메모는 뉴스 cron을 "30분"이라 했으나 **실제는 1시간**(5/26 수정됨). 뉴스 저장 위치도 과거 메모의 `public/data/news.json`이 아니라 **`data/news/` 디렉토리**가 맞다(최근 갱신 2026-06-09).

## 8. 뉴스룸 상세

- **컨셉**: SAVE 앱 미러가 아니라 **국제정세 + 한국 핵심 3종목 키워드 필터** 직접 수집.
- **카테고리·키워드**:
  - 국제정세: 전쟁(우크라/이스라엘), 미국(Fed/FOMC/CPI/트럼프/관세), 중국(미중/공급망/대만)
  - 삼성전자: HBM, 메모리, 파운드리
  - SK하이닉스: DRAM, 낸드, HBM3/HBM4
  - 현대차: 아이오닉, EV, 전기차 보조금
- **소스**: 한경 RSS, 머투 RSS, 연합뉴스 RSS (DART OpenAPI는 보류, 0원 운영)
- 저장: `data/news/` (GitHub Actions가 커밋), 페이지는 ISR

## 9. 인간지표 폴(`/poll`) 운영 절차

- **인프라**: Upstash Redis 카운터(SET NX 중복차단 + INCR). `lib/poll.ts`, `app/api/poll/route.ts`(POLLS 레지스트리), `components/PollWidget.tsx`.
- **새 폴 등록** ("내일 투표 갱신"): `route.ts`의 POLLS에 `market-updown-YYYY-MM-DD` 추가. `closedAt` = 해당일 08:00 KST = **전일 23:00:00Z**(NXT 프리장 오픈). 홈/`app/poll/page.tsx`의 PollWidget pollId·question을 새 날짜로.
- **결과 확정** ("어제 투표 결과 반영"): Redis는 30일 TTL이라 영구보존 안 됨 → 마감 폴 최종집계를 **`data/polls/history.json`에 스냅샷**. yes=상승표/no=하락표, `outcome`(up/down/flat)은 naver 정규장 종가 vs 전일종가로 판정(삼성 005930). `lib/pollHistory.ts`가 crowdPick·적중률 계산, `/poll`이 렌더. (history.json 최신 항목 2026-06-10)
- **팔로업(미착수)**: 매일 자동 폴 생성 + 마감 자동 스냅샷 = 수동 갱신 제거. 형님 원하면 착수.

## 10. 알아둘 것 (gotchas)

- **icn1 고정 이유**: 바이낸스 fapi가 Vercel 미국 리전(iad1)을 **HTTP 451 지역차단**. 그래서 서울 리전 고정. 리전 절대 바꾸지 말 것.
- **Cloudflare가 기본 curl UA를 403** → 검증 curl엔 브라우저 UA 헤더를 붙일 것.
- **프로덕션 시각 캐비엇**: 샌드박스 `date`가 틀릴 때 있음(하루 어긋남 등). 시각·마감 계산은 라이브 `https://kr-stocks.com/api/prices`의 `fetched_at`(ms)으로 확인.
- **캐시 계층**: 홈 ISR revalidate=120, 상세 force-dynamic+30, /poll ISR=300, /api/prices=30. 검증 시 `?_=$(date +%s)`로 캐시버스트.

## 11. 현재 상태 / 다음 작업

- git: **main, clean**. 마지막 커밋 `c825b9c 인간지표 폴 업데이트 — 6/9 결과 확정 + 6/10 새 폴`.
- (대기) 폴 자동화(자동 생성+자동 스냅샷)
- 깊은 컨텍스트: `/Users/trollman/.claude-bot/memory/backtest_notes.md`의 kr-stocks 작업 기록(라인 33000번대 부근) + auto-memory `project_kr_stocks.md`.
