"use client";

// 라이트/다크 테마 컨텍스트 + 토글 hook.
// - SSR 첫 paint 직전에 layout.tsx 의 inline <script> 로 <html data-theme="..."> 설정 → flicker 0.
// - 이 Provider 는 상태 + setter 만 제공 (실제 DOM attribute 변경은 setter 내부).
// - 의존성 없음 (next-themes 등 외부 라이브러리 X).

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  /** mount 전 SSR 단계에서는 false. mount 후 true. UI 분기에 사용. */
  mounted: boolean;
};

const ThemeContext = createContext<Ctx | null>(null);

/** 초기 paint 전 <head> inline script 에서 셋팅한 값 read. fallback "dark". */
function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR/hydration mismatch 회피 — 첫 render 는 항상 "dark" (layout.tsx default).
  // mount 후 실제 DOM attribute 와 동기화.
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readInitialTheme());
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
    }
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
    // 차트 등 비-CSS 컴포넌트가 listen 할 수 있도록 custom event 발사
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: t } }));
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Provider 없는 곳에서도 호출 가능하도록 안전한 default 반환
    return { theme: "dark", setTheme: () => {}, toggle: () => {}, mounted: false };
  }
  return ctx;
}

/**
 * <head> 에 inject 할 inline script (string).
 * localStorage > prefers-color-scheme > "dark" 우선순위로 첫 paint 전 data-theme 설정.
 * layout.tsx 의 <head> 에 dangerouslySetInnerHTML 로 삽입.
 */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var pref = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    var theme = stored === 'light' || stored === 'dark' ? stored : pref;
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim();
