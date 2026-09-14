import { STANCE_LABEL, type IndicatorPerson } from "@/lib/humanIndicators";

/** "인물 지표" 카드 — /poll과 홈 양쪽에서 공유. 최신 발언 1건만 표시. */
export function PersonCard({ person }: { person: IndicatorPerson }) {
  const latest = person.opinions[0];
  if (!latest) return null;
  const stance = STANCE_LABEL[latest.stance];

  return (
    <div className="rounded-xl bg-bg-card border border-line p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <span className="text-base font-bold text-text">{person.name}</span>
          <span className="text-xs text-text-dim ml-2">{person.channel}</span>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg ${stance.color}`}>
          {stance.ko}
        </span>
      </div>
      <p className="text-[11px] text-text-dim italic mb-3">{person.tagline}</p>

      <div className="border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-xs text-text-dim">{latest.date}</span>
        </div>
        <div className="text-sm font-semibold text-text mb-1">{latest.title}</div>
        <p className="text-xs text-text-muted leading-relaxed mb-2">{latest.summary}</p>
        <a
          href={latest.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent-blue hover:underline"
        >
          원본 영상 보기 →
        </a>
      </div>
    </div>
  );
}
