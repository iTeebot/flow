import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTauri } from "../lib/platform";
import { invoke } from "../lib/api";
import { useToastStore } from "../store/toastStore";
import { RestoreConfirmModal } from "./modals/RestoreConfirmModal";

export const GlobalRestoreHandler: React.FC = () => {
  const { t } = useTranslation("auth");
  const { addToast } = useToastStore();

  const [showConfirm, setShowConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    name: string;
    size: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<string>("file-opened", async (event) => {
        const filePath = event.payload;
        if (filePath.endsWith(".tbf") || filePath.endsWith(".db")) {
          try {
            const { stat } = await import("@tauri-apps/plugin-fs");
            const fileStat = await stat(filePath);
            const fileName = filePath.split(/[\\\/]/).pop() || filePath;

            setPendingFile({
              path: filePath,
              name: fileName,
              size: `${(fileStat.size / (1024 * 1024)).toFixed(2)} MB`,
              date: fileStat.mtime ? new Date(fileStat.mtime).toLocaleString() : new Date().toLocaleString()
            });
            setShowConfirm(true);
          } catch (err) {
            console.error("Failed to stat opened file:", err);
            setPendingFile({
              path: filePath,
              name: filePath.split(/[\\\/]/).pop() || filePath,
              size: "Unknown",
              date: new Date().toLocaleString()
            });
            setShowConfirm(true);
          }
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const executeRestore = async () => {
    if (!pendingFile) return;
    setIsRestoring(true);
    try {
      await invoke("restore_database", { path: pendingFile.path });
      addToast(t("onboarding.restore_success"), "success");

      // Reload app to apply changes
      window.location.reload();
    } catch (err) {
      console.error("Global restore failed:", err);
      addToast(t("onboarding.restore_failed"), "error");
    } finally {
      setIsRestoring(false);
      setShowConfirm(false);
      setPendingFile(null);
    }
  };

  if (!pendingFile) return null;

  return (
    <RestoreConfirmModal
      isOpen={showConfirm}
      onClose={() => {
        setShowConfirm(false);
        setPendingFile(null);
      }}
      onConfirm={executeRestore}
      fileInfo={pendingFile}
      isLoading={isRestoring}
    />
  );
};
