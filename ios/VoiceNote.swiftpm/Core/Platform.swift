import UIKit

/// 녹음 중 화면이 꺼지지 않게 한다. (화면이 꺼지면 앱이 백그라운드로 가서 녹음이 멈춘다)
/// UIApplication은 메인 액터 전용이라 이 도우미도 메인 액터에 묶는다.
@MainActor
enum UIApplicationIdle {
    static func keepAwake(_ on: Bool) {
        UIApplication.shared.isIdleTimerDisabled = on
    }
}
