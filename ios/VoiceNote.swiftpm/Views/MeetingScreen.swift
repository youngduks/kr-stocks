import SwiftUI
import Translation

/// 회의 화면의 소유자. 컨트롤러는 화면이 살아 있는 동안 하나만 만든다.
struct MeetingScreen: View {
    @StateObject private var controller: MeetingController

    init(meeting: Meeting, store: MeetingStore) {
        _controller = StateObject(wrappedValue: MeetingController(meeting: meeting, store: store))
    }

    var body: some View {
        MeetingView(controller: controller,
                    recorder: controller.recorder,
                    toForeign: controller.toForeign,
                    toKorean: controller.toKorean)
    }
}

struct MeetingView: View {
    @ObservedObject var controller: MeetingController
    @ObservedObject var recorder: Recorder
    @ObservedObject var toForeign: TranslationLane
    @ObservedObject var toKorean: TranslationLane

    @AppStorage("saveAudio") private var saveAudio = true
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var tab: PaneTab = .transcript
    @State private var title = ""

    /// SwiftUI(iOS 18)에 `Tab` 타입이 생겨서 이름을 피한다.
    enum PaneTab { case transcript, summary }

    private var meeting: Meeting { controller.meeting }
    private var isRecording: Bool { recorder.state != .idle }

    var body: some View {
        VStack(spacing: 0) {
            controls
            Divider()
            if sizeClass == .regular {
                // 아이패드 — 자막과 정리를 나란히
                HStack(spacing: 0) {
                    TranscriptPane(meeting: meeting, interim: recorder.interim)
                    Divider()
                    SummaryPane(controller: controller)
                }
            } else {
                Picker("보기", selection: $tab) {
                    Text("자막·번역").tag(PaneTab.transcript)
                    Text("회의 정리").tag(PaneTab.summary)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)
                if tab == .transcript {
                    TranscriptPane(meeting: meeting, interim: recorder.interim)
                } else {
                    SummaryPane(controller: controller)
                }
            }
        }
        .navigationTitle(meeting.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isRecording)
        .toolbar { toolbarMenu }
        // 기기 내 번역 — 방향마다 세션 하나. 설정이 바뀌면 SwiftUI가 새 세션을 준다.
        .translationTask(toForeign.configuration) { session in
            await toForeign.run(session)
        }
        .translationTask(toKorean.configuration) { session in
            await toKorean.run(session)
        }
        .onAppear { title = meeting.title }
        .onDisappear { controller.close() }
        .onChange(of: recorder.state) { _, newState in
            // 녹음이 끝나면 정리 탭으로 넘겨 준다.
            if newState == .idle, !meeting.segments.isEmpty { tab = .summary }
        }
    }

    // MARK: 위쪽 조작부

    private var controls: some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("회의 제목 (비워 두면 자동)", text: $title)
                .font(.title3.weight(.semibold))
                .onSubmit { controller.setTitle(title) }
                .onChange(of: title) { _, new in controller.setTitle(new) }

