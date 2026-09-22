// 한국어 자막을 규칙만으로 다루기 위한 도구들. 형태소 분석기 없이,
// STT 자막에서 실제로 관찰되는 패턴만 좁게 노린다.
//
// 목표는 "정확한 파싱"이 아니라 "쓸 만한 후보 추출"이다. 놓치는 건 괜찮지만
// 엉뚱한 문장을 결정사항이라고 우기면 안 되므로, 패턴은 넉넉함보다 좁게 잡았다.

/** 문장 종류. 어미 패턴으로 판별한다. */
export type SentenceKind = "action" | "decision" | "question" | "plain";

/** 두 글자 이상 조사. 길이순으로 먼저 벗겨야 해서 긴 것부터 정렬해 둔다. */
const LONG_PARTICLES = [
  "에서는",
  "에게서",
  "이라고",
  "으로는",
  "이라는",
  "라고",
  "로는",
  "에서",
  "에게",
  "께서",
  "부터",
  "까지",
  "마다",
  "처럼",
  "보다",
  "이나",
  "으로",
  "라는",
];

// 한 글자 조사는 명사의 끝 글자와 겹친다. 어느 쪽이 더 자주 겹치느냐로 나눴다.
/** 명사 끝 글자로 잘 안 오는 것들 — 2글자 어간만 남아도 벗긴다. */
const SAFE_PARTICLES = ["은", "는", "을", "를", "의", "에"];
/** "재시도", "국가", "종이"처럼 명사 끝 글자와 자주 겹치는 것들 — 3글자 어간이 남을 때만 벗긴다. */
const RISKY_PARTICLES = ["도", "만", "와", "과", "이", "가", "로"];

const STOPWORDS = new Set([
  "그리고", "그래서", "하지만", "그런데", "근데", "그러면", "그럼", "그러니까",
  "이거", "저거", "그거", "이제", "지금", "우리", "저희", "여기", "거기",
  "부분", "경우", "정도", "생각", "얘기", "이야기", "말씀", "느낌", "상황",
  "진짜", "조금", "되게", "약간", "그냥", "사실", "일단", "아무래도", "혹시",
  "같아요", "있는", "하는", "되는", "이런", "저런", "그런", "무슨", "어떤",
  "때문", "이렇게", "저렇게", "그렇게", "다시", "먼저", "다음", "이번",
  "네네", "예예", "맞아요", "그렇죠", "알겠습니다", "감사합니다",
  // 어미가 어절로 잡혀 키워드에 끼어드는 것들
  "주세요", "합니다", "습니다", "해서", "하고", "그럼", "오늘", "저는", "제가",
]);

/** 이것만으로 이뤄진 문장은 내용이 없다고 본다. */
const FILLER_ONLY =
  /^(네|예|아|어|음|응|그쵸|그죠|맞아요?|그렇죠|알겠습니다|감사합니다|안녕하세요)[.!?~\s]*$/;

/**
 * 회의 진행 상용구. 내용이 아니라 절차라서 정리에 들어가면 안 된다.
 *
 * 처음엔 없이 만들었는데, "오늘 회의 시작하겠습니다"가 액션아이템으로,
 * "여기까지 하겠습니다"가 할 일로 잡혔다. 어미만 보면 구별할 수 없어서
 * 분류 자체를 거부하는 목록을 뒀다.
 */
const BOILERPLATE =
  /(회의|오늘|이만|여기까지|자리)[\s를은는]*(시작|마치|끝내|종료|진행|하겠|합니다)|수고(하셨|했)|고생(하셨|했)|안녕하[세십]|잘\s?부탁/;

// "하겠습니다"만 보고 액션으로 잡으면 "시작하겠습니다"까지 딸려 온다.
// 그래서 어미가 아니라 **업무 동사**를 먼저 요구한다.
const WORK_VERBS =
  "확인|정리|공유|준비|검토|수정|반영|전달|보완|처리|작성|조사|연락|요청|정하|결정|테스트|배포|수집|모집|계산|산정";

const ACTION_PATTERNS: RegExp[] = [
  /하기로\s*(했|하|합)/,
  new RegExp(`(${WORK_VERBS})\\S*(하겠|할게|해야|해서|해\\s?주|하고|할)`),
  /해\s?(주|드리)(세요|시겠|겠)/,
  /부탁(드립|합니다|드려요)/,
  /(보내|올리|만들|잡)(아\s?주|주세요|드리겠|어야|겠습니다)/,
  /알아보(고|겠|자|기로)/,
  /까지\s?\S*(하|끝|완료|보내|드리|주)/,
];

