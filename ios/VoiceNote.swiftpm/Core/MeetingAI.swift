import Foundation

// AI 회의록 — Apple Foundation Models (iOS 26, Apple Intelligence 기기).
// 기기 안에서 무료로 돈다. 한국어를 지원한다.
//
// iOS 26 SDK가 없는 환경(구버전 Xcode·Swift Playgrounds)에서도 앱이 빌드되도록
// 전부 canImport / available 로 감쌌다. 그 경우 AI 회의록만 빠지고 나머지는 동작한다.

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26.0, *)
@Generable
struct GenTopic {
    @Guide(description: "주제 이름, 짧게")
    var topic: String
    @Guide(description: "이 주제에서 오간 핵심 내용")
    var points: [String]
}

@available(iOS 26.0, *)
@Generable
struct GenAction {
    @Guide(description: "해야 할 일")
    var task: String
    @Guide(description: "담당자. 자막에 없으면 빈 문자열")
    var owner: String
    @Guide(description: "기한. 자막에 없으면 빈 문자열")
    var due: String
}

@available(iOS 26.0, *)
@Generable
struct GenMinutes {
    @Guide(description: "짧은 회의 제목")
    var title: String
    @Guide(description: "회의 전체를 한 문장으로")
    var overview: String
    @Guide(description: "회의를 연 배경, 현황, 문제")
    var background: [String]
    @Guide(description: "이야기된 순서대로의 주요 논의 주제")
    var discussion: [GenTopic]
    @Guide(description: "명확히 결정된 것만. '논의했다'는 결정이 아니다")
    var decisions: [String]
    @Guide(description: "구체적인 할 일")
    var actions: [GenAction]
    @Guide(description: "개인 할 일이 아닌 향후 일정·방향")
    var plans: [String]
    @Guide(description: "결론 없이 남은 질문이나 다음으로 미룬 안건")
    var issues: [String]
    @Guide(description: "핵심 키워드, 5개 이내")
    var keywords: [String]
}

@available(iOS 26.0, *)
@MainActor
enum MeetingAI {
    static var isAvailable: Bool {
        if case .available = SystemLanguageModel.default.availability { return true }
        return false
    }

    static var unavailableReason: String {
        switch SystemLanguageModel.default.availability {
        case .available:
            return ""
        case .unavailable(let reason):
            switch reason {
            case .deviceNotEligible:
                return "이 기기는 Apple Intelligence를 지원하지 않습니다 (iPhone 15 Pro 이상, M1 이상 iPad 필요)."
            case .appleIntelligenceNotEnabled:
                return "설정 > Apple Intelligence 및 Siri 에서 Apple Intelligence를 켜 주세요."
            case .modelNotReady:
                return "AI 모델을 내려받는 중입니다. 잠시 후 다시 시도해 주세요."
            @unknown default:
                return "지금은 AI 회의록을 쓸 수 없습니다."
            }
        }
    }

    private static let instructions = """
    너는 꼼꼼한 회의 서기다. 음성 인식으로 만든 회의 자막을 회의록으로 정리한다.
    자막에는 오탈자가 있고 화자 구분이 없다. 명백한 오인식만 조용히 고치고,
    자막에 없는 내용은 절대 지어내지 마라. 해당 내용이 없으면 빈 목록으로 둔다.
    자막이 외국어여도 모든 내용은 한국어로 쓴다. 개조식으로 짧게 쓴다.
    """

    private static let noteInstructions = """
    너는 회의 서기다. 회의 자막 한 구간을 읽고 그 구간의 요점만 한국어 개조식으로 적는다.
    각 줄 앞에 [배경] [논의] [결정] [할일] [계획] [미결] 중 하나를 붙인다.
    할 일에는 담당자와 기한이 나오면 함께 적는다. 자막에 없는 내용은 쓰지 않는다.
    """

    /// 회의록을 만든다.
    ///
    /// 기기 내 모델은 한 번에 4,096토큰(입력+출력)만 다룬다. 긴 회의는 구간별 메모를
    /// 먼저 만들고(map) 그걸 합쳐 회의록을 쓴다(reduce). 분량 초과가 나면 구간을
    /// 반으로 줄여 다시 시도한다.
    static func summarize(_ meeting: Meeting, progress: @escaping (Double, String) -> Void) async throws -> Minutes {
        let lines = transcriptLines(meeting)
        guard !lines.isEmpty else { throw AIError.empty }

        var chunkChars = 1500
        for _ in 0..<3 {
            do {
                return try await attempt(lines: lines, chunkChars: chunkChars, progress: progress)
            } catch let error as LanguageModelSession.GenerationError {
                if case .exceededContextWindowSize = error {
                    chunkChars /= 2
                    continue
                }
                throw error
            }
        }
        throw AIError.tooLong
    }

