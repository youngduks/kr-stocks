# 보이스노트 — 아이폰·아이패드 앱

회의를 녹음하면서 실시간으로 **자막 · 번역 · 회의록**을 만드는 앱입니다.
전부 기기 안에서 무료로 돕니다. 서버도 API 키도 없습니다.

| 기능 | 쓰는 애플 기능 | 필요 조건 |
|---|---|---|
| 녹음 + 실시간 자막 | Speech (기기 내 인식) | iOS 18 이상 |
| 실시간 번역 (한국어 ↔ 영어·일본어·중국어) | Translation (기기 내) | iOS 18 이상, 처음 한 번 언어 팩 다운로드 |
| 회의 정리 (녹음 중) | 웹과 같은 규칙 엔진(rules.js)을 JavaScriptCore로 실행 | iOS 18 이상 |
| AI 회의록 (종료 후) | Foundation Models (Apple Intelligence) | **iOS 26 이상 + iPhone 15 Pro 이상 또는 M1 이상 iPad + Apple Intelligence 켜짐** |

정리 항목: 개요 · 배경 · 주요 논의 · 결정 사항 · 향후 계획(할 일·담당·기한 / 일정) · 미결 사항 · 키워드

## 설치 — 둘 중 하나

### A. 아이패드만 있을 때 — Swift Playgrounds (무료, Mac 불필요)

1. 아이패드에서 App Store의 **Swift Playgrounds**(무료)를 설치합니다.
2. Safari로 GitHub 저장소 페이지 → **Code → Download ZIP**을 받습니다.
3. 파일 앱에서 ZIP을 눌러 압축을 풉니다.
4. 압축을 푼 폴더의 `ios/VoiceNote.swiftpm`을 누르면 Swift Playgrounds에서 열립니다.
5. 오른쪽 위 **▶ 실행**을 누릅니다. 앱은 Swift Playgrounds 안에서 실행됩니다.

> Swift Playgrounds에 iOS 26 SDK가 아직 없으면 **AI 회의록만 빠지고** 나머지는 그대로 동작합니다.
> 그 경우 앱 화면에 "AI 회의록 · 미지원"이 표시됩니다.

**아이폰에서는 Swift Playgrounds를 쓸 수 없습니다**(아이패드·Mac 전용). 아이폰만 있다면
웹 버전(`/voicenote`)에서 ‘아이폰 AI로 정리’(단축어 연동)를 쓰세요.

### B. Mac이 있을 때 — 아이폰에 설치

1. Mac에 **Xcode**를 설치합니다(App Store, 무료). AI 회의록까지 쓰려면 iOS 26 SDK가 든 Xcode 26 이상.
2. `ios/VoiceNote.swiftpm` 폴더를 Xcode로 엽니다.
3. 왼쪽 프로젝트 → **Signing & Capabilities** → Team에서 본인 Apple ID를 고릅니다(없으면 Add Account).
4. 아이폰을 케이블로 연결하고, 위쪽 기기 목록에서 아이폰을 고른 뒤 **▶ 실행**.
5. 처음 한 번은 아이폰 **설정 > 일반 > VPN 및 기기 관리**에서 개발자(본인)를 신뢰해야 열립니다.

| Apple 계정 | 비용 | 유지 기간 |
|---|---|---|
| 무료 Apple ID | 0원 | **7일마다** Mac에서 다시 설치해야 함 |
| Apple Developer Program | 연 $99 | 1년 (TestFlight로 가족·동료 배포도 가능) |

## 처음 실행할 때

- 마이크·음성 인식 권한을 허용합니다.
- 번역 언어를 처음 고르면 언어 팩 다운로드 안내가 뜹니다. 받아 두면 이후로는 오프라인에서도 번역됩니다.
  (설정 > 일반 > 언어 및 지역 > 번역 언어에서도 받을 수 있습니다)
- AI 회의록은 녹음을 마치면 자동으로 만들어집니다. ‘회의 정리’ 탭 → ‘AI 정리’에서 볼 수 있습니다.

