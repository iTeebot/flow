import { useToastStore } from "../store/toastStore";
import { CheckCircle2, FolderOpen, X, AlertCircle, Info } from "lucide-react";
import { openPath } from "../lib/api";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const handleOpenFolder = async (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      console.log("[Toast] Revealing in explorer:", filePath);
      await openPath(filePath);
    } catch (err) {
      console.error("[Toast] Open folder error:", err);
      useToastStore.getState().addToast(
        "Unable to open folder: " + String(err),
        "error"
      );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 w-[360px] rounded-lg border border-white/20 p-2 shadow-2xl animate-in slide-in-from-right duration-300 ${
            toast.type === "error" ? "bg-[#ef4444]" : 
            toast.type === "info" ? "bg-blue-600" : "bg-[#10b981]"
          }`}
        >
          <div className="flex items-start gap-2 overflow-hidden flex-1 pl-2 py-1">
            {toast.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
            ) : toast.type === "info" ? (
              <Info className="h-4 w-4 text-white shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-white leading-snug break-words whitespace-pre-wrap">
                {toast.message}
              </span>
              {toast.filePath && (
                <span className="text-[9px] font-mono text-white/80 truncate opacity-70">
                  {toast.filePath.split(/[\\\/]/).pop()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-1 shrink-0 pt-1">
            {toast.filePath && (
              <button
                onClick={(e) => handleOpenFolder(e, toast.filePath!)}
                className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/30 transition-colors"
                title="Open Folder"
              >
                <FolderOpen className="h-3 w-3" />
                Folder
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
