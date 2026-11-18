import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
const THEME_KEY = "lens-feedback-theme";
const mediaQuery = "(prefers-color-scheme: dark)";

function readTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Use the system preference when browser storage is unavailable.
  }
  return "system";
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia(mediaQuery).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#161618" : "#f5f5f7");
}

// Apply the saved preference before React paints either application entry point.
const initialTheme = readTheme();
applyTheme(initialTheme);

const ThemeContext = createContext<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    const update = () => applyTheme(mode);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [mode]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        const next = readTheme();
        applyTheme(next);
        setMode(next);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function changeMode(next: ThemeMode) {
    applyTheme(next);
    setMode(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // The selection still applies to this session.
    }
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode: changeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
