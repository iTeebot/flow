import { create } from "zustand";
import i18n from "../lib/i18n";

type ModuleKey =
  | "dashboard"
  | "delivery-challan"
  | "quotations"
  | "inventory"
  | "customers"
  | "reports"
  | "invoices"
  | "profile"
  | "users"
  | "analytics"
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

type LanguageKey = "en" | "hi" | "gu" | "ur";

type UiState = {
  activeModule: ModuleKey;
  sidebarCollapsed: boolean;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  language: LanguageKey;
  isLoading: boolean;
  loadingMessage: string | null;
  setActiveModule: (module: ModuleKey) => void;
  toggleSidebar: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageKey) => void;
  setLoading: (isLoading: boolean, message?: string | null) => void;
  initializeStore: () => void;
  syncSystemTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeModule: "delivery-challan",
  sidebarCollapsed: false,
  themeMode: "system",
  resolvedTheme: getSystemTheme(),
  language: "en",
  isLoading: false,
  loadingMessage: null,
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setThemeMode: (mode) => {
    const resolved = mode === "system" ? getSystemTheme() : mode;
    localStorage.setItem("ui-theme-mode", mode);
    applyTheme(resolved);
    set({ themeMode: mode, resolvedTheme: resolved });
  },
  setLanguage: (lang) => {
    localStorage.setItem("ui-language", lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
  setLoading: (isLoading, message = null) => set({ isLoading, loadingMessage: message }),
  initializeStore: () => {
    // Theme initialization
    const storedTheme = localStorage.getItem("ui-theme-mode");
    const mode: ThemeMode =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
    const resolved = mode === "system" ? getSystemTheme() : mode;
    applyTheme(resolved);
    
    // Language initialization
    const storedLang = localStorage.getItem("ui-language") as LanguageKey;
    const lang: LanguageKey = ["en", "hi", "gu", "ur"].includes(storedLang) ? storedLang : "en";
    i18n.changeLanguage(lang);
    
    set({ themeMode: mode, resolvedTheme: resolved, language: lang });
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
