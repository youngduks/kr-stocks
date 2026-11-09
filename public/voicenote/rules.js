/* ═════════════════════════════════════════════════════════════════
   보이스노트 규칙 엔진 — 녹음 중에 자막만으로 바로 회의를 정리한다(지연 0, 무료).
   녹음을 마치면 Gemini가 회의록을 다시 쓰고, 이 정리는 ‘실시간’ 탭에 남는다.
   DOM을 쓰지 않는 순수 계산이라 브라우저 밖(node)에서도 그대로 돌릴 수 있다.
   ═════════════════════════════════════════════════════════════════ */
"use strict";

function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
  const p = (n) => String(n).padStart(2, "0");
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}

/* ═════════════════════════════════════════════════════════════════
   규칙 기반 회의 정리
   ─────────────────────────────────────────────────────────────────
   LLM 없이 자막에서 바로 만든다. 녹음 중 화면은 이걸로 채운다(지연 0).
   이건 "추출"이지 "재서술"이 아니다 — 말한 문장을 골라 분류할 뿐이다.

   패턴은 넉넉함보다 좁게 잡았다. 놓치는 건 괜찮지만 엉뚱한 문장을
   결정사항이라고 우기면 안 된다. 실제로 "오늘 회의 시작하겠습니다"가
   할 일로 잡히던 문제 때문에 회의 진행 상용구(boiler)를 따로 막는다.
   ═════════════════════════════════════════════════════════════════ */

const WORK_KO = "확인|정리|공유|준비|검토|수정|반영|전달|보완|처리|작성|조사|연락|요청|정하|결정|테스트|배포|수집|모집|계산|산정|보고|발표|제출|업데이트|세팅|설정|예약|섭외";