            HStack(spacing: 8) {
                Picker("말하는 언어", selection: speechBinding) {
                    ForEach(Lang.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.menu)

                Button {
                    controller.swapLanguages()
                } label: {
                    Image(systemName: "arrow.left.arrow.right")
                }
                .buttonStyle(.bordered)
                .disabled(controller.target == nil)
                .accessibilityLabel("두 언어 바꾸기")

                Picker("번역", selection: targetBinding) {
                    ForEach(targetOptions, id: \.self) { code in
                        Text(code == "off" ? "번역 안 함" : (Lang(rawValue: code)?.label ?? code)).tag(code)
                    }
                }
                .pickerStyle(.menu)
                Spacer(minLength: 0)
            }

            HStack(spacing: 12) {
                TimelineView(.periodic(from: .now, by: 0.5)) { _ in
                    Text(Format.clock(isRecording ? recorder.elapsedMs : meeting.durationMs))
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .monospacedDigit()
                }
                LevelBar(monitor: recorder.levelMonitor, active: recorder.state == .recording)
                    .frame(width: 60, height: 6)
                Spacer()
                recordButtons
            }

            statusLine
        }
        .padding()
    }

    private var speechBinding: Binding<Lang> {
        // target이 nil(번역 안 함)이면 그대로 둔다. 짝 맞추기는 setLanguages가 한다.
        Binding(get: { controller.speech }, set: { controller.setLanguages(speech: $0, target: controller.target) })
    }

    private var targetBinding: Binding<String> {
        Binding(get: { meeting.targetLang }, set: { code in
            controller.setLanguages(speech: controller.speech, target: code == "off" ? nil : Lang(rawValue: code))
        })
    }

    private var targetOptions: [String] {
        (controller.speech == .ko ? Lang.foreign.map(\.rawValue) : ["ko"]) + ["off"]
    }

    @ViewBuilder
    private var recordButtons: some View {
        switch recorder.state {
        case .idle:
            Button {
                Task { await controller.start(saveAudio: saveAudio) }
            } label: {
                Label(meeting.segments.isEmpty ? "녹음 시작" : "이어서 녹음", systemImage: "record.circle")
                    .font(.headline)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        case .recording:
            Button("일시정지") { controller.pause() }
                .buttonStyle(.bordered)
            Button {
                controller.stop()
            } label: {
                Label("종료", systemImage: "stop.fill")
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        case .paused:
            Button("이어하기") { controller.resume() }
                .buttonStyle(.borderedProminent)
            Button {
                controller.stop()
            } label: {
                Label("종료", systemImage: "stop.fill")
            }
            .buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    private var statusLine: some View {
        let messages = [recorder.errorMessage, controller.notice, toForeign.problem, toKorean.problem].compactMap { $0 }
        if let first = messages.first {
            HStack(alignment: .top) {
                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
                Text(first).font(.footnote)
                Spacer(minLength: 0)
                Button {
                    recorder.errorMessage = nil
                    controller.notice = nil
                } label: { Image(systemName: "xmark") }
                .buttonStyle(.plain)
            }
            .padding(10)
            .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
        } else {
            HStack(spacing: 6) {
                Chip(text: recorder.onDevice ? "음성 인식 · 기기 내" : "음성 인식", on: true)
                Chip(text: controller.target == nil ? "번역 꺼짐" : "번역 · 기기 내", on: controller.target != nil)
                Chip(text: controller.aiUnavailableReason == nil ? "AI 회의록 · 기기 내" : "AI 회의록 · 미지원", on: controller.aiUnavailableReason == nil)
            }
        }
    }

    // MARK: 오른쪽 위 메뉴

    @ToolbarContentBuilder
    private var toolbarMenu: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                // 공유 내용은 누를 때 만든다(MeetingMarkdown·MeetingBackup).
                ShareLink(item: MeetingMarkdown(meeting: meeting, useAI: controller.showAI),
                          preview: SharePreview(meeting.displayTitle)) {
                    Label("회의록 공유 (.md)", systemImage: "doc.text")
                }
                ShareLink(item: MeetingBackup(meeting: meeting),
                          preview: SharePreview("\(meeting.displayTitle).json")) {
                    Label("웹 앱용 백업 (.json)", systemImage: "arrow.up.doc")
                }
                ForEach(Array(controller.audioURLs.enumerated()), id: \.offset) { i, url in
                    ShareLink(item: url) {
                        Label(controller.audioURLs.count > 1 ? "녹음 파일 \(i + 1)" : "녹음 파일", systemImage: "waveform")
                    }
                }
                if controller.missingTranslations > 0 {
                    Button {
                        controller.retranslateMissing()
                    } label: {
                        Label("빠진 번역 다시 하기 (\(controller.missingTranslations))", systemImage: "arrow.clockwise")
                    }
                }
                Toggle(isOn: $saveAudio) {
                    Label("녹음 파일 저장", systemImage: "internaldrive")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }
}

// MARK: - 작은 부품

struct LevelBar: View {
    @ObservedObject var monitor: LevelMonitor
    let active: Bool
    private var level: Float { active ? monitor.level : 0 }
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.2))
                Capsule().fill(Color.green).frame(width: geo.size.width * CGFloat(level))
            }
        }
        .animation(.linear(duration: 0.1), value: level)
        .accessibilityHidden(true)
    }
}

struct Chip: View {
    let text: String
    let on: Bool
    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(on ? Color.green : Color.gray).frame(width: 6, height: 6)
            Text(text).font(.caption2)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.secondary.opacity(0.12), in: Capsule())
    }
}
