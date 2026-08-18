import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { colors, radius, space } from "../src/theme";
import { useLiveTranscript } from "../src/hooks/useLiveTranscript";
import { useLocalSummary } from "../src/hooks/useLocalSummary";
import { SummaryView } from "../src/components/SummaryView";
import { TranscriptFeed } from "../src/components/TranscriptFeed";
import { RecordControls } from "../src/components/RecordControls";
import { formatClock } from "../src/lib/format";
import { newNoteId, saveNote } from "../src/lib/storage";
import {
  MODE_LABEL,
  isSummaryEmpty,
  type Note,
  type Segment,
  type VoiceMode,
} from "../src/types";

/** stop() 직후 도착하는 마지막 확정 자막을 기다리는 시간. */
const FINAL_RESULT_GRACE_MS = 1200;

type Tab = "summary" | "transcript";

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: VoiceMode = params.mode === "interview" ? "interview" : "meeting";

  useKeepAwake();

  const rec = useLiveTranscript("ko-KR");
  const sum = useLocalSummary(mode);
  const [tab, setTab] = useState<Tab>("summary");
  const [saving, setSaving] = useState(false);

  const noteId = useRef(newNoteId());
  const segmentsRef = useRef<Segment[]>([]);
  const elapsedRef = useRef(0);
  const autoStarted = useRef(false);

  useEffect(() => {
    segmentsRef.current = rec.segments;
    elapsedRef.current = rec.elapsedMs;
    sum.sync(rec.segments, rec.elapsedMs);
  }, [rec.segments, rec.elapsedMs, sum]);

  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    void rec.start();
  }, [rec]);

  const discard = useCallback(() => {
    Alert.alert("녹음 취소", "지금까지의 내용이 저장되지 않고 사라집니다.", [
      { text: "계속 녹음", style: "cancel" },
      {
        text: "취소하고 나가기",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  }, [router]);

  const handleFinish = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rec.finish();
    setSaving(true);

    await new Promise((r) => setTimeout(r, FINAL_RESULT_GRACE_MS));

    const segments = segmentsRef.current;
    const durationSec = Math.round(elapsedRef.current / 1000);

    if (segments.length === 0) {
      setSaving(false);
      Alert.alert("녹음된 내용이 없습니다", "자막이 하나도 인식되지 않았습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
      return;
    }

    // finalize는 실패해도 규칙 기반 결과를 돌려주므로 노트를 잃지 않는다.
    const { note: finalNote, engine } = await sum.finalize(segments, durationSec);

    const note: Note = {
      id: noteId.current,
      mode,
      title: finalNote.title,
      createdAt: Date.now() - durationSec * 1000,
      durationSec,
      segments,
      summary: finalNote,
      finalNote,
      engine,
    };

    await saveNote(note);
    setSaving(false);
    router.replace(`/note/${note.id}`);
  }, [mode, rec, router, sum]);

  const statusLabel = saving
    ? (sum.progress?.label ?? "정리하는 중")
    : rec.status === "recording"
      ? "듣는 중"
      : rec.status === "paused"
        ? "일시정지"
        : "대기";

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: `${MODE_LABEL[mode]} 녹음`,
          headerRight: () =>
            rec.status === "finished" ? null : (
              <Pressable onPress={discard} hitSlop={12}>
                <Text style={styles.cancel}>취소</Text>
              </Pressable>
            ),
        }}
      />

      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor:
                  rec.status === "recording" ? colors.danger : colors.dim,
              },
            ]}
          />
          <Text style={styles.clock}>{formatClock(rec.elapsedMs)}</Text>
        </View>
        <View style={styles.statusRight}>
          {saving && <ActivityIndicator size="small" color={colors.accent} />}
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      {!!rec.error && (
        <Pressable style={styles.banner} onPress={rec.clearError}>
          <Text style={styles.bannerText}>{rec.error}</Text>
        </Pressable>
      )}

      <View style={styles.tabs}>
        {(
          [
            ["summary", "실시간 정리"],
            ["transcript", "자막"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.tabOn]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
              {label}
              {key === "transcript" && rec.segments.length > 0
                ? ` ${rec.segments.length}`
                : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.body}>
        {tab === "summary" ? (
          <ScrollView contentContainerStyle={styles.summaryContent}>
            {isSummaryEmpty(sum.outline) ? (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderTitle}>
                  말을 시작하면 바로 정리됩니다
                </Text>
                <Text style={styles.placeholderText}>
                  녹음 중에는 기기 안에서 즉시 정리하고,{"\n"}
                  끝나면 한 번 더 다듬어 노트를 만듭니다.
                </Text>
              </View>
            ) : (
              <>
                <SummaryView summary={sum.outline} mode={mode} compact />
                <View style={styles.summaryFoot}>
                  <Text style={styles.summaryFootText}>
                    녹음 중 정리는 말한 문장을 그대로 골라낸 것입니다. 종료 후 다듬어집니다.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        ) : (
          <TranscriptFeed segments={rec.segments} interim={rec.interim} />
        )}
      </View>

      <View style={{ paddingBottom: insets.bottom }}>
        <RecordControls
          status={rec.status}
          level={rec.level}
          busy={saving}
          onStart={() => void rec.start()}
          onPause={rec.pause}
          onResume={rec.resume}
          onFinish={() => void handleFinish()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  cancel: { color: colors.sub, fontSize: 15 },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: space.sm },
  statusRight: { flexDirection: "row", alignItems: "center", gap: space.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  clock: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statusText: { color: colors.sub, fontSize: 12 },
  banner: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: "#3A1D20",
    borderRadius: radius.sm,
    padding: space.md,
  },
  bannerText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  tabs: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  tab: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  tabOn: { backgroundColor: colors.accentDim },
  tabText: { color: colors.sub, fontSize: 13, fontWeight: "600" },
  tabTextOn: { color: colors.text },
  body: {
    flex: 1,
    marginHorizontal: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  summaryContent: { padding: space.lg },
  placeholder: { alignItems: "center", paddingVertical: 40 },
  placeholderTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  placeholderText: {
    color: colors.dim,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: space.sm,
  },
  summaryFoot: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
    marginTop: space.sm,
  },
  summaryFootText: { color: colors.dim, fontSize: 11, lineHeight: 16 },
});
