import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const THEME_EVENT = "ww-theme-change";

let currentTheme: Theme = "light";
let initialized = false;

const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";

const applyThemeToDom = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

const initTheme = () => {
  if (initialized) return;
  initialized = true;

  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const initial: Theme = isTheme(stored) ? stored : prefersDark ? "dark" : "light";

  currentTheme = initial;
  applyThemeToDom(initial);
  localStorage.setItem("theme", initial);
};

export const setTheme = (theme: Theme) => {
  initTheme();
  if (currentTheme === theme) return;

  currentTheme = theme;
  applyThemeToDom(theme);
  localStorage.setItem("theme", theme);
  window.dispatchEvent(new Event(THEME_EVENT));
};

const subscribe = (onStoreChange: () => void) => {
  initTheme();

  const onEvent = () => onStoreChange();

  const onStorage = (e: StorageEvent) => {
    if (e.key !== "theme") return;
    if (!isTheme(e.newValue)) return;
    if (currentTheme === e.newValue) return;

    currentTheme = e.newValue;
    applyThemeToDom(currentTheme);
    onStoreChange();
  };

  window.addEventListener(THEME_EVENT, onEvent);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(THEME_EVENT, onEvent);
    window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = () => {
  initTheme();
  return currentTheme;
};

const getServerSnapshot = (): Theme => "light";

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  return { theme, toggleTheme, setTheme };
};