## 웹 버전과 주고받기

자료 형식이 웹 앱과 같습니다.
- 아이폰 → PC: 회의 화면 오른쪽 위 메뉴 → **웹 앱용 백업 (.json)** → PC의 웹 앱 ‘회의 목록’ → ‘백업 파일 불러오기’
- PC → 아이폰: 웹 앱 ‘내보내기’ → 백업 (.json) → 아이폰 앱 첫 화면 오른쪽 위 ‘웹 백업 가져오기’

녹음 파일은 각 기기 안에만 있고 백업에는 들어가지 않습니다(크기 때문). 녹음 파일은 메뉴의 ‘녹음 파일’로 따로 공유할 수 있습니다.

## 구조

```
VoiceNote.swiftpm/
  Package.swift            앱 패키지 (Swift Playgrounds · Xcode 공용)
  App/VoiceNoteApp.swift   진입점
  Core/
    Recorder.swift         마이크 하나 → 음성 인식 + 녹음 파일. 1.5초 무음마다 자막 한 줄 확정
    TranslationLane.swift  기기 내 번역. 방향별(한→외, 외→한) 줄을 따로 둔다
    MeetingAI.swift        Foundation Models 회의록. 4,096토큰 한도 때문에 구간 메모 → 합치기
    RuleEngine.swift       rules.js를 JavaScriptCore로 실행 (전용 스레드)
    MeetingController.swift 화면 하나의 두뇌 — 위를 엮고 저장
    MeetingStore.swift     Documents/meetings/ 에 JSON·m4a 저장
    Models.swift           웹과 키 이름까지 같은 자료 구조
    Export.swift, Shareables.swift  회의록 .md / 백업 .json 공유 (누를 때 만든다)
  Views/                   SwiftUI 화면 (아이패드는 자막·정리를 나란히)
  Resources/rules.js       웹 public/voicenote/rules.js 의 사본
```

`rules.js`를 고치면 저장소 루트에서 `scripts/sync-voicenote-rules.sh`로 사본을 맞추세요.
`--check`를 붙이면 둘이 다를 때 실패합니다.

### 설계에서 신경 쓴 것

- **마이크 충돌이 없다.** 웹 버전은 녹음 파일과 음성 인식이 마이크를 따로 열어 일부 기기에서 서로 뺏었다.
  여기서는 AVAudioEngine 탭 하나를 두 곳에 흘려보낸다.
- **자막 줄 나누기.** SFSpeechRecognizer는 한 요청 안에서 문장을 계속 이어 붙이기만 한다. 부분 결과가
  1.5초 안 오면 지금까지를 한 줄로 확정하고 새 요청으로 갈아탄다. 서버 인식의 1분 한도도 이걸로 피한다.
- **스레드.** 화면 상태는 전부 메인 액터. 인식 콜백·오디오 탭에서 부르는 클로저는 `nonisolated` 함수에서
  만들어, Swift 6 런타임의 격리 검사에 걸려 앱이 죽는 일이 없게 했다.
- **오래된 SDK에서도 빌드.** AI 부분은 `#if canImport(FoundationModels)` / `#available(iOS 26)`으로 감쌌다.

## 검증 상태

- 이 앱은 **Linux 환경에서 작성되어 실제로 빌드·실행해 보지 못했습니다.** (iOS 빌드에는 Xcode가 필요)
- 15개 Swift 파일 전부 Swift 문법 파서(tree-sitter)로 문법 오류 0건을 확인했습니다. 타입 검사는 하지 못했습니다.
- 아이폰 앱이 쓰는 `rules.js` 사본과 아이폰 형식 JSON은, JavaScriptCore와 같은 DOM 없는 환경에서 돌려 확인했습니다.
- 웹 ↔ 아이폰 백업 형식 호환을 테스트로 확인했습니다.

빌드할 때 오류가 나면 Xcode/Swift Playgrounds의 오류 메시지를 그대로 알려 주세요. 바로 고치겠습니다.
