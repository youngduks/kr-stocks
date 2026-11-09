import SwiftUI
import UniformTypeIdentifiers

/// 첫 화면 — 회의 목록.
struct MeetingListView: View {
    @EnvironmentObject private var store: MeetingStore
    @State private var path: [String] = []
    @State private var importing = false
    @State private var importError: String?

    /// 새 회의를 여는 경로 표시
    private static let newMeeting = "__new__"

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    Button {
                        path.append(Self.newMeeting)
                    } label: {
                        Label("새 회의 녹음", systemImage: "mic.circle.fill")
                            .font(.headline)
                    }
                }

                Section("회의 목록") {
                    if store.meetings.isEmpty {
                        Text("아직 회의가 없습니다. 위의 ‘새 회의 녹음’을 눌러 시작하세요.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(store.meetings) { m in
                        NavigationLink(value: m.id) { row(m) }
                    }
                    .onDelete { offsets in
                        let targets = offsets.map { store.meetings[$0] }
                        targets.forEach { store.delete($0) }
                    }
                }
            }
            .navigationTitle("보이스노트")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        importing = true
                    } label: {
                        Label("웹 백업 가져오기", systemImage: "square.and.arrow.down")
                    }
                }
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                switch result {
                case .success(let url):
                    do {
                        let m = try store.importBackup(from: url)
                        path.append(m.id)
                    } catch {
                        importError = "백업 파일을 열지 못했습니다: \(error.localizedDescription)"
                    }
                case .failure(let error):
                    importError = error.localizedDescription
                }
            }
            .alert("가져오기 실패", isPresented: Binding(get: { importError != nil }, set: { if !$0 { importError = nil } })) {
                Button("확인", role: .cancel) {}
            } message: {
                Text(importError ?? "")
            }
            .navigationDestination(for: String.self) { id in
                if id == Self.newMeeting {
                    MeetingScreen(meeting: Meeting(), store: store)
                } else if let m = store.meetings.first(where: { $0.id == id }) {
                    MeetingScreen(meeting: m, store: store)
                } else {
                    Text("회의를 찾을 수 없습니다.")
                }
            }
        }
    }

    private func row(_ m: Meeting) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(m.displayTitle)
                .font(.body.weight(.semibold))
                .lineLimit(1)
            Text("\(Format.date(m.createdDate)) · \(Format.duration(m.durationMs)) · \(m.segments.count)줄\(m.audioFiles.isEmpty ? "" : " · 녹음 있음")")
                .font(.caption)
                .foregroundStyle(.secondary)
            if let overview = (m.ai ?? m.rule)?.overview, !overview.isEmpty {
                Text(overview)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
}
