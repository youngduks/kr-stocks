import AVFoundation
import Speech

/// 녹음 + 실시간 자막.
///
/// 마이크 입력 하나(AVAudioEngine 탭)를 **음성 인식과 녹음 파일에 동시에** 흘려보낸다.
/// 웹 버전에서 겪은 "녹음 파일 저장과 음성 인식이 마이크를 서로 뺏는" 문제가
/// 구조적으로 생기지 않는다.
///
/// 자막 줄 나누기: SFSpeechRecognizer는 한 요청 안에서 문장을 계속 이어 붙이기만 한다.
/// 그래서 말이 1.5초 끊기면(부분 결과가 더 안 오면) 지금까지를 한 줄로 확정하고
/// 새 요청으로 갈아탄다. 서버 인식의 1분 한도도 이 방식으로 자연히 피한다.
///
/// 메인 액터에 묶는다. 다른 스레드(인식 콜백·오디오 탭)에서 오는 것은
/// 전부 `Task { @MainActor in }`로 넘겨받는다.
@MainActor
final class Recorder: ObservableObject {
    enum State { case idle, recording, paused }

    @Published private(set) var state: State = .idle
    @Published private(set) var interim = ""
    @Published private(set) var onDevice = false
    @Published var errorMessage: String?

    /// 입력 레벨은 따로 둔다. 초당 8번 바뀌는 값이 화면 전체를 다시 그리지 않도록.
    let levelMonitor = LevelMonitor()

    /// 확정된 자막 한 줄 (텍스트, 언어 코드, 경과 ms)
    var onFinal: ((String, String, Double) -> Void)?

    private let engine = AVAudioEngine()
    private let sink = AudioSink()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var lang: Lang = .ko
    private var pending = ""
    private var commitTask: Task<Void, Never>?
    private var requestStartedAt = Date()
    private var fastFailures = 0
    private var interruptionObserver: NSObjectProtocol?

    private var accumulated: TimeInterval = 0
    private var runningSince: Date?

    /// 일시정지 구간을 뺀 녹음 시간(ms)
    var elapsedMs: Double {
        (accumulated + (runningSince.map { Date().timeIntervalSince($0) } ?? 0)) * 1000
    }

    /// 무음으로 판단하는 시간. 이만큼 새 부분 결과가 없으면 한 줄로 확정한다.
    private let silenceToCommit: UInt64 = 1_500_000_000
    /// 한 줄이 너무 길어지지 않게 — 쉬지 않고 말해도 이 길이에서 끊는다.
    private let maxLineLength = 220

    // ── 다른 스레드에서 불리는 클로저는 nonisolated 함수에서 만든다.
    // 메인 액터 안에서 만든 클로저는 Swift 6 런타임이 메인 액터 소속으로 보고,
    // 오디오 스레드에서 부르면 앱이 죽는다(AVAudioEngine 탭에서 알려진 문제).

    private nonisolated static func makeTap(_ sink: AudioSink) -> AVAudioNodeTapBlock {
        { buffer, _ in sink.handle(buffer) }
    }

    private nonisolated static func makeLevelHandler(_ recorder: Recorder) -> (Float) -> Void {
        { [weak recorder] value in
            Task { @MainActor in recorder?.levelMonitor.level = value }
        }
    }

    private nonisolated static func makeResultHandler(
        _ recorder: Recorder, request req: SFSpeechAudioBufferRecognitionRequest, lang: String
    ) -> (SFSpeechRecognitionResult?, Error?) -> Void {
        { [weak recorder] result, error in
            let text = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal ?? false
            let failed = error != nil
            Task { @MainActor in
                recorder?.handle(text: text, isFinal: isFinal, failed: failed, request: req, lang: lang)
            }
        }
    }

    init() {
        sink.onLevel = Recorder.makeLevelHandler(self)
        // 전화·알람 등이 끼어들면 일시정지한다.
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { [weak self] note in
            let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            Task { @MainActor in self?.handleInterruption(rawType: raw) }
        }
    }

    // MARK: 권한

