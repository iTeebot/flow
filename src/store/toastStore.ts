import { create } from "zustand";

export type Toast = {
  id: string;
  message: string;
  filePath?: string | null;
  type: "success" | "error" | "info";
};

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"], filePath?: string | null) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = "success", filePath = null) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [{ id, message, type, filePath }, ...state.toasts].slice(0, 5), // Keep last 5, newest on top
    }));

    // Auto-remove after 10 seconds if it doesn't have a file path
    if (!filePath) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, 10000);
    }
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
