// 기기 내장 STT(iOS Speech / Android SpeechRecognizer) 래퍼.
//
// 실기기에서 실제로 문제가 되는 것들을 여기서 흡수한다.
//  - Android는 continuous여도 침묵이 길면 세션이 끝난다 → end 이벤트에서 되살린다.
//  - "no-speech"는 에러가 아니라 정상적인 침묵이다 → 조용히 재시작.
//  - 재시작이 즉시 실패하며 반복되면 무한루프가 되므로 백오프를 건다.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import type { Segment } from "../types";

export type RecorderStatus = "idle" | "recording" | "paused" | "finished";

const RESTART_DELAY_MS = 250;
const RESTART_BACKOFF_MS = 2000;
/** 이 횟수를 연속으로 즉시 실패하면 되살리기를 포기한다. */
const MAX_FAST_RESTARTS = 5;

export function useLiveTranscript(lang = "ko-KR") {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interim, setInterim] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /** 사용자가 "녹음 중"이기를 원하는 상태. 세션 재시작 판단의 기준. */
  const wantsRecording = useRef(false);
  /** 현재 구간이 시작된 시각. 일시정지하면 null. */
  const segmentStartedAt = useRef<number | null>(null);
  /** 일시정지 구간을 뺀 누적 녹음 시간. */
  const accumulatedMs = useRef(0);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fastRestarts = useRef(0);
  const lastSessionStart = useRef(0);

  const currentElapsed = useCallback(() => {
    const base = accumulatedMs.current;
    return segmentStartedAt.current === null
      ? base
      : base + (Date.now() - segmentStartedAt.current);
  }, []);

  // 타이머 — 화면 갱신용.
  useEffect(() => {
    if (status !== "recording") return;
    const t = setInterval(() => setElapsedMs(currentElapsed()), 200);
    return () => clearInterval(t);
  }, [status, currentElapsed]);

  const beginSession = useCallback(() => {
    lastSessionStart.current = Date.now();
    try {
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        maxAlternatives: 1,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 250 },
        androidIntentOptions: {
          // 말 사이가 잠깐 비어도 세션을 끊지 않게 넉넉히 잡는다.
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 6000,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "음성 인식을 시작하지 못했습니다.");
    }
  }, [lang]);

  const scheduleRestart = useCallback(() => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    // 시작하자마자 끝난 세션은 "즉시 실패"로 본다.
    if (Date.now() - lastSessionStart.current < 1000) {
      fastRestarts.current += 1;
    } else {
      fastRestarts.current = 0;
    }
    if (fastRestarts.current >= MAX_FAST_RESTARTS) {
      wantsRecording.current = false;
      segmentStartedAt.current = null;
      setStatus("paused");
      setError("음성 인식이 계속 중단됩니다. 잠시 후 다시 시작해 주세요.");
      return;
    }
    const delay =
      fastRestarts.current > 0 ? RESTART_BACKOFF_MS : RESTART_DELAY_MS;
    restartTimer.current = setTimeout(() => {
      if (wantsRecording.current) beginSession();
    }, delay);
  }, [beginSession]);

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript?.trim();
    if (!text) return;
    if (event.isFinal) {
      setInterim("");
      setSegments((prev) => [
        ...prev,
        {
          id: `${Date.now().toString(36)}-${prev.length}`,
          text,
          atMs: currentElapsed(),
        },
      ]);
    } else {
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent("volumechange", (event) => {
    // -2 ~ 10 → 0 ~ 1
    setLevel(Math.max(0, Math.min(1, (event.value + 2) / 12)));
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "no-speech" || event.error === "aborted") return;
    setError(event.message || `음성 인식 오류 (${event.error})`);
  });

  useSpeechRecognitionEvent("end", () => {
    setInterim("");
    setLevel(0);
    if (wantsRecording.current) scheduleRestart();
  });

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError("이 기기에서는 음성 인식을 사용할 수 없습니다.");
      return false;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError("마이크와 음성 인식 권한을 허용해 주세요.");
      return false;
    }
    accumulatedMs.current = 0;
    segmentStartedAt.current = Date.now();
    fastRestarts.current = 0;
    setSegments([]);
    setInterim("");
    setElapsedMs(0);
    wantsRecording.current = true;
    setStatus("recording");
    beginSession();
    return true;
  }, [beginSession]);

  const pause = useCallback(() => {
    wantsRecording.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    accumulatedMs.current = currentElapsed();
    segmentStartedAt.current = null;
    setStatus("paused");
    ExpoSpeechRecognitionModule.stop();
  }, [currentElapsed]);

  const resume = useCallback(() => {
    setError(null);
    fastRestarts.current = 0;
    segmentStartedAt.current = Date.now();
    wantsRecording.current = true;
    setStatus("recording");
    beginSession();
  }, [beginSession]);

  const finish = useCallback(() => {
    wantsRecording.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    accumulatedMs.current = currentElapsed();
    segmentStartedAt.current = null;
    setElapsedMs(accumulatedMs.current);
    setStatus("finished");
    ExpoSpeechRecognitionModule.stop();
  }, [currentElapsed]);

  // 화면을 떠나면 마이크를 반드시 놓는다.
  useEffect(() => {
    return () => {
      wantsRecording.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  return {
    status,
    segments,
    interim,
    elapsedMs,
    level,
    error,
    clearError: useCallback(() => setError(null), []),
    start,
    pause,
    resume,
    finish,
  };
}
