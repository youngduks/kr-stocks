// swift-tools-version: 5.9

// 보이스노트 아이폰·아이패드 앱.
//
// 이 폴더(VoiceNote.swiftpm)는 Swift Playgrounds 앱 패키지 형식이다.
//  - 아이패드: Swift Playgrounds 앱(무료)에서 열고 바로 실행 — Mac이 필요 없다.
//  - Mac: Xcode나 Swift Playgrounds로 열고 아이폰에 설치.
//
// 언어 모드는 Swift 5로 둔다(tools-version 5.9). Swift 6의 엄격한 동시성 검사는
// 오디오 탭처럼 스레드를 넘나드는 코드에서 경고 대신 오류를 낸다.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "VoiceNote",
    platforms: [
        // 번역(Translation 프레임워크)이 iOS 18부터. AI 회의록은 iOS 26 기기에서만 켜진다.
        .iOS("18.0")
    ],
    products: [
        .iOSApplication(
            name: "VoiceNote",
            targets: ["AppModule"],
            bundleIdentifier: "com.krstocks.voicenote",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .mic),
            accentColor: .presetColor(.red),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ],
            capabilities: [
                .microphone(purposeString: "회의를 녹음하고 자막을 만들기 위해 마이크를 사용합니다."),
                .speechRecognition(purposeString: "회의 내용을 기기 안에서 받아쓰기 위해 음성 인식을 사용합니다.")
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: ".",
            resources: [
                // 웹(public/voicenote/rules.js)과 같은 규칙 엔진. scripts/sync-voicenote-rules.sh 로 맞춘다.
                .copy("Resources/rules.js")
            ]
        )
    ]
)
