import { create } from "zustand";
import { invoke } from "../lib/api";
import { loadRecoveryKey } from "../utils/recoveryKeyStore";
import { saveBusinessJwt, clearBusinessJwt } from "../utils/businessJwtStore";
import { checkFullConnectivity } from "../utils/connectivity";

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
  currency: string | null;
  email?: string;
  company_name?: string;
  cloud_business_id?: string;
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

async function ensureBusinessJwtFromServer(userId?: number): Promise<string | null> {
  const { loadBusinessJwt } = await import("../utils/businessJwtStore");
  const existingToken = await loadBusinessJwt();
  if (existingToken) {
    return existingToken;
  }

  const connectivity = await checkFullConnectivity();
  if (!connectivity.hasInternet || !connectivity.serverAvailable) {
    console.debug("ensureBusinessJwtFromServer: connectivity unavailable");
    return null;
  }

  if (!userId) {
    console.debug("ensureBusinessJwtFromServer: missing userId");
    return null;
  }

  try {
    const sessionResponse = await invoke<any>("validate_session", { userId });
    if (sessionResponse.businessJwt) {
      console.debug("ensureBusinessJwtFromServer: fetched businessJwt ->", !!sessionResponse.businessJwt);
      await saveBusinessJwt(sessionResponse.businessJwt);
      return sessionResponse.businessJwt;
    }
  } catch (error) {
    console.error("ensureBusinessJwtFromServer: failed to fetch businessJwt:", error);
  }

  return null;
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

  
  
  // Merge backend user data with any locally saved fields we already know.
  // This preserves email/company/cloud identifiers that some backend session
  // responses do not include.
  

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
            const mergedUser = {
              ...response.user,
              email: response.user?.email || user.email,
              company_name: response.user?.company_name || user.company_name,
              cloud_business_id: response.user?.cloud_business_id || user.cloud_business_id,
            };
            localStorage.setItem("currency", userCurrency);
            if (response.logo_base64) {
              localStorage.setItem("companyLogo", response.logo_base64);
            }
            if (response.businessJwt) {
              console.debug('checkRegistration: received businessJwt ->', !!response.businessJwt);
              await saveBusinessJwt(response.businessJwt);
            } else {
              await ensureBusinessJwtFromServer(user.id);
            }
            localStorage.setItem("teebot_user", JSON.stringify(mergedUser));
            set({ 
              user: mergedUser, 
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
      const mergedUser = {
        ...response.user,
        email: response.user?.email || response.user?.username || undefined,
      };
      localStorage.setItem("currency", userCurrency);
      localStorage.setItem("teebot_user", JSON.stringify(mergedUser));
      if (response.logo_base64) {
        localStorage.setItem("companyLogo", response.logo_base64);
      }
      if (response.businessJwt) {
        console.debug('login: received businessJwt ->', !!response.businessJwt);
        await saveBusinessJwt(response.businessJwt);
      } else {
        await ensureBusinessJwtFromServer(response.user?.id);
      }
      set({ 
        user: mergedUser, 
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
      const mergedUser = {
        ...response.user,
        email: response.user?.email || data?.email,
        company_name: response.user?.company_name || data?.company_name,
      };
      localStorage.setItem("currency", userCurrency);
      if (response.logo_base64) {
        localStorage.setItem("companyLogo", response.logo_base64);
      }
      if (response.businessJwt) {
        console.debug('register: received businessJwt ->', !!response.businessJwt);
        await saveBusinessJwt(response.businessJwt);
      } else {
        await ensureBusinessJwtFromServer(response.user?.id);
      }
      localStorage.setItem("teebot_user", JSON.stringify(mergedUser));
      set({ 
        user: mergedUser, 
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
    localStorage.setItem("teebot_user", JSON.stringify(user));
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
    const { sessionId, user } = get();
    
    // Trigger cloud backup before logout if user has cloud account and recovery key
    if (user?.cloud_business_id) {
      try {
        const recoveryKey = await loadRecoveryKey();

        if (recoveryKey) {
          console.log("📤 Triggering cloud backup on logout...");
          const backupInfo = await invoke<any>("create_backup", { encryptionKey: recoveryKey });
          
          // Try to upload backup to cloud
          try {
            const { readFile } = await import("@tauri-apps/plugin-fs");
            const fileData = await readFile(backupInfo.backup_path || "");
            const backupBlob = new Blob([fileData], { type: "application/octet-stream" });
            
            // Import uploadBackup dynamically to avoid circular dependencies
            const { uploadBackup } = await import("../utils/cloudSync");
            await uploadBackup(backupBlob);
            console.log("✅ Cloud backup completed on logout");
          } catch (uploadErr) {
            console.error("⚠️ Failed to upload backup to cloud on logout:", uploadErr);
          }
        }
      } catch (backupErr) {
        console.error("⚠️ Failed to create backup on logout:", backupErr);
      }
    }
    
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
      await clearBusinessJwt();
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
      const mergedUser = {
        ...response.user,
        email: response.user?.email || user.email,
        company_name: response.user?.company_name || user.company_name,
        cloud_business_id: response.user?.cloud_business_id || user.cloud_business_id,
      };
      localStorage.setItem("teebot_user", JSON.stringify(mergedUser));
      if (response.businessJwt) {
        console.debug('checkSession: received businessJwt ->', !!response.businessJwt);
        await saveBusinessJwt(response.businessJwt);
      } else {
        await ensureBusinessJwtFromServer(user.id);
      }
      set({ 
        user: mergedUser, 
        companyId: response.company_id, 
        sessionId: response.session_id,
        currency: mergedUser.currency || "USD",
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



