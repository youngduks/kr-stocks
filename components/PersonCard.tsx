import {
  STANCE_LABEL,
  OPINION_LABEL,
  CONTRARIAN_LABEL,
  type IndicatorPerson,
} from "@/lib/humanIndicators";

/** 홈용 얇은 한 줄 카드 — "전인구 경계론(요지) → 매수 방향 검토" 형태.
 * 상세(출처 링크·전체 요약)는 /poll의 PersonCard가 담당. */
export function PersonCardCompact({ person }: { person: IndicatorPerson }) {
  const latest = person.opinions[0];
  if (!latest) return null;
  const opinion = OPINION_LABEL[latest.stance];
  const flip = CONTRARIAN_LABEL[latest.stance];
  const brief = latest.summary_short ?? latest.summary;

  return (
    <div className="rounded-xl bg-bg-card border border-line px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0 text-sm">
        <span className="font-bold text-text">{person.name}</span>
        <span className="text-text-muted ml-1.5">{opinion}</span>
        <span className="text-text-dim text-xs ml-1.5">({brief})</span>
      </div>
      <div className={`text-sm font-bold shrink-0 ${flip.color}`}>→ {flip.ko}</div>
    </div>
  );
}

/** "인물 지표" 카드 — /poll과 홈 양쪽에서 공유. 최신 발언 1건만 표시. */
export function PersonCard({ person }: { person: IndicatorPerson }) {
  const latest = person.opinions[0];
  if (!latest) return null;
  const stance = STANCE_LABEL[latest.stance];

  return (
    <div className="ds-card" style={{ padding: 16 }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <span className="text-[16px] font-extrabold text-text">{person.name}</span>
          <span className="ds-meta ml-2">{person.channel}</span>
        </div>
        <span className={`ds-pill bg-bg-hover ${stance.color}`}>{stance.ko}</span>
      </div>
      <p className="ds-meta mb-3">{person.tagline}</p>

      <div className="border-t border-line pt-3">
        <div className="ds-meta mb-1">{latest.date}</div>
        <div className="text-[15px] font-bold text-text mb-1">{latest.title}</div>
        <p className="text-[14px] text-text-muted leading-relaxed mb-2">{latest.summary}</p>
        <a
          href={latest.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center min-h-[32px] text-[13px] font-bold text-text-muted hover:text-text"
        >
          원본 영상 보기 →
        </a>
      </div>
    </div>
  );
}
