import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: ThemePreference;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemePreference) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "system";
}

function applyEffectiveTheme(effectiveTheme: EffectiveTheme): void {
  document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
}

const themeCycle: ThemePreference[] = ["system", "light", "dark"];

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    readStoredTheme(),
  );
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const effectiveTheme = useMemo((): EffectiveTheme => {
    if (theme === "light") {
      return "light";
    }
    if (theme === "dark") {
      return "dark";
    }
    return systemDark ? "dark" : "light";
  }, [theme, systemDark]);

  applyEffectiveTheme(effectiveTheme);

  useEffect(() => {
    if (theme !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(): void {
      setSystemDark(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const index = themeCycle.indexOf(current);
      const next = themeCycle[(index + 1) % themeCycle.length];
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      effectiveTheme,
      setTheme,
      cycleTheme,
    }),
    [theme, effectiveTheme, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = themeCycle.indexOf(current);
  return themeCycle[(index + 1) % themeCycle.length];
}

const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function themePreferenceLabel(theme: ThemePreference): string {
  return themeLabels[theme];
}
