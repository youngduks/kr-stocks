import Foundation
import Translation

/// 한 방향 번역 줄 (예: 한국어 → 영어).
///
/// Apple Translation 프레임워크(iOS 18)는 기기 안에서 무료로 번역한다. 다만 세션을
/// 직접 만들 수 없고 SwiftUI의 `.translationTask(configuration)`가 넘겨준다.
/// 그래서 화면이 세션을 주면 `run(_:)`이 이 줄에 쌓인 일을 처리하는 구조다.
///
/// 녹음 중 언어를 바꾸면 한 세션의 방향이 맞지 않게 된다. 그래서 방향마다 줄을
/// 따로 둔다 — 한국어→외국어 줄과 외국어→한국어 줄.
///
/// 메인 액터에 묶는다: 화면 상태(@Published)와 대기열을 화면 쪽과 함께 만지기 때문이다.
@MainActor
final class TranslationLane: ObservableObject {
    struct Job: Equatable {
        let segmentID: String
        let text: String
    }

    /// `.translationTask`에 넘길 설정. 바뀌면 SwiftUI가 새 세션으로 `run`을 다시 부른다.
    @Published private(set) var configuration: TranslationSession.Configuration?
    @Published private(set) var problem: String?

    private(set) var source: Lang?
    private(set) var target: Lang?
    /// 아직 결과를 못 받은 일. 세션이 바뀌어도 잃지 않도록 따로 들고 있는다.
    private var outstanding: [Job] = []
    private var continuation: AsyncStream<Job>.Continuation?

    /// (자막 id, 번역문 또는 실패 시 nil, 번역 언어)
    var deliver: ((String, String?, Lang) -> Void)?

    func setPair(source: Lang?, target: Lang?) {
        guard source != self.source || target != self.target else { return }
        self.source = source
        self.target = target
        problem = nil
        continuation?.finish()
        continuation = nil
        if let source, let target {
            configuration = TranslationSession.Configuration(source: source.language, target: target.language)
        } else {
            configuration = nil
        }
    }

    func enqueue(_ job: Job) {
        outstanding.append(job)
        continuation?.yield(job)
    }

    /// `.translationTask`의 동작. 세션이 살아 있는 동안 쌓이는 일을 계속 처리한다.
    func run(_ session: TranslationSession) async {
        guard let target else { return }
        let (stream, cont) = AsyncStream<Job>.makeStream()
        for job in outstanding { cont.yield(job) }
        continuation = cont

        do {
            // 언어 팩이 없으면 여기서 내려받기 안내가 뜬다(처음 한 번).
            try await session.prepareTranslation()
        } catch {
            problem = "\(source?.label ?? "")→\(target.label) 번역 언어 팩을 준비하지 못했습니다. 설정 > 일반 > 언어 및 지역 > 번역 언어에서 받을 수 있습니다."
        }

        for await job in stream {
            if Task.isCancelled { break }
            let text: String?
            do {
                text = try await session.translate(job.text).targetText
            } catch {
                text = nil
            }
            outstanding.removeAll { $0 == job }
            deliver?(job.segmentID, text, target)
        }
    }
}
