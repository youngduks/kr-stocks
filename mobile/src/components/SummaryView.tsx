import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../theme";
import type { LiveSummary, VoiceMode } from "../types";

type Props = {
  summary: LiveSummary;
  mode: VoiceMode;
  /** 녹음 중에는 화면을 덜 흔들도록 인용구를 접는다. */
  compact?: boolean;
};

const SECTION_LABEL: Record<VoiceMode, { decisions: string; actions: string }> = {
  meeting: { decisions: "결정사항", actions: "액션아이템" },
  interview: { decisions: "확인된 사실", actions: "추가 확인 필요" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text, accent }: { text: string; accent?: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.dot, accent ? { backgroundColor: accent } : null]} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function SummaryView({ summary, mode, compact = false }: Props) {
  const labels = SECTION_LABEL[mode];

  return (
    <View>
      {!!summary.headline && (
        <View style={styles.headlineBox}>
          <Text style={styles.headline}>{summary.headline}</Text>
        </View>
      )}

      {summary.topics.map((topic, i) => (
        <Section key={`${topic.title}-${i}`} title={topic.title}>
          {topic.points.map((p, j) => (
            <Bullet key={j} text={p} />
          ))}
        </Section>
      ))}

      {summary.decisions.length > 0 && (
        <Section title={labels.decisions}>
          {summary.decisions.map((d, i) => (
            <Bullet key={i} text={d} accent={colors.live} />
          ))}
        </Section>
      )}

      {summary.actionItems.length > 0 && (
        <Section title={labels.actions}>
          {summary.actionItems.map((a, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.warn }]} />
              <Text style={styles.bulletText}>
                {a.text}
                {a.owner ? <Text style={styles.owner}>  {a.owner}</Text> : null}
              </Text>
            </View>
          ))}
        </Section>
      )}

      {!compact && summary.quotes.length > 0 && (
        <Section title="주요 발언">
          {summary.quotes.map((q, i) => (
            <View key={i} style={styles.quote}>
              <Text style={styles.quoteText}>“{q.text}”</Text>
              {!!q.speaker && <Text style={styles.quoteBy}>— {q.speaker}</Text>}
            </View>
          ))}
        </Section>
      )}

      {summary.openQuestions.length > 0 && (
        <Section title="남은 질문">
          {summary.openQuestions.map((q, i) => (
            <Bullet key={i} text={q} accent={colors.accent} />
          ))}
        </Section>
      )}

      {summary.keywords.length > 0 && (
        <View style={styles.keywords}>
          {summary.keywords.map((k, i) => (
            <View key={i} style={styles.keyword}>
              <Text style={styles.keywordText}>{k}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headlineBox: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  headline: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  section: { marginBottom: space.lg },
  sectionTitle: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: space.sm,
  },
  bulletRow: { flexDirection: "row", marginBottom: space.sm },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.dim,
    marginTop: 8,
    marginRight: space.md,
  },
  bulletText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  owner: { color: colors.warn, fontSize: 13 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: space.md,
    marginBottom: space.md,
  },
  quoteText: { color: colors.text, fontSize: 15, lineHeight: 23 },
  quoteBy: { color: colors.sub, fontSize: 13, marginTop: 2 },
  keywords: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  keyword: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  keywordText: { color: colors.sub, fontSize: 12 },
});
