import Foundation

/// 회의록 내보내기 — 웹 앱의 .md 형식과 같다.
enum Export {
    static func safeName(_ s: String) -> String {
        let bad = CharacterSet(charactersIn: "\\/:*?\"<>|")
        let cleaned = s.components(separatedBy: bad).joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return cleaned.isEmpty ? "회의" : String(cleaned.prefix(60))
    }

    static func summaryMarkdown(_ m: Meeting, _ sum: Minutes, isAI: Bool) -> String {
        var L: [String] = []
        L.append("# \(m.displayTitle)")
        L.append("")
        let langs: String = {
            let sp = m.speech.label
            if let t = m.target, m.targetLang != "off" { return "\(sp) → \(t.label)" }
            return sp
        }()
        L.append("- 일시: \(Format.date(m.createdDate))")
        L.append("- 길이: \(Format.duration(m.durationMs))")
        L.append("- 언어: \(langs)")
        L.append("- 정리: \(isAI ? "기기 내 AI (Apple Intelligence)" : "규칙 기반(실시간)")")
        L.append("")
        if !sum.overview.isEmpty { L += ["## 개요", sum.overview, ""] }
        if !sum.background.isEmpty { L += ["## 배경"] + sum.background.map { "- \($0)" } + [""] }
        if !sum.discussion.isEmpty {
            L.append("## 주요 논의")
            for d in sum.discussion { L += ["### \(d.topic)"] + d.points.map { "- \($0)" } + [""] }
        }
        if !sum.decisions.isEmpty { L += ["## 결정 사항"] + sum.decisions.map { "- \($0)" } + [""] }
        if !sum.actions.isEmpty || !sum.plans.isEmpty {
            L.append("## 향후 계획")
            if !sum.actions.isEmpty {
                L += ["| 할 일 | 담당 | 기한 |", "| --- | --- | --- |"]
                for a in sum.actions {
                    L.append("| \(cell(a.task)) | \(a.owner.isEmpty ? "-" : cell(a.owner)) | \(a.due.isEmpty ? "-" : cell(a.due)) |")
                }
                L.append("")
            }
            if !sum.plans.isEmpty { L += sum.plans.map { "- \($0)" } + [""] }
        }
        if !sum.issues.isEmpty { L += ["## 미결 사항"] + sum.issues.map { "- \($0)" } + [""] }
        if !sum.keywords.isEmpty { L += ["키워드: \(sum.keywords.joined(separator: ", "))", ""] }
        return L.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines) + "\n"
    }

    static func fullMarkdown(_ m: Meeting, _ sum: Minutes, isAI: Bool) -> String {
        let transcript = m.segments.map { g in
            "**[\(Format.clock(g.atMs))]** \(g.text)" + (g.tr.isEmpty ? "" : "  \n→ \(g.tr)")
        }.joined(separator: "\n\n")
        return summaryMarkdown(m, sum, isAI: isAI) + "\n---\n\n## 전체 자막\n\n" + transcript + "\n"
    }

    private static func cell(_ s: String) -> String { s.replacingOccurrences(of: "|", with: "\\|") }
}