const RULES = {
  ko: {
    split: /(?<=[.!?…])\s+/,
    filler: /^(네|예|아|어|음|응|그쵸|그죠|맞아요?|그렇죠|알겠습니다|감사합니다|안녕하세요|좋습니다|그래요|오케이|넵)[.!?~\s]*$/,
    boiler: /(회의|오늘|이만|여기까지|자리)[\s를은는]*(시작|마치|끝내|종료|진행|하겠|합니다)|수고(하셨|했)|고생(하셨|했)|안녕하[세십]|잘\s?부탁/,
    question: [/\?\s*$/, /(인가요|일까요|나요|까요|은가요|던가요|ㄹ까요)[.?]?\s*$/],
    decision: [
      /(하는|가는|쓰는|넣는|빼는|진행하는|유지하는)\s?걸로\s?(하|합|했|가|정|확정)/,
      /로\s?(하죠|하시죠|갑시다|가시죠|합시다|가죠)/,
      /(결정|확정|채택|승인|합의)(했|됐|되었|입니다|하겠|하는|된|함)/,
      /결론(은|적으로)/,
      /최종(적으로|은)?\s?(결정|확정)/,
    ],
    action: [
      /하기로\s*(했|하|합)/,
      new RegExp(`(${WORK_KO})\\S*(하겠|할게|해야|해서|해\\s?주|하고|할|해\\s?드릴)`),
      /해\s?(주|드리)(세요|시겠|겠|실\s?수)/,
      /부탁(드립|합니다|드려요)/,
      /(보내|올리|만들|잡|돌리)(아\s?주|어\s?주|주세요|드리겠|어야|겠습니다)/,
      /알아보(고|겠|자|기로)/,
      /까지\s?\S*(하|끝|완료|보내|드리|주)/,
    ],
    background: /(배경|목적|취지|현황|문제는|이슈는|원인|지난\s?(주|달|번|회의|분기)|그동안|요즘|최근|때문에|상황이|발생하고|발생했)/,
    plan: /(향후|앞으로|다음\s?(주|달|단계|회의|분기|번)|계획|예정|일정|로드맵|목표|마일스톤|이후에|단계적으로)/,
    open: /(다음\s?회의에서|추후|보류|미정|검토가?\s?필요|다시\s?논의|확인이?\s?필요|아직\s?(정하지|결정|모르)|못\s?정)/,
    emphasis: /(결론|핵심|중요한|정리하면|요약하면|문제는|관건은|포인트는|제일|가장)/,
    density: 40,
  },
  en: {
    split: /(?<=[.!?])\s+/,
    filler: /^(ok(ay)?|yeah|yes|yep|right|uh+|um+|hmm+|sure|thanks?( you)?|got it|i see|alright|hello|hi)[.!?,\s]*$/i,
    boiler: /\b(let'?s (get )?start(ed)?|that'?s (all|it) for today|thanks?,? (everyone|all)|see you|good (morning|afternoon)|welcome)\b/i,
    question: [/\?\s*$/],
    decision: [/\b(we('ve| have)? decided|decided to|we agreed|agreed (to|on)|let'?s go with|we'?ll go with|approved|final decision|in conclusion|it'?s settled|confirmed)\b/i],
    action: [/\b(i'?ll|i will|we'?ll|we will|(you|he|she|they) will|going to|need to|needs to|has to|have to|should|action item|follow up|take care of|can you|could you|please)\b/i, /\bby (monday|tuesday|wednesday|thursday|friday|tomorrow|next week|end of)/i],
    background: /\b(background|context|because|currently|recently|last (week|month|quarter|time)|the (problem|issue) is|the goal is|so far)\b/i,
    plan: /\b(next (week|month|quarter|step|steps|meeting|phase)|plan(ning)?|roadmap|schedule|timeline|going forward|from now on|milestone|later this)\b/i,
    open: /\b(tbd|open question|not sure|pending|on hold|revisit|next meeting|later|undecided|still need to decide)\b/i,
    emphasis: /\b(key|important|main point|bottom line|in short|to sum up|most|critical)\b/i,
    density: 80,
  },
  ja: {
    split: /(?<=[。！？!?])\s*/,
    filler: /^(はい|ええ|うん|なるほど|そうですね|了解です|ありがとうございます|お疲れ様です|あの|えっと)[。、！？!?\s]*$/,
    boiler: /(会議を(始め|終わり|終了)|本日は以上|お疲れ様でした|よろしくお願いします)/,
    question: [/[？?]\s*$/, /(ですか|でしょうか|ますか|ませんか)[。]?\s*$/],
    decision: [/(決定|決まり|にしましょう|で行きましょう|でいきましょう|合意|承認|確定)/],
    action: [/(しておきます|やっておきます|対応します|確認して|お願いします|お願いできますか|までに|担当します|進めます)/],
    background: /(背景|目的|現状|課題|問題は|原因|先週|前回|最近|ため|これまで)/,
    plan: /(今後|来週|来月|次回|予定|計画|スケジュール|ロードマップ|目標|次のステップ)/,
    open: /(保留|未定|次回検討|要検討|持ち帰|まだ決まって)/,
    emphasis: /(結論|ポイント|重要|一番|要するに|まとめると)/,
    density: 25,
  },
  zh: {
    split: /(?<=[。！？!?])\s*/,
    filler: /^(好的?|嗯+|对|是的?|明白|谢谢|没问题|那个|就是)[。，！？!?\s]*$/,
    boiler: /(会议(开始|结束)|今天就到这|辛苦了|大家好)/,
    question: [/[？?]\s*$/, /(吗|呢|是不是|要不要)[。]?\s*$/],
    decision: [/(决定|确定|就这么定|同意|通过|批准|定下来|达成一致)/],
    action: [/(负责|跟进|我来|我去|需要|请.{0,8}(确认|处理|准备|发)|之前完成|落实|安排一下)/],
    background: /(背景|目的|现状|问题是|原因|上周|上个月|之前|最近|因为)/,
    plan: /(下周|下个月|下一步|计划|安排|日程|今后|接下来|目标|里程碑)/,
    open: /(待定|再议|下次讨论|未决|还没定|需要再确认)/,
    emphasis: /(结论|关键|重要|最|总之|总结一下)/,
    density: 25,
  },
};

/* 한국어 조사 — 명사 끝 글자와 겹치는 정도에 따라 요구 어간 길이를 다르게 둔다.
   "재시도"에서 '도'를 떼어 "재시"가 되던 사고를 막기 위해서다. */
// 서술격 조사("입니다" 등)도 같이 벗긴다 — 안 그러면 "예산입니다"와 "예산"이 다른 단어로 세어진다.
const KO_LONG_P = ["입니다", "이에요", "에서는", "에게서", "이라고", "으로는", "이라는", "이었", "예요", "이고", "이며", "인데", "라고", "로는", "에서", "에게", "께서", "부터", "까지", "마다", "처럼", "보다", "이나", "으로", "라는", "한테"];
const KO_SAFE_P = ["은", "는", "을", "를", "의", "에"];
const KO_RISKY_P = ["도", "만", "와", "과", "이", "가", "로"];
const KO_STOP = new Set(("그리고 그래서 하지만 그런데 근데 그러면 그럼 그러니까 이거 저거 그거 이제 지금 우리 저희 여기 거기 부분 경우 정도 생각 얘기 이야기 말씀 느낌 상황 진짜 조금 되게 약간 그냥 사실 일단 아무래도 혹시 같아요 있는 하는 되는 이런 저런 그런 무슨 어떤 때문 이렇게 저렇게 그렇게 다시 먼저 다음 이번 네네 예예 맞아요 그렇죠 알겠습니다 감사합니다 주세요 합니다 습니다 해서 하고 오늘 저는 제가 있습니다 없습니다 했습니다 하겠습니다 같습니다 있어요 해요 거예요 겁니다 건데 그게 이게 저게 거의 계속 많이 너무 아주 정말 이미 아직 요즘 최근 관련 회의").split(" "));
const EN_STOP = new Set("the a an and or but so to of in on at for with from by is are was were be been being it this that these those we you they he she i our your their there here have has had do does did will would can could should just really very also about into than then them what which who when where why how all any some more most other such only own same too not no yes okay ok yeah like get got going gonna want need think know let make sure one two thing things lot let's lets next still instead maybe okay".split(" "));

function stripKoParticle(w) {
  for (const p of KO_LONG_P) if (w.length >= p.length + 2 && w.endsWith(p)) return w.slice(0, -p.length);
  for (const p of KO_SAFE_P) if (w.length >= 3 && w.endsWith(p)) return w.slice(0, -1);
  for (const p of KO_RISKY_P) if (w.length >= 4 && w.endsWith(p)) return w.slice(0, -1);
  return w;
}

/** 키워드 후보 토큰. 형태소 분석기 없이 언어별로 근사한다. */
function tokens(text, lang) {
  if (lang === "ko") {
    // 한국어 회의에도 "API", "PR" 같은 영어가 섞인다. 영어 토큰엔 영어 불용어를 적용한다.
    return text.replace(/[^가-힣a-zA-Z0-9\s]/g, " ").split(/\s+/).map(stripKoParticle)
      .filter((w) => w.length >= 2 && !KO_STOP.has(w) && !(/^[a-zA-Z]+$/.test(w) && EN_STOP.has(w.toLowerCase())));
  }
  if (lang === "en") {
    return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).map((w) => w.replace(/^'+|'+$/g, "")).filter((w) => w.length >= 3 && !EN_STOP.has(w) && !/^\d+$/.test(w));
  }
  if (lang === "ja") {
    // 가타카나 외래어 · 한자 복합어 · 영숫자 덩어리
    return text.match(/[゠-ヿ]{2,}|[一-鿿]{2,4}|[A-Za-z][A-Za-z0-9]+/g) || [];
  }
  // zh — 띄어쓰기가 없으므로 한자 bigram으로 근사
  const out = [];
  for (const run of text.match(/[一-鿿]+/g) || []) {
    for (let i = 0; i + 2 <= run.length; i++) out.push(run.slice(i, i + 2));
  }
  return out.concat(text.match(/[A-Za-z][A-Za-z0-9]+/g) || []);
}

