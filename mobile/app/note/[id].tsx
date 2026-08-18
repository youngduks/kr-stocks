import { useCallback, useEffect, useState } from "react";
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
import * as Clipboard from "expo-clipboard";
import { colors, radius, space } from "../../src/theme";
import { getNote, saveNote } from "../../src/lib/storage";
import { buildDigest, buildOutline } from "../../src/lib/outline";
import {
  ENGINE_STATUS_MESSAGE,
  MAX_BLOCKS,
  MAX_CHARS_PER_BLOCK,
  getLocalEngineStatus,
  refineNote,
  type RefineProgress,
} from "../../src/lib/appleLlm";
import { formatDate, formatDuration, noteToShareText } from "../../src/lib/format";
import { SummaryView } from "../../src/components/SummaryView";
import { TranscriptFeed } from "../../src/components/TranscriptFeed";
import { MODE_LABEL, isSummaryEmpty, type Note } from "../../src/types";

type Tab = "summary" | "transcript";

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<RefineProgress | null>(null);
  const [tab, setTab] = useState<Tab>("summary");

  useEffect(() => {
    let alive = true;
    void getNote(String(id)).then((n) => {
      if (!alive) return;
      setNote(n);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const copy = useCallback(async () => {
    if (!note) return;
    await Clipboard.setStringAsync(
      noteToShareText({
        title: note.title,
        mode: note.mode,
        createdAt: note.createdAt,
        durationSec: note.durationSec,
        summary: note.summary,
        finalNote: note.finalNote,
      }),
    );
    Alert.alert("복사 완료", "노트를 클립보드에 복사했습니다.");
  }, [note]);

  /** 규칙 기반으로만 정리된 노트를 기기 내 AI로 다시 다듬는다. */
  const retryRefine = useCallback(async () => {
    if (!note) return;

    const status = await getLocalEngineStatus();
    if (status !== "available") {
      Alert.alert("기기 내 AI를 쓸 수 없습니다", ENGINE_STATUS_MESSAGE[status]);
      return;
    }

    setProgress({ done: 0, total: 1, label: "준비 중" });
    try {
      const outline = buildOutline(
        note.segments,
        note.mode,
        note.durationSec * 1000,
      );
      const { blocks } = buildDigest(note.segments, MAX_CHARS_PER_BLOCK, MAX_BLOCKS);
      const finalNote = await refineNote({
        mode: note.mode,
        outline,
        blocks,
        durationSec: note.durationSec,
        onProgress: setProgress,
      });
      const next: Note = {
        ...note,
        title: finalNote.title,
        summary: finalNote,
        finalNote,
        engine: "apple-llm",
      };
      await saveNote(next);
      setNote(next);
    } catch (err) {
      Alert.alert(
        "정리 실패",
        err instanceof Error ? err.message : "다시 시도해 주세요.",
      );
    } finally {
      setProgress(null);
    }
  }, [note]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>노트를 찾을 수 없습니다.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const busy = progress !== null;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: note.title,
          headerRight: () => (
            <Pressable onPress={() => void copy()} hitSlop={12}>
              <Text style={styles.link}>복사</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.meta}>
        <Text style={styles.metaTag}>{MODE_LABEL[note.mode]}</Text>
        <Text style={styles.metaText}>
          {formatDate(note.createdAt)} · {formatDuration(note.durationSec)} ·
          자막 {note.segments.length}개
        </Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ["summary", "정리"],
            ["transcript", "전체 자막"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.tabOn]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.body}>
        {tab === "summary" ? (
          <ScrollView contentContainerStyle={styles.content}>
            {note.engine === "rules" && (
              <View style={styles.warn}>
                <Text style={styles.warnText}>
                  규칙 기반으로만 정리된 노트입니다. 말한 문장을 골라 분류한 것이라
                  문장이 다듬어져 있지 않습니다.
                </Text>
                <Pressable
                  style={styles.warnBtn}
                  onPress={() => void retryRefine()}
                  disabled={busy}
                >
                  {busy ? (
                    <View style={styles.warnBtnBusy}>
                      <ActivityIndicator size="small" color={colors.text} />
                      <Text style={styles.warnBtnText}>{progress?.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.warnBtnText}>기기 내 AI로 다듬기</Text>
                  )}
                </Pressable>
              </View>
            )}

            {isSummaryEmpty(note.summary) ? (
              <Text style={styles.empty}>정리된 내용이 없습니다.</Text>
            ) : (
              <SummaryView summary={note.summary!} mode={note.mode} />
            )}
          </ScrollView>
        ) : (
          <TranscriptFeed segments={note.segments} interim="" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  missing: { color: colors.sub, fontSize: 14 },
  link: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  meta: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: 2,
  },
  metaTag: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  metaText: { color: colors.dim, fontSize: 12 },
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
    marginBottom: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  content: { padding: space.lg },
  warn: {
    backgroundColor: "#3A2E1A",
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.lg,
    gap: space.md,
  },
  warnText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  warnBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.cardAlt,
  },
  warnBtnBusy: { flexDirection: "row", alignItems: "center", gap: space.sm },
  warnBtnText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  empty: {
    color: colors.dim,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 32,
  },
});
