import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../theme";
import type { RecorderStatus } from "../hooks/useLiveTranscript";

type Props = {
  status: RecorderStatus;
  level: number;
  busy: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
};

/** 입력 레벨을 감싸는 링. 마이크가 실제로 소리를 받고 있는지 눈으로 확인할 수 있게. */
function LevelRing({ level, active }: { level: number; active: boolean }) {
  const scale = active ? 1 + level * 0.35 : 1;
  return (
    <View
      style={[
        styles.ring,
        {
          transform: [{ scale }],
          borderColor: active ? colors.danger : colors.border,
          opacity: active ? 0.35 + level * 0.5 : 0.4,
        },
      ]}
    />
  );
}

export function RecordControls({
  status,
  level,
  busy,
  onStart,
  onPause,
  onResume,
  onFinish,
}: Props) {
  const recording = status === "recording";

  if (status === "idle") {
    return (
      <View style={styles.bar}>
        <Pressable
          style={({ pressed }) => [styles.mainBtn, pressed && styles.pressed]}
          onPress={onStart}
          accessibilityLabel="녹음 시작"
        >
          <View style={styles.recDot} />
        </Pressable>
        <Text style={styles.hint}>탭하면 녹음이 시작됩니다</Text>
      </View>
    );
  }

  if (status === "finished") {
    return (
      <View style={styles.bar}>
        <Text style={styles.hint}>
          {busy ? "최종 노트를 정리하는 중…" : "녹음이 끝났습니다"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
          onPress={recording ? onPause : onResume}
          accessibilityLabel={recording ? "일시정지" : "이어서 녹음"}
        >
          <Text style={styles.sideBtnText}>
            {recording ? "일시정지" : "이어하기"}
          </Text>
        </Pressable>

        <View style={styles.mainWrap}>
          <LevelRing level={level} active={recording} />
          <Pressable
            style={({ pressed }) => [
              styles.mainBtn,
              recording && styles.mainBtnLive,
              pressed && styles.pressed,
            ]}
            onPress={onFinish}
            disabled={busy}
            accessibilityLabel="녹음 종료"
          >
            <View style={styles.stopSquare} />
          </Pressable>
        </View>

        <View style={styles.sideBtnGhost} />
      </View>
      <Text style={styles.hint}>
        {recording ? "가운데 버튼을 누르면 종료됩니다" : "일시정지됨"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: space.lg,
    alignItems: "center",
    gap: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: space.xl,
  },
  mainWrap: { alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
  },
  mainBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtnLive: { backgroundColor: colors.danger, borderColor: colors.danger },
  pressed: { opacity: 0.7 },
  recDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.danger,
  },
  stopSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  sideBtn: {
    width: 88,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  sideBtnGhost: { width: 88 },
  sideBtnText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  hint: { color: colors.dim, fontSize: 12 },
});
