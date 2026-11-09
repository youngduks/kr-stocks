"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 기준 시각 + 신선도 표시. 데이터 시각(at)이 FRESH_MS 이내면 초록 점(실시간), 아니면 회색 점 + 'N분 전'.
 * SSR 은 시각만 렌더(시간 의존 텍스트는 mount 후) → hydration mismatch 없음.
 */
const FRESH_MS = 5 * 60_000;

function fmtKst(iso: string | number, locale: "ko" | "en") {
  try {
    const d = new Date(iso);
    const s = d.toLocaleString(locale === "en" ? "en-US" : "ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${s} KST`;
  } catch {
    return "";
  }
}

// 묵은 화면 자동 갱신 (2026-11-09, 아이폰 사파리 "176분 전 데이터" 사례)
//   원인: ISR 첫 방문자가 묵은 HTML 을 받거나, 사파리가 탭·뒤로가기(bfcache)로 예전 화면을 그대로 복원.
//   화면이 열릴 때·다시 보일 때(visibilitychange)·bfcache 복원(pageshow persisted) 때 기준 시각이 5분보다
//   오래됐으면 router.refresh(). ISR 은 첫 refresh 에 묵은 값 + 백그라운드 재생성이므로 4초 뒤 다시 시도.
//   한 번의 계기당 최대 3회, 계기 사이 최소 60초 → 무한 반복·과도한 요청 없음.
export const AUTO_REFRESH_MAX_TRIES = 3;
export const AUTO_REFRESH_RETRY_MS = 4_000;
export const AUTO_REFRESH_COOLDOWN_MS = 60_000;

/** 순수 판단 함수 (테스트용으로 분리) — 지금 새로고침을 시도할지 */
export function shouldAutoRefresh(p: {
  atMs: number;
  nowMs: number;
  tries: number;
  inflight: boolean;
}): boolean {
  if (!Number.isFinite(p.atMs)) return false;
  if (p.inflight) return false;
  if (p.tries >= AUTO_REFRESH_MAX_TRIES) return false;
  return p.nowMs - p.atMs >= FRESH_MS;
}

// 자동 갱신 상태는 모듈 수준 — router.refresh 응답으로 컴포넌트가 다시 마운트돼도 시도 횟수·쿨다운 유지
// (2026-11-09 시험: ref 로 두면 재마운트 때 초기화돼 1회 더 호출됨). 주소가 바뀌면 초기화.
const auto: {
  key: string;
  tries: number;
  inflight: boolean;
  lastCycleAt: number;
  timer: number;
  atMs: number;
  refresh: (() => void) | null;
  setBusy: ((b: boolean) => void) | null;
} = { key: "", tries: 0, inflight: false, lastCycleAt: 0, timer: 0, atMs: NaN, refresh: null, setBusy: null };

function autoAttempt() {
  const now = Date.now();
  if (!shouldAutoRefresh({ atMs: auto.atMs, nowMs: now, tries: auto.tries, inflight: auto.inflight })) {
    if (auto.tries >= AUTO_REFRESH_MAX_TRIES || now - auto.atMs < FRESH_MS) auto.setBusy?.(false);
    return;
  }
  if (!auto.refresh) return;
  auto.tries += 1;
  auto.inflight = true;
  auto.setBusy?.(true);
  // 진단용 호출 횟수 (테스트에서 '최대 3회' 확인)
  const w = window as unknown as { __krsAutoRefreshCalls?: number };
  w.__krsAutoRefreshCalls = (w.__krsAutoRefreshCalls ?? 0) + 1;
  auto.refresh();
  // ISR 은 첫 refresh 에 묵은 값을 주고 뒤에서 재생성 → 잠시 뒤 아직 묵었으면 한 번 더
  window.clearTimeout(auto.timer);
  auto.timer = window.setTimeout(() => {
    auto.inflight = false;
    autoAttempt();
  }, AUTO_REFRESH_RETRY_MS);
}

function autoStartCycle() {
  if (document.visibilityState !== "visible") return;
  const key = window.location.pathname;
  if (auto.key !== key) {
    auto.key = key;
    auto.lastCycleAt = 0;
    auto.tries = 0;
  }
  const now = Date.now();
  if (now - auto.atMs < FRESH_MS) return;
  if (now - auto.lastCycleAt < AUTO_REFRESH_COOLDOWN_MS) return;
  auto.lastCycleAt = now;
  auto.tries = 0;
  auto.inflight = false;
  autoAttempt();
}

export function AsOf({
  at,
  locale = "ko",
  note,
  className = "",
  autoRefresh = false,
}: {
  /** ISO 시각 */
  at: string | number;
  locale?: "ko" | "en";
  /** 추가 설명 (예: "약 2분마다 갱신") */
  note?: string;
  className?: string;
  /** 기준 시각이 5분보다 오래되면 화면 열림·복귀 때 router.refresh() (실시간 시세 화면만 켤 것) */
  autoRefresh?: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const atMs = new Date(at).getTime();
  if (autoRefresh) auto.atMs = atMs;

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // 새 데이터 도착(at 변경) → 진행 중 시도 해제. 신선해졌으면 사이클 종료
  useEffect(() => {
    if (!autoRefresh) return;
    auto.inflight = false;
    setNow(Date.now());
    if (Date.now() - atMs < FRESH_MS) {
      auto.tries = 0;
      setRefreshing(false);
    }
  }, [atMs, autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    auto.refresh = () => router.refresh();
    auto.setBusy = setRefreshing;
    // 사이클 도중 다시 마운트된 경우(refresh 응답으로 트리가 바뀜) 표시만 이어받음 — 상태는 모듈 수준이라 초기화 안 됨
    if (auto.tries > 0 && auto.tries < AUTO_REFRESH_MAX_TRIES && Date.now() - auto.atMs >= FRESH_MS) setRefreshing(true);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        autoStartCycle();
      }
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setNow(Date.now());
        autoStartCycle();
      }
    };
    autoStartCycle(); // 화면이 열릴 때 (쿨다운이 같은 주소의 재마운트 중복을 막음)
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
      if (auto.setBusy === setRefreshing) auto.setBusy = null;
      // 재시도 타이머는 지우지 않음 — 다시 마운트된 인스턴스의 refresh 로 이어짐
    };
  }, [autoRefresh, router]);

  const ageMs = now == null ? 0 : now - atMs;
  const fresh = now == null || ageMs < FRESH_MS;
  const ageMin = Math.max(0, Math.round(ageMs / 60_000));
  const status =
    now == null
      ? null
      : refreshing && !fresh
        ? locale === "en"
          ? "Updating…"
          : "최신 데이터 받는 중"
        : fresh
          ? locale === "en"
            ? "Live"
            : "실시간"
          : locale === "en"
            ? `${ageMin} min ago`
            : `${ageMin}분 전 데이터`;
  return (
    <div className={`flex items-center gap-2 ds-meta min-w-0 ${className}`}>
      <span className={fresh ? "ds-live-dot" : "ds-idle-dot"} aria-hidden="true" />
      <span className="truncate">
        {status && <span className="font-semibold">{status} · </span>}
        {fmtKst(at, locale)} {locale === "en" ? "as of" : "기준"}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  );
}
