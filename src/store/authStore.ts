import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
}

// Helper to check if running in Tauri context
const isTauri = () => {
  return (window as any).__TAURI_INTERNALS__ !== undefined;
};

interface AuthState {
  user: User | null;
  companyId: number | null;
  isAuthenticated: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  checkRegistration: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  companyId: null,
  isAuthenticated: false,
  isRegistered: false,
  isLoading: true,

  checkRegistration: async () => {
    try {
      if (!isTauri()) {
        set({ isLoading: false });
        return;
      }
      const registered = await invoke<boolean>("is_registered");
      set({ isRegistered: registered, isLoading: false });
    } catch (error) {
      console.error("Failed to check registration:", error);
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    try {
      if (!isTauri()) {
        throw new Error("Application must run in Tauri mode. Use 'pnpm run tauri dev' instead of 'pnpm run dev'");
      }
      const response = await invoke<any>("login", { username, password });
      set({ user: response.user, companyId: response.company_id, isAuthenticated: true });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      if (!isTauri()) {
        throw new Error("Application must run in Tauri mode. Use 'pnpm run tauri dev' instead of 'pnpm run dev'");
      }
      const response = await invoke<any>("register", { input: data });
      set({ user: response.user, companyId: response.company_id, isAuthenticated: true, isRegistered: true });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },

  setUser: (user) => {
    set({ user });
  },

  logout: () => {
    set({ user: null, companyId: null, isAuthenticated: false });
  },
}));
