import SwiftUI

@main
struct VoiceNoteApp: App {
    @StateObject private var store = MeetingStore()

    var body: some Scene {
        WindowGroup {
            MeetingListView()
                .environmentObject(store)
        }
    }
}
