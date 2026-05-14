"use client";

// 종목 공유 버튼 — Web Share API (모바일 native dialog) + clipboard fallback (데스크탑)
// 형님 5/14 요청: viral 마찰 0 — 카톡/디시갤/X 공유 1탭

import { useState } from "react";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    label: "공유",
    copy: "URL 복사",
    copied: "✓ 복사됨!",
    toastShared: "공유 완료",
    failed: "공유 실패",
    titleSuffix: "24시간 시세",
  },
  en: {
    label: "Share",
    copy: "Copy URL",
    copied: "✓ Copied!",
    toastShared: "Shared",
    failed: "Share failed",
    titleSuffix: "24h price",
  },
} as const;

type Props = {
  /** 페이지 절대 URL (server에서 주입 권장) */
  url: string;
  /** Native share dialog title — 예: "삼성전자 24시간 시세" */
  title: string;
  /** Native share dialog text — 한 줄 설명 */
  text?: string;
  /** UI variant */
  variant?: "button" | "compact";
  locale?: Locale;
};

export function ShareButton({
  url,
  title,
  text,
  variant = "button",
  locale = "ko",
}: Props) {
  const t = I18N[locale];
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    // 카드 안에 들어가 있으면 Link 클릭 막아야 함
    e.preventDefault();
    e.stopPropagation();

    if (busy) return;
    setBusy(true);

    try {
      // 1. Web Share API (iOS / Android / 일부 모바일 Chrome)
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav && typeof nav.share === "function") {
        try {
          await nav.share({ title, text, url });
          setBusy(false);
          return;
        } catch (err: any) {
          // user 취소는 정상 — toast 안 띄움
          if (err?.name === "AbortError") {
            setBusy(false);
            return;
          }
          // 그 외 에러는 clipboard fallback
        }
      }

      // 2. Clipboard fallback (데스크탑 + Web Share 미지원 모바일)
      if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
        await nav.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // 3. 마지막 fallback — textarea + execCommand (구형 브라우저)
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // silent
    }
    setBusy(false);
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={t.label}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-text-dim hover:text-text hover:bg-bg-card/70 border border-transparent hover:border-line transition shrink-0"
      >
        <ShareIcon />
        <span>{copied ? t.copied : t.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t.label}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-text bg-bg-card hover:bg-bg-hover border border-line hover:border-accent-blue/50 transition"
    >
      <ShareIcon />
      <span>{copied ? t.copied : t.label}</span>
    </button>
  );
}

function ShareIcon() {
  // iOS 스타일 share 아이콘 (square + arrow up)
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
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