function topKeywords(items, n, exclude = new Set()) {
  const count = new Map();
  for (const it of items) for (const w of tokens(it.text, it.lang)) count.set(w, (count.get(w) || 0) + 1);
  // "예산이"처럼 3글자 + 위험 조사인 어절은 규칙상 그대로 남는다("어린이"→"어린" 방지).
  // 같은 회의에 "예산"이 따로 나왔다면 그때만 합친다 — 사전 대신 데이터로 판단.
  for (const [w, c] of [...count]) {
    if (w.length === 3 && KO_RISKY_P.includes(w.slice(-1)) && count.has(w.slice(0, -1))) {
      count.set(w.slice(0, -1), count.get(w.slice(0, -1)) + c);
      count.delete(w);
    }
  }
  return [...count.entries()].filter(([w, c]) => c >= 2 && !exclude.has(w)).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map(([w]) => w);
}

const trimTail = (s) => s.replace(/\s*[.。·,，、]+\s*$/, "").trim();

function splitSentences(text, lang) {
  return text.split(RULES[lang].split).map((s) => s.trim()).filter(Boolean);
}

function classify(text, lang) {
  const R = RULES[lang];
  if (R.question.some((r) => r.test(text))) return "question";
  if (R.boiler.test(text)) return "plain";
  if (R.decision.some((r) => r.test(text))) return "decision";
  if (R.action.some((r) => r.test(text))) return "action";
  return "plain";
}