    /// 권한 콜백은 다른 스레드에서 오므로 메인 액터 밖(nonisolated)에서 받는다.
    nonisolated static func requestPermissions() async -> Bool {
        let speech = await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
        let mic = await AVAudioApplication.requestRecordPermission()
        return speech && mic
    }

    // MARK: 녹음 제어

    /// - Parameters:
    ///   - resumeFromMs: 이어서 녹음할 때 앞 녹음의 길이
    ///   - audioURL: 녹음 파일 경로. nil이면 자막만 만든다.
    func start(lang: Lang, resumeFromMs: Double, audioURL: URL?) throws {
        guard state == .idle else { return }
        self.lang = lang
        accumulated = resumeFromMs / 1000
        errorMessage = nil
        fastFailures = 0

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker, .allowBluetooth])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else {
            throw RecorderError.noMicrophone
        }

        if let url = audioURL {
            // AAC(m4a) 32kbps — 1시간에 약 14MB
            let settings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: format.sampleRate,
                AVNumberOfChannelsKey: format.channelCount,
                AVEncoderBitRateKey: 32_000,
            ]
            let file = try AVAudioFile(forWriting: url, settings: settings,
                                       commonFormat: format.commonFormat, interleaved: format.isInterleaved)
            sink.setFile(file)
        }

        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 2048, format: format, block: Recorder.makeTap(sink))
        engine.prepare()
        try engine.start()

        recognizer = SFSpeechRecognizer(locale: lang.speechLocale)
        runningSince = Date()
        state = .recording
        UIApplicationIdle.keepAwake(true)
        beginRequest()
    }

    func pause() {
        guard state == .recording else { return }
        commitPending()
        endRequest()
        engine.pause()
        if let since = runningSince { accumulated += Date().timeIntervalSince(since) }
        runningSince = nil
        state = .paused
        levelMonitor.level = 0
    }

    func resume() throws {
        guard state == .paused else { return }
        try engine.start()
        runningSince = Date()
        state = .recording
        fastFailures = 0
        beginRequest()
    }

    /// 녹음을 끝낸다. 말하던 중이던 마지막 줄도 확정한다.
    func stop() {
        guard state != .idle else { return }
        if state == .recording { commitPending() }
        endRequest()
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        sink.setFile(nil) // 파일을 닫는다
        if let since = runningSince { accumulated += Date().timeIntervalSince(since) }
        runningSince = nil
        state = .idle
        interim = ""
        levelMonitor.level = 0
        UIApplicationIdle.keepAwake(false)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// 녹음 중 말하는 언어를 바꾼다(상대가 말할 차례일 때).
    func switchLanguage(_ newLang: Lang) {
        guard newLang != lang else { return }
        if state == .recording { commitPending() }
        lang = newLang
        recognizer = SFSpeechRecognizer(locale: newLang.speechLocale)
        if state == .recording {
            endRequest()
            beginRequest()
        }
    }

    // MARK: 인식 요청

    private func beginRequest() {
        guard let recognizer, recognizer.isAvailable else {
            errorMessage = "\(lang.label) 음성 인식을 지금 사용할 수 없습니다. 설정 > 일반 > 키보드 > 받아쓰기가 켜져 있는지 확인해 주세요."
            return
        }
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.addsPunctuation = true
        // 기기 내 인식이 되면 강제한다 — 음성이 밖으로 나가지 않고 1분 한도도 없다.
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = true
            onDevice = true
        } else {
            onDevice = false
        }
        request = req
        requestStartedAt = Date()
        sink.setRequest(req)

        // 인식 콜백은 다른 스레드에서 온다.
        task = recognizer.recognitionTask(with: req, resultHandler: Recorder.makeResultHandler(self, request: req, lang: lang.rawValue))
    }

    private func endRequest() {
        commitTask?.cancel()
        sink.setRequest(nil)
        // 이미 확정한 내용이 중복으로 다시 오지 않도록 끝내지(finish) 않고 취소한다.
        task?.cancel()
        request?.endAudio()
        task = nil
        request = nil
    }

    private func handle(text: String?, isFinal: Bool, failed: Bool, request req: SFSpeechAudioBufferRecognitionRequest, lang: String) {
        // 갈아탄 뒤 늦게 도착한 이전 요청의 결과는 버린다(이미 확정했다).
        guard req === request else { return }

        if let text {
            fastFailures = 0
            pending = text
            interim = text
            if isFinal || text.count >= maxLineLength {
                commitAndRestart()
                return
            }
            scheduleCommit()
        }

        if failed, state == .recording {
            // 무음 시간 초과·서버 1분 한도 등. 말한 것이 있으면 확정하고 조용히 다시 듣는다.
            let quick = Date().timeIntervalSince(requestStartedAt) < 1
            fastFailures = quick && pending.isEmpty ? fastFailures + 1 : 0
            if fastFailures >= 5 {
                errorMessage = "음성 인식이 계속 중단됩니다. 잠시 후 다시 시작해 주세요."
                pause()
                return
            }
            commitPending()
            endRequest()
            let delay: UInt64 = fastFailures > 0 ? 1_500_000_000 : 200_000_000
            Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: delay)
                guard let self, self.state == .recording, self.request == nil else { return }
                self.beginRequest()
            }
        }
    }

    private func scheduleCommit() {
        commitTask?.cancel()
        let wait = silenceToCommit
        commitTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: wait)
            guard !Task.isCancelled else { return }
            self?.commitAndRestart()
        }
    }

    private func commitAndRestart() {
        guard state == .recording else { return }
        commitPending()
        endRequest()
        beginRequest()
    }

    private func commitPending() {
        commitTask?.cancel()
        let text = pending.trimmingCharacters(in: .whitespacesAndNewlines)
        pending = ""
        interim = ""
        guard !text.isEmpty else { return }
        onFinal?(text, lang.rawValue, elapsedMs)
    }

    // MARK: 전화·알람 등 끼어들기

    private func handleInterruption(rawType: UInt?) {
        guard let rawType, let type = AVAudioSession.InterruptionType(rawValue: rawType) else { return }
        if type == .began, state == .recording {
            pause()
            errorMessage = "전화나 다른 앱 때문에 녹음이 일시정지되었습니다. ‘이어하기’를 누르세요."
        }
    }
}

