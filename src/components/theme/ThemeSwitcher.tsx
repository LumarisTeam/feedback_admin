import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const themes = [
  { value: "light", label: "亮色模式", Icon: Sun },
  { value: "dark", label: "暗黑模式", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
] satisfies Array<{ value: ThemeMode; label: string; Icon: typeof Sun }>;

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  return (
    <div className="theme-switcher" role="group" aria-label="外观">
      {themes.map(({ value, label, Icon }) => (
        <button key={value} type="button" aria-label={label} title={label} aria-pressed={mode === value} onClick={() => setMode(value)}>
          <Icon size={16} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