function score(text, lang, kws) {
  const R = RULES[lang];
  if (R.filler.test(text) || R.boiler.test(text) || text.length < 3) return 0;
  let s = Math.min(text.length / R.density, 1.5);
  if (/\d/.test(text)) s += 0.8;
  if (R.emphasis.test(text)) s += 1.2;
  s += Math.min(kws.filter((k) => text.toLowerCase().includes(k.toLowerCase())).length, 3) * 0.6;
  return s;
}

const TITLE_KO = "대리|과장|부장|팀장|차장|사원|매니저|책임|선임|수석|실장|이사|대표|본부장|파트장|프로|님|씨";
function findOwner(text, lang) {
  if (lang === "ko") {
    const m = text.match(new RegExp(`([가-힣]{1,4}\\s?(?:${TITLE_KO})(?:님)?)(?=이|가|께서|은|는|한테|에게|\\s)`));
    if (m) return m[1].replace(/\s+/g, "");
    const team = text.match(/([가-힣A-Za-z]{1,8}\s?팀)(?:에서|이|가|은|는)/);
    if (team) return team[1];
    if (/(^|\s)(제가|저희가|저희\s?쪽에서|제\s?쪽에서)/.test(text)) return "발언자";
    return "";
  }
  if (lang === "en") {
    if (/\b(I'?ll|I will|I can|I'm going to)\b/i.test(text)) return "발언자";
    const m = text.match(/\b([A-Z][a-z]{1,15})(?:,)? (?:will|is going to|can you|could you|to handle|to take)\b/);
    return m ? m[1] : "";
  }
  if (lang === "ja") {
    const m = text.match(/([一-鿿゠-ヿ]{1,5}(?:さん|様|課長|部長|チーム))(?:が|は|に|で)/);
    if (m) return m[1];
    return /(私が|僕が|こちらで)/.test(text) ? "발언자" : "";
  }
  const m = text.match(/([一-鿿]{1,3}(?:总|经理|老师|组))(?:负责|来|去|跟进)/);
  if (m) return m[1];
  return /(我来|我负责|我去)/.test(text) ? "발언자" : "";
}

