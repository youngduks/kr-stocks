import Foundation

/// 회의 화면 하나의 두뇌. 녹음기·번역 줄·규칙 엔진·AI를 엮고 저장한다.
@MainActor
final class MeetingController: ObservableObject {
    @Published private(set) var meeting: Meeting
    @Published var showAI = false
    @Published private(set) var aiRunning = false
    @Published private(set) var aiProgress: Double = 0
    @Published private(set) var aiLabel = ""
    @Published var aiError: String?
    @Published var notice: String?

    let recorder = Recorder()
    /// 한국어 → 외국어
    let toForeign = TranslationLane()
    /// 외국어 → 한국어
    let toKorean = TranslationLane()

    private let store: MeetingStore
    private var ruleDirty = false
    private var ruleRunning = false
    private var ruleTimer: Timer?

    init(meeting: Meeting, store: MeetingStore) {
        self.meeting = meeting
        self.store = store
        showAI = meeting.ai != nil

        recorder.onFinal = { [weak self] text, lang, atMs in
            self?.addSegment(text: text, lang: lang, atMs: atMs)
        }
        let deliver: (String, String?, Lang) -> Void = { [weak self] id, text, target in
            self?.applyTranslation(segmentID: id, text: text, target: target)
        }
        toForeign.deliver = deliver
        toKorean.deliver = deliver
        updateLanes()

        // 규칙 기반 정리는 자막이 늘었을 때만, 1.5초마다 다시 계산한다.
        ruleTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refreshRuleIfNeeded() }
        }
        if meeting.rule == nil, !meeting.segments.isEmpty { ruleDirty = true }
    }

    func close() {
        ruleTimer?.invalidate()
        ruleTimer = nil
        if recorder.state != .idle { stop() }
    }

    // MARK: 언어

    var speech: Lang { meeting.speech }
    /// nil이면 번역 안 함
    var target: Lang? { meeting.targetLang == "off" ? nil : meeting.target }

    /// 번역 짝은 {한국어, 외국어 하나}만 허용한다.
    func setLanguages(speech: Lang, target: Lang?) {
        var t = target
        if speech == .ko {
            if let tt = t, tt == .ko { t = .en }
        } else if t != nil {
            t = .ko
        }
        meeting.speechLang = speech.rawValue
        meeting.targetLang = t?.rawValue ?? "off"
        updateLanes()
        if recorder.state == .recording { recorder.switchLanguage(speech) }
        save()
    }

    /// 상대가 말할 차례 — 두 언어를 맞바꾼다.
    func swapLanguages() {
        guard let t = target else { return }
        setLanguages(speech: t, target: speech)
    }

    private func updateLanes() {
        guard let t = target else {
            toForeign.setPair(source: nil, target: nil)
            toKorean.setPair(source: nil, target: nil)
            return
        }
        let foreign = speech == .ko ? t : speech
        toForeign.setPair(source: .ko, target: foreign)
        toKorean.setPair(source: foreign, target: .ko)
    }

    // MARK: 녹음

    func start(saveAudio: Bool) async {
        guard recorder.state == .idle else { return }
        guard await Recorder.requestPermissions() else {
            notice = "마이크와 음성 인식 권한이 필요합니다. 설정 앱 > 개인정보 보호에서 허용해 주세요."
            return
        }
        let name = saveAudio ? store.nextAudioName(for: meeting) : nil
        do {
            try recorder.start(lang: speech, resumeFromMs: meeting.durationMs,
                               audioURL: name.map { store.audioURL($0) })
            if let name {
                meeting.audioFiles.append(name)
                save()
            }
        } catch {
            notice = "녹음을 시작하지 못했습니다: \(error.localizedDescription)"
        }
    }

    func pause() { recorder.pause(); meeting.durationMs = recorder.elapsedMs; save() }

    func resume() {
        do { try recorder.resume() } catch { notice = "녹음을 이어 가지 못했습니다: \(error.localizedDescription)" }
    }

    func stop() {
        recorder.stop()
        meeting.durationMs = recorder.elapsedMs
        ruleDirty = true
        refreshRuleIfNeeded()
        save()
        // AI를 바로 쓸 수 있으면 자동으로 회의록을 만든다.
        if !meeting.segments.isEmpty, AIGate.unavailableReason == nil { runAI() }
    }

    func setTitle(_ title: String) {
        meeting.title = title
        save()
    }

    // MARK: 자막·번역

    private func addSegment(text: String, lang: String, atMs: Double) {
        var seg = Segment(atMs: atMs, text: text, lang: lang)
        let tgt = meeting.translationTarget(for: lang)
        if tgt != nil { seg.trStatus = "pending" }
        meeting.segments.append(seg)
        meeting.durationMs = recorder.elapsedMs
        ruleDirty = true
        save()
        if let tgt { enqueue(seg, to: tgt) }
    }

    private func enqueue(_ seg: Segment, to target: Lang) {
        let job = TranslationLane.Job(segmentID: seg.id, text: seg.text)
        if target == .ko { toKorean.enqueue(job) } else { toForeign.enqueue(job) }
    }

    private func applyTranslation(segmentID: String, text: String?, target: Lang) {
        guard let i = meeting.segments.firstIndex(where: { $0.id == segmentID }) else { return }
        if let text {
            meeting.segments[i].tr = text
            meeting.segments[i].trLang = target.rawValue
            meeting.segments[i].trStatus = "done"
        } else {
            meeting.segments[i].trStatus = "error"
        }
        ruleDirty = true
        save()
    }

    /// 번역이 빠졌거나 실패한 줄을 다시 번역한다.
    func retranslateMissing() {
        for seg in meeting.segments {
            guard let tgt = meeting.translationTarget(for: seg.lang),
                  !(seg.trStatus == "done" && seg.trLang == tgt.rawValue) else { continue }
            if let i = meeting.segments.firstIndex(where: { $0.id == seg.id }) {
                meeting.segments[i].trStatus = "pending"
            }
            enqueue(seg, to: tgt)
        }
    }

    var missingTranslations: Int {
        meeting.segments.filter { seg in
            guard let tgt = meeting.translationTarget(for: seg.lang) else { return false }
            return !(seg.trStatus == "done" && seg.trLang == tgt.rawValue) && seg.trStatus != "pending"
        }.count
    }

    // MARK: 정리

    private func refreshRuleIfNeeded() {
        guard ruleDirty, !ruleRunning else { return }
        ruleDirty = false
        ruleRunning = true
        let id = meeting.id
        RuleEngine.shared.summarize(meeting) { [weak self] minutes in
            Task { @MainActor in
                guard let self else { return }
                self.ruleRunning = false
                guard self.meeting.id == id, let minutes else { return }
                self.meeting.rule = minutes
                self.save()
            }
        }
    }

    var aiUnavailableReason: String? { AIGate.unavailableReason }

    func runAI() {
        guard !aiRunning, !meeting.segments.isEmpty else { return }
        if let why = AIGate.unavailableReason {
            aiError = why
            showAI = true
            return
        }
        aiRunning = true
        aiError = nil
        aiProgress = 0
        aiLabel = "준비 중"
        showAI = true
        let snapshot = meeting
        Task { @MainActor in
            do {
                let minutes = try await AIGate.summarize(snapshot) { [weak self] p, label in
                    self?.aiProgress = p
                    self?.aiLabel = label
                }
                self.meeting.ai = minutes
                self.meeting.aiAt = Date().timeIntervalSince1970 * 1000
                self.save()
            } catch {
                self.aiError = "AI 정리에 실패했습니다: \(error.localizedDescription)"
            }
            self.aiRunning = false
        }
    }

    // MARK: 저장·내보내기

    private func save() {
        guard !meeting.segments.isEmpty || !meeting.title.isEmpty || !meeting.audioFiles.isEmpty else { return }
        store.save(meeting)
    }

    var audioURLs: [URL] {
        meeting.audioFiles
            .map { store.audioURL($0) }
            .filter { FileManager.default.fileExists(atPath: $0.path) }
    }
}
