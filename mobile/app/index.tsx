import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "../src/theme";
import { deleteNote, listNotes } from "../src/lib/storage";
import { formatDate, formatDuration } from "../src/lib/format";
import { MODE_HINT, MODE_LABEL, VOICE_MODES } from "../src/types";
import type { NoteMeta, VoiceMode } from "../src/types";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [mode, setMode] = useState<VoiceMode>("meeting");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void listNotes().then((n) => {
        if (alive) setNotes(n);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const confirmDelete = (item: NoteMeta) => {
    Alert.alert("노트 삭제", `"${item.title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteNote(item.id);
          setNotes(await listNotes());
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.modeBox}>
            <Text style={styles.modeLabel}>녹음 유형</Text>
            <View style={styles.modeRow}>
              {VOICE_MODES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[styles.modeChip, mode === m && styles.modeChipOn]}
                >
                  <Text
                    style={[styles.modeChipText, mode === m && styles.modeChipTextOn]}
                  >
                    {MODE_LABEL[m]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.modeHint}>{MODE_HINT[mode]}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 저장된 노트가 없습니다</Text>
            <Text style={styles.emptyText}>
              아래 버튼을 눌러 첫 녹음을 시작해 보세요.{"\n"}
              말하는 동안 요약이 실시간으로 쌓입니다.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(`/note/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTag}>{MODE_LABEL[item.mode]}</Text>
              <Text style={styles.cardMeta}>
                {formatDate(item.createdAt)} · {formatDuration(item.durationSec)}
              </Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!!item.headline && (
              <Text style={styles.cardHeadline} numberOfLines={2}>
                {item.headline}
              </Text>
            )}
          </Pressable>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Pressable
          style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: "/record", params: { mode } })}
        >
          <View style={styles.startDot} />
          <Text style={styles.startText}>
            {MODE_LABEL[mode]} 녹음 시작
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: space.lg, paddingBottom: 140 },
  modeBox: { marginBottom: space.xl },
  modeLabel: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: space.sm,
  },
  modeRow: { flexDirection: "row", gap: space.sm },
  modeChip: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modeChipOn: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  modeChipText: { color: colors.sub, fontSize: 14, fontWeight: "600" },
  modeChipTextOn: { color: colors.text },
  modeHint: { color: colors.dim, fontSize: 12, marginTop: space.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  cardTag: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  cardMeta: { color: colors.dim, fontSize: 11 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  cardHeadline: {
    color: colors.sub,
    fontSize: 13,
    lineHeight: 19,
    marginTop: space.xs,
  },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  emptyText: {
    color: colors.dim,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: space.sm,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: 16,
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  startText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
