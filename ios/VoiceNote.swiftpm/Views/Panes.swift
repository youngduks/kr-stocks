import SwiftUI

/// 실시간 자막 + 번역
struct TranscriptPane: View {
    let meeting: Meeting
    let interim: String

    var body: some View {
        ScrollViewReader { proxy in
            List {
                if meeting.segments.isEmpty && interim.isEmpty {
                    Text("녹음을 시작하면 여기에 자막이 나타납니다. 번역 언어를 고르면 자막 아래에 번역이 함께 붙습니다.")
                        .foregroundStyle(.secondary)
                        .listRowSeparator(.hidden)
                }
                ForEach(meeting.segments) { seg in
                    SegmentRow(segment: seg).id(seg.id)
                }
                if !interim.isEmpty {
                    Text(interim)
                        .italic()
                        .foregroundStyle(.secondary)
                        .id("interim")
                }
            }
            .listStyle(.plain)
            .onChange(of: meeting.segments.count) { _, _ in
                if let last = meeting.segments.last?.id {
                    withAnimation { proxy.scrollTo(last, anchor: .bottom) }
                }
            }
            .onChange(of: interim) { _, new in
                if !new.isEmpty { proxy.scrollTo("interim", anchor: .bottom) }
            }
        }
    }
}

struct SegmentRow: View {
    let segment: Segment

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(Format.clock(segment.atMs))
                .font(.caption2.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 42, alignment: .leading)
            VStack(alignment: .leading, spacing: 3) {
                (Text(segment.lang.uppercased() + "  ").font(.caption2.weight(.bold)).foregroundColor(.secondary)
                    + Text(segment.text))
                    .textSelection(.enabled)
                switch segment.trStatus {
                case "pending":
                    Text("번역 중…").font(.footnote).italic().foregroundStyle(.secondary)
                case "error":
                    Text("번역 실패").font(.footnote).foregroundStyle(.orange)
                default:
                    if !segment.tr.isEmpty {
                        Text(segment.tr).font(.subheadline).foregroundStyle(.blue).textSelection(.enabled)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }
}

/// 회의 정리 — 실시간(규칙 기반) / AI 정리
struct SummaryPane: View {
    @ObservedObject var controller: MeetingController

    var body: some View {
        VStack(spacing: 0) {
            Picker("정리 방식", selection: $controller.showAI) {
                Text("실시간").tag(false)
                Text("AI 정리").tag(true)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    content
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Divider()
            HStack {
                if controller.aiUnavailableReason == nil {
                    Button {
                        controller.runAI()
                    } label: {
                        Label(controller.meeting.ai == nil ? "AI로 정리하기" : "AI로 다시 정리", systemImage: "sparkles")
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(controller.aiRunning || controller.meeting.segments.isEmpty || controller.recorder.state != .idle)
                }
                Spacer()
                ShareLink(item: MeetingMarkdown(meeting: controller.meeting, useAI: controller.showAI),
                          preview: SharePreview(controller.meeting.displayTitle)) {
                    Label("내보내기", systemImage: "square.and.arrow.up")
                }
                .disabled(controller.meeting.segments.isEmpty)
            }
            .padding()
        }
    }

    @ViewBuilder
    private var content: some View {
        if controller.showAI {
            if controller.aiRunning {
                VStack(alignment: .leading, spacing: 10) {
                    Text("기기 안의 AI가 회의록을 쓰고 있습니다").font(.headline)
                    ProgressView(value: controller.aiProgress) { Text(controller.aiLabel).font(.footnote) }
                    Text("회의 내용은 이 기기 밖으로 나가지 않습니다.").font(.footnote).foregroundStyle(.secondary)
                }
            } else if let ai = controller.meeting.ai {
                MinutesView(minutes: ai)
                Text("Apple Intelligence가 기기 안에서 정리했습니다. AI 정리에도 오류가 있을 수 있으니 중요한 내용은 자막과 대조해 주세요.")
                    .font(.footnote).foregroundStyle(.secondary).padding(.top, 12)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text(controller.aiError == nil ? "AI 정리가 아직 없습니다" : "AI 정리를 하지 못했습니다").font(.headline)
                    Text(controller.aiError ?? controller.aiUnavailableReason ?? "녹음을 마치면 자동으로 정리합니다. 지금 바로 정리하려면 아래 ‘AI로 정리하기’를 누르세요.")
                        .foregroundStyle(.secondary)
                }
            }
        } else if let rule = controller.meeting.rule, !rule.isEmpty {
            MinutesView(minutes: rule)
            Text("실시간 정리는 말한 문장을 규칙으로 골라 분류한 것이라 문장이 다듬어져 있지 않습니다.")
                .font(.footnote).foregroundStyle(.secondary).padding(.top, 12)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Text("말을 시작하면 바로 정리됩니다").font(.headline)
                Text("배경 · 주요 논의 · 결정 사항 · 향후 계획 · 미결 사항으로 나눠 실시간으로 채워집니다.")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

/// 회의록 본문
struct MinutesView: View {
    let minutes: Minutes

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            if !minutes.overview.isEmpty {
                Text(minutes.overview)
                    .font(.body.weight(.semibold))
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.accentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
            }
            if !minutes.background.isEmpty {
                section("배경") { bullets(minutes.background, color: .gray) }
            }
            if !minutes.discussion.isEmpty {
                section("주요 논의") {
                    ForEach(Array(minutes.discussion.enumerated()), id: \.offset) { _, d in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(d.topic).font(.subheadline.weight(.bold))
                            bullets(d.points, color: .gray)
                        }
                    }
                }
            }
            if !minutes.decisions.isEmpty {
                section("결정 사항 \(minutes.decisions.count)") { bullets(minutes.decisions, color: .green) }
            }
            if !minutes.actions.isEmpty || !minutes.plans.isEmpty {
                section("향후 계획") {
                    ForEach(Array(minutes.actions.enumerated()), id: \.offset) { _, a in
                        HStack(alignment: .top) {
                            Text(a.task)
                            Spacer(minLength: 8)
                            if !a.owner.isEmpty { MiniTag(text: a.owner, color: .secondary) }
                            if !a.due.isEmpty { MiniTag(text: a.due, color: .orange) }
                        }
                        .padding(10)
                        .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
                    }
                    bullets(minutes.plans, color: .blue)
                }
            }
            if !minutes.issues.isEmpty {
                section("미결 사항 \(minutes.issues.count)") { bullets(minutes.issues, color: .orange) }
            }
            if !minutes.keywords.isEmpty {
                section("키워드") {
                    Text(minutes.keywords.joined(separator: " · ")).foregroundStyle(.secondary)
                }
            }
        }
        .textSelection(.enabled)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.weight(.bold)).foregroundStyle(.secondary)
            content()
        }
    }

    private func bullets(_ items: [String], color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Circle().fill(color).frame(width: 5, height: 5).offset(y: -2)
                    Text(item)
                }
            }
        }
    }
}

struct MiniTag: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text)
            .font(.caption2.weight(.bold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 5))
    }
}