const DECISION_PATTERNS: RegExp[] = [
  /(하는|가는|쓰는|넣는|빼는)\s?걸로\s?(하|합|했|가)/,
  /로\s?(하죠|하시죠|갑시다|가시죠|합시다)/,
  /(결정|확정|채택|승인)(했|됐|입니다|하겠|하는|된)/,
  /결론(은|적으로)/,
  /최종(적으로|은)?\s?(결정|확정)/,
];

const QUESTION_PATTERNS: RegExp[] = [
  /\?\s*$/,
  /(인가요|일까요|나요|까요|은가요|ㄹ까요)[.?]?\s*$/,
  /^(어떻게|언제|누가|왜|얼마나|어디|무엇|뭐)\b/,
];

/** 이 표현이 들어간 문장은 화자가 스스로 요점이라고 표시한 것이다. */
const EMPHASIS =
  /(결론|핵심|중요한|정리하면|요약하면|문제는|관건은|포인트는|제일|가장)/;

const HAS_NUMBER = /\d/;

/**
 * 자막 한 조각을 문장으로 나눈다.
 *
 * 종결어미로 자르는 방식도 시도해 봤지만 "먹다가", "하는데요" 같은 연결어미를
 * 문장 끝으로 오인하는 사례가 많아 버렸다. STT 조각 자체가 이미 발화 단위라
 * 구두점만 기준으로 나누고, 구두점이 없으면 조각 전체를 한 문장으로 본다.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function classifySentence(text: string): SentenceKind {
  if (QUESTION_PATTERNS.some((r) => r.test(text))) return "question";
  if (isBoilerplate(text)) return "plain";
  if (DECISION_PATTERNS.some((r) => r.test(text))) return "decision";
  if (ACTION_PATTERNS.some((r) => r.test(text))) return "action";
  return "plain";
}

export function isFiller(text: string): boolean {
  return text.length < 3 || FILLER_ONLY.test(text);
}

export function isBoilerplate(text: string): boolean {
  return BOILERPLATE.test(text);
}

/**
 * 조사를 벗긴다. 어간이 너무 짧아지면 벗기지 않는다 — "재시도" → "재시" 같은 사고를 막는다.
 * 한 글자 조사는 명사 끝 글자와 겹치는 정도에 따라 요구하는 어간 길이를 다르게 뒀다.
 */
export function stripParticle(word: string): string {
  for (const p of LONG_PARTICLES) {
    if (word.length >= p.length + 2 && word.endsWith(p)) {
      return word.slice(0, -p.length);
    }
  }
  for (const p of SAFE_PARTICLES) {
    if (word.length >= 3 && word.endsWith(p)) return word.slice(0, -1);
  }
  for (const p of RISKY_PARTICLES) {
    if (word.length >= 4 && word.endsWith(p)) return word.slice(0, -1);
  }
  return word;
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => stripParticle(w.trim()))
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/** 빈도 상위 키워드. 형태소 분석 없이 조사만 벗긴 어절 빈도라 정밀하진 않다. */
export function extractKeywords(sentences: string[], topN: number): string[] {
  const counts = new Map<string, number>();
  for (const s of sentences) {
    for (const w of tokenize(s)) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, topN)
    .map(([w]) => w);
}

/**
 * 문장 중요도. 길이·숫자·강조표현·키워드 포함 여부를 더한 값으로,
 * 절대적인 의미는 없고 같은 녹음 안에서 줄 세우는 용도다.
 */
export function scoreSentence(text: string, keywords: string[]): number {
  if (isFiller(text) || isBoilerplate(text)) return 0;

  let score = Math.min(text.length / 40, 1.5);
  if (HAS_NUMBER.test(text)) score += 0.8;
  if (EMPHASIS.test(text)) score += 1.2;

  const hits = keywords.filter((k) => text.includes(k)).length;
  score += Math.min(hits, 3) * 0.6;

  return score;
}

/** 인터뷰에서 인용할 만한 문장인지. 화자의 판단·경험·수치가 담긴 긴 문장을 고른다. */
export function looksQuotable(text: string): boolean {
  if (text.length < 25) return false;
  if (QUESTION_PATTERNS.some((r) => r.test(text))) return false;
  return /(저는|제가|저희는|우리는|생각합니다|생각해요|봅니다|같습니다|같아요|겁니다|거예요)/.test(
    text,
  );
}

/**
 * 표시용으로 문장 끝을 정리한다.
 *
 * 어미를 잘라 개조식으로 바꾸는 것도 해봤지만, "그렇다" → "그렇" 처럼 말이 깨지는
 * 경우가 많았다. 어미를 다듬는 건 재서술의 영역이라 LLM 층에 맡기고,
 * 여기서는 문장부호만 정리한다.
 */
export function trimTail(text: string): string {
  return text.replace(/\s*[.。·,]+\s*$/, "").trim();
}
