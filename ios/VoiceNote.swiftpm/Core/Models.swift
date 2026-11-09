import Foundation

// 자료 구조는 웹 앱(public/voicenote)의 회의 JSON과 키 이름까지 똑같이 맞췄다.
// 그래서 웹의 "백업(.json)"을 아이폰에서 열 수 있고, 그 반대도 된다.
// 규칙 엔진(rules.js)도 이 JSON을 그대로 받는다.

enum Lang: String, CaseIterable, Identifiable, Codable {
    case ko, en, ja, zh

    var id: String { rawValue }

    var label: String {
        switch self {
        case .ko: return "한국어"
        case .en: return "영어"
        case .ja: return "일본어"
        case .zh: return "중국어"
        }
    }

    var short: String { rawValue.uppercased() }

    /// 음성 인식 로케일
    var speechLocale: Locale {
        switch self {
        case .ko: return Locale(identifier: "ko-KR")
        case .en: return Locale(identifier: "en-US")
        case .ja: return Locale(identifier: "ja-JP")
        case .zh: return Locale(identifier: "zh-CN")
        }
    }

    /// 번역 언어
    var language: Locale.Language {
        Locale.Language(identifier: self == .zh ? "zh-Hans" : rawValue)
    }

    static let foreign: [Lang] = [.en, .ja, .zh]
}

struct Segment: Codable, Identifiable, Equatable {
    var id: String
    /// 녹음 시작 기준 경과 ms (웹과 같은 단위)
    var atMs: Double
    var text: String
    /// "ko" | "en" | "ja" | "zh"
    var lang: String
    var tr: String = ""
    var trLang: String = ""
    /// "" | "pending" | "done" | "error"
    var trStatus: String = ""

    init(id: String = UUID().uuidString, atMs: Double, text: String, lang: String) {
        self.id = id
        self.atMs = atMs
        self.text = text
        self.lang = lang
    }

    // 웹 백업에는 일부 키가 빠져 있을 수 있어서 직접 푼다.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        atMs = try c.decodeIfPresent(Double.self, forKey: .atMs) ?? 0
        text = try c.decodeIfPresent(String.self, forKey: .text) ?? ""
        lang = try c.decodeIfPresent(String.self, forKey: .lang) ?? "ko"
        tr = try c.decodeIfPresent(String.self, forKey: .tr) ?? ""
        trLang = try c.decodeIfPresent(String.self, forKey: .trLang) ?? ""
        trStatus = try c.decodeIfPresent(String.self, forKey: .trStatus) ?? ""
    }
}

struct Topic: Codable, Hashable {
    var topic: String
    var points: [String]
}

struct ActionItem: Codable, Hashable {
    var task: String
    var owner: String
    var due: String
}

/// 회의록. 규칙 기반·AI 정리 모두 이 모양이다.
struct Minutes: Codable, Equatable {
    var title = ""
    var overview = ""
    var background: [String] = []
    var discussion: [Topic] = []
    var decisions: [String] = []
    var actions: [ActionItem] = []
    var plans: [String] = []
    var issues: [String] = []
    var keywords: [String] = []
    /// "apple-intelligence" 등 — 화면에 누가 정리했는지 표시
    var _engine: String?
    var _lang: String?

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        overview = try c.decodeIfPresent(String.self, forKey: .overview) ?? ""
        background = try c.decodeIfPresent([String].self, forKey: .background) ?? []
        discussion = try c.decodeIfPresent([Topic].self, forKey: .discussion) ?? []
        decisions = try c.decodeIfPresent([String].self, forKey: .decisions) ?? []
        actions = try c.decodeIfPresent([ActionItem].self, forKey: .actions) ?? []
        plans = try c.decodeIfPresent([String].self, forKey: .plans) ?? []
        issues = try c.decodeIfPresent([String].self, forKey: .issues) ?? []
        keywords = try c.decodeIfPresent([String].self, forKey: .keywords) ?? []
        _engine = try c.decodeIfPresent(String.self, forKey: ._engine)
        _lang = try c.decodeIfPresent(String.self, forKey: ._lang)
    }

    var isEmpty: Bool {
        overview.isEmpty && background.isEmpty && discussion.isEmpty && decisions.isEmpty
            && actions.isEmpty && plans.isEmpty && issues.isEmpty
    }
}

struct Meeting: Codable, Identifiable {
    var id: String
    var title: String = ""
    /// 웹과 같은 단위(epoch ms)
    var createdAt: Double
    var durationMs: Double = 0
    var speechLang: String = "ko"
    /// "en" | "ja" | "zh" | "ko" | "off"
    var targetLang: String = "en"
    var segments: [Segment] = []
    var rule: Minutes?
    var ai: Minutes?
    var aiAt: Double?
    /// 웹 호환용(웹은 IndexedDB 녹음 개수). 아이폰은 audioFiles를 쓴다.
    var audioParts: Int = 0
    /// 아이폰 전용 — Documents/meetings 안의 녹음 파일 이름들
    var audioFiles: [String] = []

    init() {
        id = UUID().uuidString
        createdAt = Date().timeIntervalSince1970 * 1000
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        createdAt = try c.decodeIfPresent(Double.self, forKey: .createdAt) ?? Date().timeIntervalSince1970 * 1000
        durationMs = try c.decodeIfPresent(Double.self, forKey: .durationMs) ?? 0
        speechLang = try c.decodeIfPresent(String.self, forKey: .speechLang) ?? "ko"
        targetLang = try c.decodeIfPresent(String.self, forKey: .targetLang) ?? "en"
        segments = try c.decodeIfPresent([Segment].self, forKey: .segments) ?? []
        rule = try c.decodeIfPresent(Minutes.self, forKey: .rule)
        ai = try c.decodeIfPresent(Minutes.self, forKey: .ai)
        aiAt = try c.decodeIfPresent(Double.self, forKey: .aiAt)
        audioParts = try c.decodeIfPresent(Int.self, forKey: .audioParts) ?? 0
        audioFiles = try c.decodeIfPresent([String].self, forKey: .audioFiles) ?? []
    }

    var createdDate: Date { Date(timeIntervalSince1970: createdAt / 1000) }

    var displayTitle: String {
        if !title.isEmpty { return title }
        if let t = ai?.title, !t.isEmpty { return t }
        if let t = rule?.title, !t.isEmpty { return t }
        return "\(Format.date(createdDate).prefix(10)) 회의"
    }

    var speech: Lang { Lang(rawValue: speechLang) ?? .ko }
    var target: Lang? { Lang(rawValue: targetLang) }

    /// 번역 짝은 {한국어, 외국어 하나}. 줄의 언어를 보고 반대편으로 옮긴다. (웹과 같은 규칙)
    func translationTarget(for lang: String) -> Lang? {
        guard targetLang != "off" else { return nil }
        let foreign = speechLang == "ko" ? targetLang : speechLang
        return lang == "ko" ? Lang(rawValue: foreign) : .ko
    }
}

enum Format {
    static func clock(_ ms: Double) -> String {
        let t = max(0, Int(ms / 1000))
        let h = t / 3600, m = (t % 3600) / 60, s = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)
    }

    static func duration(_ ms: Double) -> String {
        if ms < 60_000 { return "\(Int(ms / 1000))초" }
        let m = Int((ms / 60_000).rounded())
        return m < 60 ? "\(m)분" : "\(m / 60)시간 \(m % 60)분"
    }

    static func date(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ko_KR")
        f.dateFormat = "yyyy.MM.dd HH:mm"
        return f.string(from: d)
    }
}
