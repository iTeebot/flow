import { create } from "zustand";
import { invoke } from "../lib/api";

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
  currency: string | null;
}

interface AuthState {
  user: User | null;
  companyId: number | null;
  sessionId: number | null;
  currency: string;
  companyLogo: string | null;
  isAuthenticated: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  checkRegistration: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  setUser: (user: User) => void;
  setCurrency: (currency: string) => void;
  setCompanyLogo: (logo: string | null) => void;
  logout: () => void;
  resetSystem: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  companyId: null,
  sessionId: null,
  currency: localStorage.getItem("currency") || "USD",
  companyLogo: localStorage.getItem("companyLogo"),
  isAuthenticated: false,
  isRegistered: false,
  isLoading: true,

  checkRegistration: async () => {
    try {
      const registered = await invoke<boolean>("is_registered");
      if (registered) {
        // Try to recover session if user was logged in
        const savedUser = localStorage.getItem("teebot_user");
        if (savedUser) {
          try {
            const user = JSON.parse(savedUser);
            const response = await invoke<any>("validate_session", { userId: user.id });
            const userCurrency = response.user?.currency || "USD";
            localStorage.setItem("currency", userCurrency);
            if (response.logo_base64) {
              localStorage.setItem("companyLogo", response.logo_base64);
            }
            set({ 
              user: response.user, 
              companyId: response.company_id, 
              sessionId: response.session_id,
              currency: userCurrency,
              companyLogo: response.logo_base64 || localStorage.getItem("companyLogo"),
              isAuthenticated: true 
            });
          } catch {
            localStorage.removeItem("teebot_user");
            set({ isAuthenticated: false });
          }
        }
      }
      set({ isRegistered: registered, isLoading: false });
    } catch (error) {
      console.error("Failed to check registration:", error);
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    try {
      const response = await invoke<any>("login", { username, password });
      const userCurrency = response.user?.currency || "USD";
      localStorage.setItem("currency", userCurrency);
      localStorage.setItem("teebot_user", JSON.stringify(response.user));
      if (response.logo_base64) {
        localStorage.setItem("companyLogo", response.logo_base64);
      }
      set({ 
        user: response.user, 
        companyId: response.company_id, 
        sessionId: response.session_id,
        currency: userCurrency,
        companyLogo: response.logo_base64 || localStorage.getItem("companyLogo"),
        isAuthenticated: true 
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      const response = await invoke<any>("register", { input: data });
      const userCurrency = response.user?.currency || "USD";
      localStorage.setItem("currency", userCurrency);
      if (response.logo_base64) {
        localStorage.setItem("companyLogo", response.logo_base64);
      }
      set({ 
        user: response.user, 
        companyId: response.company_id, 
        sessionId: response.session_id,
        currency: userCurrency,
        companyLogo: response.logo_base64 || localStorage.getItem("companyLogo"),
        isAuthenticated: true, 
        isRegistered: true 
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },

  setUser: (user) => {
    set({ user });
  },

  setCurrency: (currency) => {
    localStorage.setItem("currency", currency);
    set({ currency });
  },

  setCompanyLogo: (logo) => {
    if (logo) {
      localStorage.setItem("companyLogo", logo);
    } else {
      localStorage.removeItem("companyLogo");
    }
    set({ companyLogo: logo });
  },

  logout: async () => {
    const { sessionId } = get();
    if (sessionId) {
      try {
        await invoke("logout_session", { sessionId });
      } catch (err) {
        console.error("Failed to log out session:", err);
      }
    }
    localStorage.removeItem("teebot_user");
    set({ user: null, companyId: null, sessionId: null, currency: "USD", companyLogo: null, isAuthenticated: false });
  },
  resetSystem: async () => {
    try {
      await invoke("reset_database");
      localStorage.clear();
      set({ 
        user: null, 
        companyId: null, 
        currency: "USD", 
        companyLogo: null, 
        isAuthenticated: false, 
        isRegistered: false 
      });
    } catch (error) {
      console.error("System reset failed:", error);
      throw error;
    }
  },
  checkSession: async () => {
    const savedUser = localStorage.getItem("teebot_user");
    if (!savedUser) return false;

    try {
      const user = JSON.parse(savedUser);
      const response = await invoke<any>("validate_session", { userId: user.id });
      set({ 
        user: response.user, 
        companyId: response.company_id, 
        sessionId: response.session_id,
        currency: response.user?.currency || "USD",
        isAuthenticated: true 
      });
      return true;
    } catch {
      localStorage.removeItem("teebot_user");
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },
}));



