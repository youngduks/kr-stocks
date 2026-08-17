// 실시간 요약 엔진.
//
// 확정된 자막이 일정량 쌓이거나(=말이 이어질 때) 일정 시간이 지나면(=천천히 말할 때)
// 아직 요약에 반영되지 않은 부분만 서버로 보낸다. 서버는 "이전 요약 + 새 자막"을 받아
// 누적 요약을 갱신해 돌려준다. 전체 녹취록을 매번 다시 보내지 않는 게 핵심.

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, summarizeChunk, finalizeNote } from "../lib/api";
import { transcriptWithTimestamps } from "../lib/format";
import type { FinalNote, LiveSummary, Segment, VoiceMode } from "../types";

/** 이만큼 쌓이면 바로 요약을 돌린다. */
const TRIGGER_CHARS = 280;
/** 분량이 모자라도 이 시간이 지나면 돌린다. */
const TRIGGER_IDLE_MS = 40000;
const TICK_MS = 2000;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 60000;

export type SummaryStatus = "idle" | "waiting" | "updating" | "error";

export function useLiveSummary(mode: VoiceMode) {
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [status, setStatus] = useState<SummaryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [pendingChars, setPendingChars] = useState(0);

  // 인터벌 콜백이 항상 최신 값을 보도록 ref로 미러링한다.
  const segmentsRef = useRef<Segment[]>([]);
  const elapsedRef = useRef(0);
  const activeRef = useRef(false);
  const summaryRef = useRef<LiveSummary | null>(null);
  const consumedRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastRunAt = useRef(Date.now());
  const failures = useRef(0);
  const nextAllowedAt = useRef(0);
  /** 최종 정리에 들어가면 중간 요약을 봉인한다. 늦게 도착한 응답이 최종본을 덮어쓰지 않도록. */
  const sealed = useRef(false);

  /** 더 이상 중간 요약을 돌리지 않는다. 녹음 종료 시점에 호출. */
  const seal = useCallback(() => {
    sealed.current = true;
  }, []);

  const runSummary = useCallback(async () => {
    if (sealed.current) return;
    const all = segmentsRef.current;
    const pending = all.slice(consumedRef.current);
    if (pending.length === 0) return;

    inFlightRef.current = true;
    setStatus("updating");
    const upTo = all.length;

    try {
      const { summary: next } = await summarizeChunk({
        mode,
        previous: summaryRef.current,
        newTranscript: transcriptWithTimestamps(pending),
        elapsedSec: Math.round(elapsedRef.current / 1000),
      });
      if (sealed.current) return; // 요청 중에 녹음이 끝났다면 결과를 버린다.
      summaryRef.current = next;
      consumedRef.current = upTo;
      failures.current = 0;
      nextAllowedAt.current = 0;
      setSummary(next);
      setUpdatedAt(Date.now());
      setError(null);
      setStatus(activeRef.current ? "waiting" : "idle");
    } catch (err) {
      // 소비 위치를 유지해 다음 시도에서 같은 자막을 다시 보낸다.
      failures.current += 1;
      nextAllowedAt.current =
        Date.now() +
        Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures.current - 1));
      setError(
        err instanceof ApiError ? err.message : "요약을 갱신하지 못했습니다.",
      );
      setStatus("error");
    } finally {
      inFlightRef.current = false;
      lastRunAt.current = Date.now();
    }
  }, [mode]);

  // 트리거 루프.
  useEffect(() => {
    const t = setInterval(() => {
      const pending = segmentsRef.current.slice(consumedRef.current);
      const chars = pending.reduce((n, s) => n + s.text.length, 0);
      setPendingChars(chars);

      if (sealed.current || inFlightRef.current || chars === 0) return;
      if (Date.now() < nextAllowedAt.current) return;

      const idleFor = Date.now() - lastRunAt.current;
      if (chars >= TRIGGER_CHARS || idleFor >= TRIGGER_IDLE_MS) {
        void runSummary();
      }
    }, TICK_MS);
    return () => clearInterval(t);
  }, [runSummary]);

  /** 녹음 화면에서 매 렌더마다 최신 상태를 밀어 넣는다. */
  const sync = useCallback(
    (segments: Segment[], elapsedMs: number, active: boolean) => {
      segmentsRef.current = segments;
      elapsedRef.current = elapsedMs;
      activeRef.current = active;
    },
    [],
  );

  /** 남은 자막을 기다리지 않고 지금 바로 요약. */
  const flush = useCallback(() => {
    if (inFlightRef.current) return;
    nextAllowedAt.current = 0;
    void runSummary();
  }, [runSummary]);

  /** 녹음 종료 후 전체 녹취록으로 최종 노트 생성. */
  const finalize = useCallback(
    async (segments: Segment[], durationSec: number): Promise<FinalNote> => {
      sealed.current = true;
      setStatus("updating");
      try {
        const { note } = await finalizeNote({
          mode,
          previous: summaryRef.current,
          transcript: transcriptWithTimestamps(segments),
          durationSec,
        });
        summaryRef.current = note;
        setSummary(note);
        setUpdatedAt(Date.now());
        setError(null);
        setStatus("idle");
        return note;
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "최종 정리에 실패했습니다.",
        );
        setStatus("error");
        throw err;
      }
    },
    [mode],
  );

  return {
    summary,
    status,
    error,
    updatedAt,
    pendingChars,
    sync,
    flush,
    seal,
    finalize,
  };
}
