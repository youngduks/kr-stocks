import CoreTransferable
import UniformTypeIdentifiers

// 공유할 것들은 "공유 버튼을 누를 때" 만든다.
//
// 처음에는 화면을 그릴 때마다 회의록 문자열을 만들고 백업 JSON을 디스크에 썼다.
// 녹음 중에는 화면이 초당 여러 번 다시 그려지므로, 1시간 회의 내내 파일 쓰기가
// 쉬지 않고 일어나는 셈이었다. Transferable은 내보낼 때만 아래 클로저를 부른다.

/// 회의록 마크다운 (요약 + 전체 자막)
struct MeetingMarkdown: Transferable {
    let meeting: Meeting
    let useAI: Bool

    static var transferRepresentation: some TransferRepresentation {
        ProxyRepresentation(exporting: { $0.text })
    }

    var text: String {
        let isAI = useAI && meeting.ai != nil
        let sum = (isAI ? meeting.ai : meeting.rule) ?? Minutes()
        return Export.fullMarkdown(meeting, sum, isAI: isAI)
    }
}

/// 웹 앱에서 열 수 있는 백업(.json) — 키 이름이 웹과 같다.
struct MeetingBackup: Transferable {
    let meeting: Meeting

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .json) { item in
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("\(Export.safeName(item.meeting.displayTitle)).json")
            try JSONEncoder().encode(item.meeting).write(to: url, options: .atomic)
            return SentTransferredFile(url)
        }
    }
}
