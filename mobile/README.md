# 보이스노트 — 실시간 요약 녹음 앱

말하는 동안 자막이 쌓이고, 그 자막이 일정량 모일 때마다 요약이 갱신되는 Expo(React Native) 앱.
회의록 / 인터뷰 두 가지 모드가 있고, 각각 정리 결과의 구성이 다르다.

## 어떻게 동작하나

```
[기기 내장 STT]           [Next.js API]              [Claude Opus 5]
 iOS Speech          ─┐                        ┌─ structured outputs
 Android Recognizer   ├→ 확정 자막 조각 ──→ /api/voice/summarize ──→ 누적 요약 갱신
                      │   (280자 또는 40초마다)
                      └→ 전체 녹취록 ────→ /api/voice/finalize  ──→ 최종 노트
```

- **음성 인식은 기기에서** 한다. 오디오가 서버로 나가지 않고, STT 비용이 0이며, 한국어 인식률이 좋다.
- **요약만 서버로** 보낸다. 그것도 전체 녹취록이 아니라 *아직 요약에 반영되지 않은 자막 조각*만 보낸다.
  서버는 "이전 요약 + 새 자막" → "갱신된 누적 요약"으로 롤링 업데이트하므로,
  녹음이 1시간을 넘어가도 한 번의 요청 크기가 커지지 않는다.
- 녹음을 끝내면 전체 녹취록으로 한 번 더 정리해 **최종 노트**(제목 + 마크다운 본문)를 만든다.
  이때만 녹취록 전체가 올라간다.

요약 트리거 규칙은 `src/hooks/useLiveSummary.ts` 상단 상수에 모여 있다.

| 상수 | 기본값 | 의미 |
|---|---|---|
| `TRIGGER_CHARS` | 280자 | 이만큼 쌓이면 즉시 요약 |
| `TRIGGER_IDLE_MS` | 40초 | 분량이 모자라도 이 시간이 지나면 요약 |
| `RETRY_BASE_MS` | 5초 | 실패 시 지수 백오프 시작값 (최대 60초) |

## Expo Go로는 실행되지 않는다

`expo-speech-recognition`은 네이티브 모듈이라 Expo Go에 들어 있지 않다. **개발 빌드**가 필요하다.

```bash
cd mobile
npm install
cp .env.example .env        # API 주소 설정

# 안드로이드 실기기/에뮬레이터
npx expo run:android

# iOS (macOS + Xcode 필요)
npx expo run:ios
```

이후에는 `npm start`로 Metro만 띄우면 된다.

EAS로 빌드하려면:

```bash
npx eas build --profile development --platform android
```

## 서버 쪽 설정

요약 API는 이 저장소의 Next.js 앱에 있다 (`app/api/voice/*`). 필요한 환경변수:

| 변수 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API 키 |
| `VOICE_API_SECRET` | 선택 | 설정하면 `x-voice-key` 헤더가 일치해야 요청을 받는다 |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | 선택 | 있으면 IP당 시간당 240회 레이트리밋이 걸린다 |

로컬 서버로 붙일 때는 `EXPO_PUBLIC_API_BASE_URL`에 **PC의 LAN IP**를 넣어야 한다.
실기기에서 `localhost`는 폰 자신을 가리킨다.

## 화면 구성

| 경로 | 화면 |
|---|---|
| `app/index.tsx` | 노트 목록 + 모드 선택. 길게 누르면 삭제 |
| `app/record.tsx` | 녹음 화면. `실시간 요약` / `자막` 탭 |
| `app/note/[id].tsx` | 저장된 노트. 클립보드 복사, 최종 정리 재시도 |

노트는 AsyncStorage에 저장된다. 목록용 메타 인덱스(`voicenote:index`)와
본문(`voicenote:note:<id>`)을 나눠 두어 녹취록이 길어져도 목록 화면이 느려지지 않는다.

## 실기기에서 부딪히는 것들

`src/hooks/useLiveTranscript.ts`가 흡수하는 문제들:

- **Android는 `continuous`여도 침묵이 길면 세션이 끝난다.** `end` 이벤트에서 다시 살린다.
- **`no-speech`는 에러가 아니라 정상적인 침묵이다.** 배너를 띄우지 않고 조용히 재시작한다.
- **재시작이 즉시 실패하며 반복되면 무한루프가 된다.** 1초 안에 끝난 세션을 "즉시 실패"로 세고,
  5회 연속이면 되살리기를 포기하고 일시정지 상태로 전환한다.
- **`stop()` 직후에 마지막 확정 자막이 도착한다.** 종료 후 1.2초 기다렸다가 녹취록을 확정한다.

## 알려진 한계

- 화자 구분(diarization)이 없다. 기기 STT가 제공하지 않는다.
  인터뷰 모드의 `speaker`는 대화 맥락에서 유추한 것이라 비어 있을 수 있다.
- 백그라운드 녹음은 iOS에서만 `UIBackgroundModes: ["audio"]`로 열어 두었다.
  Android는 포그라운드 서비스가 필요해 현재는 화면이 켜져 있어야 한다(`useKeepAwake`로 잠금을 막는다).
- 오디오 파일은 저장하지 않는다. 남는 것은 자막과 요약뿐이다.
  (원본이 필요하면 `start()`의 `recordingOptions.persist`를 켜면 된다.)
- **SDK 56에 고정되어 있다.** `expo-speech-recognition`이 56까지만 배포돼 있어서다.
  그 대가로 `expo-doctor`가 SDK 56의 Hermes V1 메모리 리그레션을 경고한다
  (React Native 0.86+ / Expo SDK 57에서 수정됨). 이 앱 규모에서는 문제되지 않지만,
  `expo-speech-recognition`이 57 대응 버전을 내면 `npx expo install expo@^57 --fix`로 함께 올리는 게 좋다.
