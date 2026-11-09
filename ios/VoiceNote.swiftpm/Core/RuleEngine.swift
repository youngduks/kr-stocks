import Foundation
import JavaScriptCore

/// 규칙 기반 회의 정리 — 웹과 **같은 rules.js**를 JavaScriptCore로 실행한다.
///
/// 규칙을 Swift로 다시 쓰지 않은 이유: 한·영·일·중 패턴이 수백 줄이고, 두 벌을 따로
/// 고치다 보면 반드시 어긋난다. 웹에서 고치면 아이폰도 같이 고쳐지게 한 곳에 둔다.
///
/// 앱 안의 JavaScriptCore는 JIT 없이 돌아서 웹보다 느리다. 그래서 메인 스레드를
/// 막지 않도록 전용 직렬 큐에서만 JSContext를 쓴다(JSContext는 한 스레드에서만 써야 한다).
final class RuleEngine {
    static let shared = RuleEngine()

    private let queue = DispatchQueue(label: "voicenote.rules", qos: .userInitiated)
    private var context: JSContext?
    private(set) var loadError: String?

    private init() {
        queue.async { self.load() }
    }

    private func load() {
        guard let url = Bundle.module.url(forResource: "rules", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else {
            loadError = "rules.js를 찾을 수 없습니다"
            return
        }
        let ctx = JSContext()
        ctx?.exceptionHandler = { [weak self] _, exception in
            self?.loadError = exception?.toString() ?? "rules.js 오류"
        }
        ctx?.evaluateScript(source)
        context = ctx
    }

    /// 백그라운드에서 정리하고 결과를 메인 스레드로 돌려준다.
    func summarize(_ meeting: Meeting, completion: @escaping (Minutes?) -> Void) {
        guard let data = try? JSONEncoder().encode(meeting),
              let json = String(data: data, encoding: .utf8) else {
            completion(nil)
            return
        }
        queue.async {
            var result: Minutes?
            if let fn = self.context?.objectForKeyedSubscript("voicenoteRuleSummaryJSON"),
               !fn.isUndefined,
               let out = fn.call(withArguments: [json]),
               !out.isUndefined,
               let text = out.toString(),
               let outData = text.data(using: .utf8) {
                result = try? JSONDecoder().decode(Minutes.self, from: outData)
            }
            DispatchQueue.main.async { completion(result) }
        }
    }
}