    private static func attempt(lines: [String], chunkChars: Int, progress: @escaping (Double, String) -> Void) async throws -> Minutes {
        let chunks = pack(lines, maxChars: chunkChars)
        var body: String
        if chunks.count == 1 {
            body = "회의 자막:\n\(chunks[0])"
        } else {
            var notes: [String] = []
            for (i, chunk) in chunks.enumerated() {
                progress(Double(i) / Double(chunks.count + 1), "회의 내용 읽는 중 (\(i + 1)/\(chunks.count))")
                let session = LanguageModelSession(instructions: noteInstructions)
                let note = try await session.respond(to: "회의 자막 \(i + 1)/\(chunks.count) 구간:\n\(chunk)")
                notes.append(note.content)
            }
            body = "한 회의를 구간별로 정리한 메모:\n" + notes.enumerated()
                .map { "## 구간 \($0.offset + 1)\n\($0.element)" }
                .joined(separator: "\n\n")
            // 메모를 합친 것도 한도 안에 들어가야 한다. 넘치면 뒤쪽을 자르지 않고 구간마다 고르게 줄인다.
            if body.count > chunkChars * 2 {
                let per = max(200, chunkChars * 2 / max(1, notes.count))
                body = "한 회의를 구간별로 정리한 메모:\n" + notes.enumerated()
                    .map { "## 구간 \($0.offset + 1)\n\(String($0.element.prefix(per)))" }
                    .joined(separator: "\n\n")
            }
        }
        progress(0.85, "회의록 작성 중")
        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(to: body, generating: GenMinutes.self)
        progress(1, "완료")
        return Minutes(response.content)
    }

    /// 한국어가 충분히 있으면(원문이든 번역이든) 한국어로, 아니면 원문으로 넘긴다.
    private static func transcriptLines(_ meeting: Meeting) -> [String] {
        let segs = meeting.segments
        let koCount = segs.filter { $0.lang == "ko" || ($0.trLang == "ko" && !$0.tr.isEmpty) }.count
        let useKo = !segs.isEmpty && Double(koCount) / Double(segs.count) >= 0.8
        return segs.compactMap { s in
            let text = useKo ? (s.lang == "ko" ? s.text : s.tr) : s.text
            guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
            return "[\(Format.clock(s.atMs))] \(text)"
        }
    }

    private static func pack(_ lines: [String], maxChars: Int) -> [String] {
        var out: [String] = []
        var cur = ""
        for line in lines {
            if !cur.isEmpty && cur.count + line.count + 1 > maxChars {
                out.append(cur)
                cur = line
            } else {
                cur = cur.isEmpty ? line : cur + "\n" + line
            }
        }
        if !cur.isEmpty { out.append(cur) }
        return out
    }
}

@available(iOS 26.0, *)
extension Minutes {
    init(_ g: GenMinutes) {
        self.init()
        title = g.title
        overview = g.overview
        background = g.background
        discussion = g.discussion.map { Topic(topic: $0.topic, points: $0.points) }
        decisions = g.decisions
        actions = g.actions.map { ActionItem(task: $0.task, owner: $0.owner, due: $0.due) }
        plans = g.plans
        issues = g.issues
        keywords = Array(g.keywords.prefix(6))
        _engine = "apple-intelligence"
        _lang = "ko"
    }
}
#endif

enum AIError: LocalizedError {
    case empty, tooLong, unsupported(String)
    var errorDescription: String? {
        switch self {
        case .empty: return "정리할 자막이 없습니다."
        case .tooLong: return "회의가 너무 길어 기기 내 AI로 정리하지 못했습니다."
        case .unsupported(let why): return why
        }
    }
}

/// AI를 쓸 수 있는지 — iOS 26 SDK가 없는 환경에서도 컴파일되는 진입점.
enum AIGate {
    /// 쓸 수 없으면 이유, 쓸 수 있으면 nil
    @MainActor
    static var unavailableReason: String? {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return MeetingAI.isAvailable ? nil : MeetingAI.unavailableReason
        }
        #endif
        return "AI 회의록은 iOS 26 이상, Apple Intelligence 지원 기기에서 쓸 수 있습니다."
    }

    @MainActor
    static func summarize(_ meeting: Meeting, progress: @escaping (Double, String) -> Void) async throws -> Minutes {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return try await MeetingAI.summarize(meeting, progress: progress)
        }
        #endif
        throw AIError.unsupported(unavailableReason ?? "")
    }
}
