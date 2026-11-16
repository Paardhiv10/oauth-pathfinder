"use client";
import { useEffect, useState } from "react";

type Mode = "light" | "dark";

const ICONS: Record<Mode, React.ReactNode> = {
  light: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
};

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  // No saved choice yet: start from the device setting, which the CSS also follows.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("theme"); } catch {}
    if (saved === "light" || saved === "dark") setMode(saved);
    else setMode(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    document.documentElement.dataset.theme = m;
    try { localStorage.setItem("theme", m); } catch {}
  };

  return (
    <div className="theme" role="radiogroup" aria-label="Color theme">
      {(["light", "dark"] as Mode[]).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          aria-label={`${m[0].toUpperCase()}${m.slice(1)} theme`}
          title={`${m[0].toUpperCase()}${m.slice(1)}`}
          className={mode === m ? "on" : ""}
          onClick={() => choose(m)}
        >
          {ICONS[m]}
        </button>
      ))}
    </div>
  );
}
