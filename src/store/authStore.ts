import { create } from "zustand";
import { invoke } from "../lib/api";

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  companyId: number | null;
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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  companyId: null,
  currency: "USD",
  companyLogo: localStorage.getItem("companyLogo"),
  isAuthenticated: false,
  isRegistered: false,
  isLoading: true,

  checkRegistration: async () => {
    try {
      const registered = await invoke<boolean>("is_registered");
      set({ isRegistered: registered, isLoading: false });
    } catch (error) {
      console.error("Failed to check registration:", error);
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    try {
      const response = await invoke<any>("login", { username, password });
      set({ 
        user: response.user, 
        companyId: response.company_id, 
        currency: response.user?.currency || "USD",
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
      set({ 
        user: response.user, 
        companyId: response.company_id, 
        currency: response.user?.currency || "USD",
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

  logout: () => {
    set({ user: null, companyId: null, currency: "USD", companyLogo: null, isAuthenticated: false });
  },
}));



