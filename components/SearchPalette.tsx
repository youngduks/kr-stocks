"use client";

// 종목 검색 palette — Cmd+K / Ctrl+K 또는 헤더 검색 버튼 클릭
// 형님 5/14: 42 종목 grid 마찰 해소, fuzzy 매칭 (한글·영문·티커 동시)

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SYMBOLS, CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";

type Locale = "ko" | "en";

const I18N = {
  ko: {
    placeholder: "종목 검색… (삼성전자, NVDA, SpaceX 등)",
    empty: "검색 결과 없음",
    hintKeyboard: "↑↓ 이동 · Enter 선택 · ESC 닫기",
    hintShortcut: "⌘K",
    sectionAll: "전체",
    label: "검색",
  },
  en: {
    placeholder: "Search… (Samsung, NVDA, SpaceX, etc.)",
    empty: "No results",
    hintKeyboard: "↑↓ navigate · Enter select · ESC close",
    hintShortcut: "⌘K",
    sectionAll: "All",
    label: "Search",
  },
} as const;

/** fuzzy match — 한글·영문·ticker 동시 비교, 점수 ↑ = 더 매칭 */
function scoreMatch(query: string, sym: SymbolMeta): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const targets = [
    sym.slug,
    sym.ticker.toLowerCase(),
    (sym.name_ko ?? "").toLowerCase(),
    (sym.name_en ?? "").toLowerCase(),
    (sym.krx_code ?? "").toLowerCase(),
  ];
  let best = 0;
  for (const t of targets) {
    if (!t) continue;
    if (t === q) return 1000; // exact match
    if (t.startsWith(q)) best = Math.max(best, 800);
    else if (t.includes(q)) best = Math.max(best, 500);
    else {
      // 글자 순서 fuzzy — q의 글자가 모두 t에 순서대로 나타나면 일부 점수
      let qi = 0;
      for (let i = 0; i < t.length && qi < q.length; i++) {
        if (t[i] === q[qi]) qi++;
      }
      if (qi === q.length) best = Math.max(best, 200);
    }
  }
  return best;
}

export function SearchPalette({ locale = "ko" }: { locale?: Locale } = {}) {
  const t = I18N[locale];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 글로벌 키보드 단축키 (Cmd+K / Ctrl+K)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // open 변경 시 input focus + 상태 초기화
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 검색 결과 — 빈 query 면 카테고리별 전체 (한국주식 우선)
  const results = useMemo(() => {
    if (!query.trim()) {
      // 카테고리 순서: korea → us → private → themes → global
      const order: Record<SymbolMeta["category"], number> = {
        korea: 0,
        us: 1,
        private: 2,
        themes: 3,
        global: 4,
      };
      return [...SYMBOLS].sort((a, b) => order[a.category] - order[b.category]);
    }
    return SYMBOLS.map((s) => ({ s, score: scoreMatch(query, s) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
  }, [query]);

  // active index 가 결과 길이 초과 시 reset
  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results.length, active]);

  function navigateTo(sym: SymbolMeta) {
    setOpen(false);
    const href = `/${sym.category}/${sym.slug}`;
    router.push(href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sym = results[active];
      if (sym) navigateTo(sym);
    }
  }

  return (
    <>
      {/* Header trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.label}
        className="inline-flex items-center gap-1.5 px-2 py-1 h-7 sm:h-8 rounded-md text-[10px] sm:text-[11px] text-text-dim hover:text-text hover:bg-bg-card/70 border border-transparent hover:border-line transition shrink-0"
      >
        <SearchIcon />
        <span className="hidden sm:inline">{t.label}</span>
        <kbd className="hidden md:inline text-[9px] font-mono text-text-dim/70 ml-0.5 px-1 py-0.5 rounded bg-bg-card border border-line/60">
          {t.hintShortcut}
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-bg-card border border-line rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <SearchIcon />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={t.placeholder}
                className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-dim"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="close"
                className="text-text-dim hover:text-text text-xs"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-text-dim">{t.empty}</div>
              ) : (
                <ul className="py-1">
                  {results.map((sym, i) => {
                    const cat = CATEGORY_LABELS[sym.category];
                    const isActive = i === active;
                    const name = locale === "en" ? sym.name_en || sym.name_ko : sym.name_ko || sym.name_en;
                    return (
                      <li key={sym.slug}>
                        <Link
                          href={`/${sym.category}/${sym.slug}` as any}
                          onClick={() => setOpen(false)}
                          onMouseEnter={() => setActive(i)}
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 transition ${
                            isActive ? "bg-accent-blue/10" : "hover:bg-bg-hover/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-base shrink-0">{cat.emoji}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-text truncate">
                                {name}
                                {sym.is_private && (
                                  <span className="ml-1.5 text-[9px] text-accent-purple font-bold">PRIVATE</span>
                                )}
                                {sym.is_index && (
                                  <span className="ml-1.5 text-[9px] text-accent-amber font-bold">INDEX</span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-dim font-mono truncate">
                                {sym.ticker}
                                {sym.krx_code && <span className="ml-1.5">· {sym.krx_code}</span>}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-text-dim shrink-0">{cat.ko}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Hint footer */}
            <div className="px-4 py-2 border-t border-line text-[10px] text-text-dim flex items-center justify-between gap-2">
              <span>{t.hintKeyboard}</span>
              <span className="text-text-dim/70">{results.length} {locale === "ko" ? "종목" : "tickers"}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
