import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";
import { formatClock } from "../lib/format";
import type { Segment } from "../types";

type Props = {
  segments: Segment[];
  interim: string;
  showTimestamps?: boolean;
};

export function TranscriptFeed({
  segments,
  interim,
  showTimestamps = true,
}: Props) {
  const ref = useRef<ScrollView>(null);
  const atBottom = useRef(true);

  useEffect(() => {
    if (atBottom.current) ref.current?.scrollToEnd({ animated: true });
  }, [segments.length, interim]);

  return (
    <ScrollView
      ref={ref}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        atBottom.current =
          contentOffset.y + layoutMeasurement.height >= contentSize.height - 48;
      }}
      scrollEventThrottle={200}
    >
      {segments.length === 0 && !interim && (
        <Text style={styles.empty}>말을 시작하면 여기에 자막이 나타납니다.</Text>
      )}
      {segments.map((s) => (
        <View key={s.id} style={styles.row}>
          {showTimestamps && (
            <Text style={styles.time}>{formatClock(s.atMs)}</Text>
          )}
          <Text style={styles.text}>{s.text}</Text>
        </View>
      ))}
      {!!interim && (
        <View style={styles.row}>
          {showTimestamps && <Text style={styles.time}>···</Text>}
          <Text style={[styles.text, styles.interim]}>{interim}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xl },
  row: { flexDirection: "row", marginBottom: space.md },
  time: {
    color: colors.dim,
    fontSize: 11,
    width: 44,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  text: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 23 },
  interim: { color: colors.sub, fontStyle: "italic" },
  empty: {
    color: colors.dim,
    fontSize: 14,
    textAlign: "center",
    marginTop: space.xl,
  },
});