/// 입력 레벨(0~1). 레벨 막대만 이걸 지켜본다.
@MainActor
final class LevelMonitor: ObservableObject {
    @Published var level: Float = 0
}

enum RecorderError: LocalizedError {
    case noMicrophone
    var errorDescription: String? {
        switch self {
        case .noMicrophone: return "마이크를 찾을 수 없습니다."
        }
    }
}

/// 오디오 스레드에서 불리는 부분. 요청·파일을 잠금으로 보호한다.
/// (Recorder 본체는 메인 액터에서만 다룬다.)
final class AudioSink: @unchecked Sendable {
    private let lock = NSLock()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var file: AVAudioFile?
    private var lastLevelAt = Date.distantPast
    var onLevel: ((Float) -> Void)?

    func setRequest(_ r: SFSpeechAudioBufferRecognitionRequest?) {
        lock.lock(); request = r; lock.unlock()
    }

    func setFile(_ f: AVAudioFile?) {
        lock.lock(); file = f; lock.unlock()
    }

    func handle(_ buffer: AVAudioPCMBuffer) {
        lock.lock()
        let r = request
        let f = file
        lock.unlock()
        r?.append(buffer)
        try? f?.write(from: buffer)

        // 입력 레벨 — 초당 8번만 화면에 보낸다.
        let now = Date()
        guard now.timeIntervalSince(lastLevelAt) > 0.12, let data = buffer.floatChannelData?[0] else { return }
        lastLevelAt = now
        let n = Int(buffer.frameLength)
        guard n > 0 else { return }
        var sum: Float = 0
        for i in 0..<n { sum += data[i] * data[i] }
        let rms = (sum / Float(n)).squareRoot()
        onLevel?(min(1, rms * 8))
    }
}
