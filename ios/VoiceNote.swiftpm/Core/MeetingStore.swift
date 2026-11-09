import Foundation

/// 회의 저장소 — Documents/meetings/<id>.json 과 녹음 파일(<id>-<n>.m4a).
/// 전부 이 기기 안에만 있다.
final class MeetingStore: ObservableObject {
    @Published private(set) var meetings: [Meeting] = []

    let directory: URL

    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        directory = docs.appendingPathComponent("meetings", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        reload()
    }

    func reload() {
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        let decoder = JSONDecoder()
        meetings = files
            .filter { $0.pathExtension == "json" }
            .compactMap { url in
                guard let data = try? Data(contentsOf: url) else { return nil }
                return try? decoder.decode(Meeting.self, from: data)
            }
            .sorted { $0.createdAt > $1.createdAt }
    }

    func save(_ meeting: Meeting) {
        guard let data = try? JSONEncoder().encode(meeting) else { return }
        try? data.write(to: jsonURL(meeting.id), options: .atomic)
        if let i = meetings.firstIndex(where: { $0.id == meeting.id }) {
            meetings[i] = meeting
        } else {
            meetings.insert(meeting, at: 0)
        }
    }

    func delete(_ meeting: Meeting) {
        try? FileManager.default.removeItem(at: jsonURL(meeting.id))
        for name in meeting.audioFiles {
            try? FileManager.default.removeItem(at: directory.appendingPathComponent(name))
        }
        meetings.removeAll { $0.id == meeting.id }
    }

    /// 다음 녹음 조각의 파일 이름. "이어서 녹음"하면 조각이 하나씩 늘어난다.
    func nextAudioName(for meeting: Meeting) -> String {
        "\(meeting.id)-\(meeting.audioFiles.count).m4a"
    }

    func audioURL(_ name: String) -> URL {
        directory.appendingPathComponent(name)
    }

    /// 웹 앱의 백업(.json)을 가져온다. 녹음 파일은 웹 브라우저에만 있으므로 오지 않는다.
    func importBackup(from url: URL) throws -> Meeting {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        var meeting = try JSONDecoder().decode(Meeting.self, from: Data(contentsOf: url))
        if meetings.contains(where: { $0.id == meeting.id }) { meeting.id = UUID().uuidString }
        meeting.audioParts = 0
        meeting.audioFiles = []
        save(meeting)
        return meeting
    }

    private func jsonURL(_ id: String) -> URL {
        directory.appendingPathComponent("\(id).json")
    }
}