function findDue(text, lang) {
  let m;
  if (lang === "ko") m = text.match(/((?:오늘|내일|모레|이번\s?주|다음\s?주|금주|차주|이번\s?달|다음\s?달|월말|연말|분기\s?말|\d{1,2}\s?월\s?\d{1,2}\s?일|\d{1,2}\s?일|[월화수목금토일]요일)(?:\s?(?:오전|오후)?\s?\d{1,2}\s?시)?)\s?(?:까지|중으로|중에|안에|내로|전까지)/);
  else if (lang === "en") m = text.match(/\bby ((?:the )?end of (?:the )?(?:day|week|month|quarter)|eod|eow|today|tonight|tomorrow|next (?:week|month|monday|tuesday|wednesday|thursday|friday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2})/i);
  else if (lang === "ja") m = text.match(/((?:今日|明日|明後日|今週|来週|今月|来月|月末|\d{1,2}月\d{1,2}日|[月火水木金土日]曜日?)(?:中)?)(?:まで|中に)/);
  else m = text.match(/((?:今天|明天|后天|本周|下周|这周|月底|\d{1,2}月\d{1,2}[日号]|周[一二三四五六日]|星期[一二三四五六日天]))(?:之前|前|内)/);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function dedupe(list, limit, keyOf = (x) => x) {
  const seen = new Set(), out = [];
  for (const it of list) {
    // 앞부분이 같으면 같은 말의 반복으로 본다. STT는 같은 문장을 겹쳐 내는 일이 잦다.
    const k = keyOf(it).replace(/\s+/g, "").slice(0, 14);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}

const EMPTY_SUMMARY = () => ({ title: "", overview: "", background: [], discussion: [], decisions: [], actions: [], plans: [], issues: [], keywords: [] });

/** 정리에 쓸 텍스트를 고른다 — 한국어가 있으면 한국어로(원문이든 번역이든). */
function summaryItems(session) {
  const items = [];
  for (const s of session.segments) {
    const ko = s.lang === "ko" ? s.text : s.trLang === "ko" && s.tr ? s.tr : null;
    const text = ko ?? s.text;
    const lang = ko ? "ko" : s.lang;
    for (const sent of splitSentences(text, lang)) {
      // idx — 한 자막 조각이 여러 문장으로 나뉘면 atMs가 같아서, 원래 순서를 따로 기억한다.
      if (!RULES[lang].filler.test(sent) && sent.length >= 3) items.push({ text: sent, lang, atMs: s.atMs, idx: items.length });
    }
  }
  return items;
}

function ruleSummary(session) {
  const items = summaryItems(session);
  if (!items.length) return EMPTY_SUMMARY();

  const kw = topKeywords(items, 12);
  for (const it of items) {
    const R = RULES[it.lang];
    it.kind = classify(it.text, it.lang);
    it.score = score(it.text, it.lang, kw);
    it.isBg = R.background.test(it.text) && !R.boiler.test(it.text);
    it.isPlan = R.plan.test(it.text) && !R.boiler.test(it.text);
    it.isOpen = R.open.test(it.text);
  }
  const used = new Set();
  const take = (arr) => { arr.forEach((it) => used.add(it)); return arr; };
  const byScore = (a, b) => b.score - a.score;
  const total = Math.max(session.durationMs || 0, items[items.length - 1].atMs + 1, 1);

  // 결정 · 할 일 — 가장 확실한 신호부터 확정한다.
  const decisions = take(dedupe(items.filter((i) => i.kind === "decision"), 8, (i) => i.text));
  // 할 일인데 담당자도 기한도 없고 계획 표현이 있으면, 개인 할 일이 아니라 "계획"이다.
  // ("다음 달에 단계적으로 배포할 계획입니다"가 할 일로 잡히던 문제)
  const actionCands = items.filter((i) => i.kind === "action" && !used.has(i)).map((i) => ({ it: i, owner: findOwner(i.text, i.lang), due: findDue(i.text, i.lang) }));
  const asPlan = actionCands.filter((c) => c.it.isPlan && !c.owner && !c.due).map((c) => c.it);
  const actionPicked = dedupe(actionCands.filter((c) => !asPlan.includes(c.it)), 12, (c) => c.it.text);
  take(actionPicked.map((c) => c.it));
  const actions = actionPicked.map((c) => ({ task: trimTail(c.it.text), owner: c.owner, due: c.due }));

  // 미결 — 답이 안 나온 질문, 미룬 안건
  const issues = take(dedupe(items.filter((i) => !used.has(i) && (i.kind === "question" || i.isOpen)), 8, (i) => i.text));

  // 향후 계획 — 할 일로 잡히지 않은 계획·일정 문장
  const plans = take(dedupe([...asPlan, ...items.filter((i) => !used.has(i) && i.isPlan && i.kind === "plain")].filter((i) => !used.has(i)), 6, (i) => i.text));

  // 배경 — 표지어가 있는 문장이 우선. 부족할 때만 회의 앞부분(20%)에서 보충한다.
  const marked = dedupe(items.filter((i) => !used.has(i) && i.isBg && i.kind === "plain"), 3, (i) => i.text);
  const early = marked.length >= 2 ? [] : items.filter((i) => !used.has(i) && !marked.includes(i) && i.atMs <= total * 0.2 && i.kind === "plain" && i.score > 0.6).sort(byScore).slice(0, 2 - marked.length);
  const background = take([...marked, ...early].sort((a, z) => a.idx - z.idx));

  // 주요 논의 — 5분 단위 시간 블록. 다른 칸에 이미 나온 문장은 다시 쓰지 않는다.
  const blocks = Math.max(1, Math.min(8, Math.ceil(total / 60000 / 5)));
  const span = total / blocks;
  const buckets = Array.from({ length: blocks }, () => []);
  for (const it of items) buckets[Math.min(blocks - 1, Math.floor(it.atMs / span))].push(it);
  const titled = new Set(); // 앞 구간 제목에 쓴 단어 — 구간마다 다른 단어가 제목이 되게 한다
  const discussion = buckets.map((b, i) => {
    const fresh = b.filter((it) => !used.has(it) && it.kind !== "question" && it.score > 0.4).sort(byScore);
    const chosen = dedupe(fresh, 3, (it) => it.text);
    if (!chosen.length) return null;
    // 제목 — 그 구간에서 두 번 이상 나온 단어(앞 구간 제목과 겹치지 않게).
    // 없으면 전체 키워드 중 그 구간에 나오는 것.
    let bk = topKeywords(b, 2, titled);
    if (!bk.length) {
      const bt = new Set(b.flatMap((it) => tokens(it.text, it.lang)));
      bk = kw.filter((k) => bt.has(k) && !titled.has(k)).slice(0, 2);
    }
    bk.forEach((k) => titled.add(k));
    return { topic: bk.length ? bk.join(" · ") : `${fmtClock(i * span)}~ 구간`, points: chosen.sort((a, z) => a.idx - z.idx).map((it) => trimTail(it.text)) };
  }).filter(Boolean);

  const keywords = kw.slice(0, 6);
  // 개요 — 문장 하나를 고르는 대신, 무엇이 얼마나 정해졌는지를 요약한다.
  // 규칙 기반은 문장을 다시 쓸 수 없으니 "아무 문장이나 대표로 내세우는 것"보다 정직하다.
  const topicWords = [...new Set(discussion.flatMap((d) => d.topic.split(" · ")))].filter((t) => !/구간$/.test(t)).slice(0, 4);
  const counts = [decisions.length && `결정 ${decisions.length}건`, actions.length && `할 일 ${actions.length}건`, issues.length && `미결 ${issues.length}건`].filter(Boolean);
  const overview = [topicWords.length ? `${topicWords.join(", ")} 논의` : "", counts.join(" · ")].filter(Boolean).join(" — ");
  return {
    title: keywords.length ? `${keywords.slice(0, 2).join(" · ")} 회의` : "",
    overview,
    background: background.map((i) => trimTail(i.text)),
    discussion,
    decisions: decisions.map((i) => trimTail(i.text)),
    actions,
    plans: plans.map((i) => trimTail(i.text)),
    issues: issues.map((i) => trimTail(i.text)),
    keywords,
  };
}

function isEmptySummary(s) {
  return !s || (!s.overview && !s.background.length && !s.discussion.length && !s.decisions.length && !s.actions.length && !s.plans.length && !s.issues.length);
}

