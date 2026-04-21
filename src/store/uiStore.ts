import { create } from "zustand";

type ModuleKey =
  | "dashboard"
  | "delivery-challan"
  | "inventory"
  | "customers"
  | "reports"
  | "invoices"
  | "profile"
  | "settings"
  | "info";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme: ResolvedTheme) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
};

type UiState = {
  activeModule: ModuleKey;
  sidebarCollapsed: boolean;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setActiveModule: (module: ModuleKey) => void;
  toggleSidebar: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  initializeTheme: () => void;
  syncSystemTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeModule: "delivery-challan",
  sidebarCollapsed: false,
  themeMode: "system",
  resolvedTheme: getSystemTheme(),
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setThemeMode: (mode) => {
    const resolved = mode === "system" ? getSystemTheme() : mode;
    localStorage.setItem("ui-theme-mode", mode);
    applyTheme(resolved);
    set({ themeMode: mode, resolvedTheme: resolved });
  },
  initializeTheme: () => {
    const stored = localStorage.getItem("ui-theme-mode");
    const mode: ThemeMode =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = mode === "system" ? getSystemTheme() : mode;
    applyTheme(resolved);
    set({ themeMode: mode, resolvedTheme: resolved });
  },
  syncSystemTheme: () =>
    set((state) => {
      if (state.themeMode !== "system") {
        return state;
      }
      const resolved = getSystemTheme();
      applyTheme(resolved);
      return { ...state, resolvedTheme: resolved };
    }),
}));

export type { ModuleKey, ThemeMode, ResolvedTheme };
