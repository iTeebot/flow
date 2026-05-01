import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Database, Cloud, ArrowRight, ShieldCheck, Zap, Globe2 } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Button } from "../../components/ui/Button";
import { checkInternetConnectivity, checkServerHealth, checkFullConnectivity } from "../../utils/connectivity";
import { useToastStore } from "../../store/toastStore";
import { useAuthStore } from "../../store/authStore";
import { isTauri, invoke } from "../../lib/api";
import { RestoreConfirmModal } from "../../components/modals/RestoreConfirmModal";
import { FullscreenLoader } from "../../components/ui/FullscreenLoader";

interface OnboardingViewProps {
  onSelectRegister: () => void;
  onSelectCloudSync: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onSelectRegister, onSelectCloudSync }) => {
  const { t } = useTranslation("auth");
  const { addToast } = useToastStore();
  const { checkRegistration } = useAuthStore();
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isCloudAvailable, setIsCloudAvailable] = useState<boolean | null>(null); // null = checking, true = available, false = unavailable
  const [hasInternet, setHasInternet] = useState<boolean | null>(null); // null = checking, true = connected, false = disconnected
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    name: string;
    size: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    checkConnectivity();
  }, []);

  const checkConnectivity = async () => {
    console.log('Starting connectivity check...');
    setHasInternet(null);
    setIsCloudAvailable(null);

    const result = await checkFullConnectivity();
    setHasInternet(result.hasInternet);
    setIsCloudAvailable(result.serverAvailable);
  };

  const handleCloudSyncClick = async () => {
    // Security check: Verify cloud is still available before proceeding
    console.log('Security check: Re-verifying cloud connectivity before proceeding...');
    
    setIsCloudAvailable(null); // Show checking state
    
    const internetConnected = await checkInternetConnectivity();
    setHasInternet(internetConnected);
    
    if (!internetConnected) {
      setIsCloudAvailable(false);
      addToast(t("onboarding.cloud_security_no_internet", "Internet connection lost. Please check your network."), "error");
      return;
    }
    
    const serverAvailable = await checkServerHealth();
    setIsCloudAvailable(serverAvailable);
    
    if (!serverAvailable) {
      addToast(t("onboarding.cloud_security_server_unavailable", "Cloud service is no longer available. Please try again later."), "error");
      return;
    }
    
    // If we get here, cloud is still available - proceed to cloud sync
    console.log('Security check passed: Proceeding to cloud sync');
    onSelectCloudSync();
  };

  const handleRestoreBackup = async () => {

    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: false,
          filters: [{ name: "Teebot Backup", extensions: ["tbf"] }]
        });

        if (selected) {
          try {
            const { stat } = await import("@tauri-apps/plugin-fs");
            const fileStat = await stat(selected);
            const fileName = selected.split(/[\\\/]/).pop() || selected;

            setPendingFile({
              path: selected,
              name: fileName,
              size: `${(fileStat.size / (1024 * 1024)).toFixed(2)} MB`,
              date: fileStat.mtime ? new Date(fileStat.mtime).toLocaleString() : new Date().toLocaleString()
            });
            setShowRestoreConfirm(true);
          } catch (err) {
            console.error("Failed to get file stats:", err);
            setPendingFile({
              path: selected,
              name: selected.split(/[\\\/]/).pop() || selected,
              size: "Unknown",
              date: new Date().toLocaleString()
            });
            setShowRestoreConfirm(true);
          }
        }
      } catch (err) {
        console.error("Tauri Restore failed:", err);
        addToast(t("onboarding.restore_failed"), "error");
      }
    } else {
      // Web Fallback
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".tbf,.db";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setPendingFile({
            path: "browser-upload",
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            date: new Date(file.lastModified).toLocaleString()
          });
          setShowRestoreConfirm(true);
        }
      };
      input.click();
    }
  };

  const executeRestore = async (key?: string) => {
    if (!pendingFile) return;
    setIsRestoring(true);
    try {
      if (isTauri()) {
        await invoke("restore_database", { path: pendingFile.path, encryptionKey: key });
      } else {
        await new Promise(r => setTimeout(r, 1500));
        localStorage.setItem("teebot_profile", JSON.stringify({ mock: true }));
      }
      addToast(t("onboarding.restore_success"), "success");
      await checkRegistration();
    } catch (err) {
      console.error("Restore error:", err);
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : t("onboarding.restore_failed"));
      addToast(msg, "error");
    } finally {
      setIsRestoring(false);
      setShowRestoreConfirm(false);
      setPendingFile(null);
    }
  };

  const options = [
    {
      id: "register",
      title: t("onboarding.new_title"),
      desc: t("onboarding.new_desc"),
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/10",
      action: onSelectRegister,
      buttonText: t("onboarding.new_btn"),
      primary: true,
      disabled: false
    },
    {
      id: "backup",
      title: t("onboarding.backup_title"),
      desc: t("onboarding.backup_desc"),
      icon: Database,
      color: "text-cyan",
      bg: "bg-cyan/10",
      action: handleRestoreBackup,
      buttonText: t("onboarding.backup_btn"),
      loading: isRestoring,
      disabled: false
    },
    {
      id: "cloud",
      title: t("onboarding.cloud_title"),
      desc: hasInternet === false 
        ? t("onboarding.cloud_desc_no_internet", "No internet connection. Please check your network and try again.")
        : isCloudAvailable === false 
        ? t("onboarding.cloud_desc_server_unreachable", "Internet connected, but cloud service is unreachable. Server may be down.")
        : isCloudAvailable === null
        ? t("onboarding.cloud_desc_checking", "Checking cloud service availability...")
        : t("onboarding.cloud_desc"),
      icon: hasInternet === false ? Globe2 : Cloud,
      color: hasInternet === false ? "text-red-500" : isCloudAvailable === false ? "text-orange-500" : "text-purple-500",
      bg: hasInternet === false ? "bg-red-500/10" : isCloudAvailable === false ? "bg-orange-500/10" : "bg-purple-500/10",
      action: hasInternet === false ? checkConnectivity : isCloudAvailable ? handleCloudSyncClick : checkConnectivity,
      buttonText: hasInternet === false 
        ? t("onboarding.check_internet_btn", "Check Internet Again")
        : isCloudAvailable === false 
        ? t("onboarding.check_server_btn", "Check Server Again")
        : isCloudAvailable === null
        ? t("onboarding.checking_btn", "Checking...")
        : t("onboarding.cloud_btn"),
      loading: isCloudAvailable === null,
      disabled: isCloudAvailable === null,
      visible: true
    }
  ].filter(opt => opt.visible !== false);

  return (
    <div className="h-screen bg-background flex items-center justify-center overflow-hidden">
      <div className="w-full h-full bg-surface overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] animate-in fade-in zoom-in-95 duration-500">

        <Sidebar type="register" />

        <div className="w-full p-6 lg:p-10 flex flex-col justify-center bg-surface overflow-y-auto">
          <header className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-black text-text-primary tracking-tight mb-2">
              {t("onboarding.welcome_title")}
            </h2>
            <p className="text-sm text-text-muted max-w-md">
              {t("onboarding.welcome_desc")}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {options.map((opt) => (
              <div
                key={opt.id}
                className={`group relative p-3 rounded-xl border transition-all duration-300 ${opt.disabled ? 'opacity-60 grayscale' : 'hover:border-primary/50 hover:bg-primary/5 hover:translate-x-1'
                  } border-border bg-card shadow-sm`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-lg ${opt.bg} ${opt.color} shrink-0 shadow-inner`}>
                    <opt.icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 space-y-0">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      {opt.title}
                    </h3>
                    <p className="text-[11px] text-text-muted leading-relaxed max-w-sm">
                      {opt.desc}
                    </p>
                  </div>

                  <Button
                    onClick={opt.action}
                    disabled={opt.disabled || opt.loading}
                    isLoading={opt.loading}
                    variant={opt.primary ? "primary" : "secondary"}
                    className="shrink-0 w-full sm:w-auto px-6 h-9 text-xs"
                    rightIcon={!opt.loading && <ArrowRight className="h-3.5 w-3.5" />}
                  >
                    {opt.buttonText}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                {t("onboarding.local_first")}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {t("onboarding.high_performance")}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Globe2 className="h-3.5 w-3.5" />
              <span>{t("onboarding.language_tip")}</span>
            </div>
          </footer>
        </div>
      </div>

      {pendingFile && (
        <RestoreConfirmModal
          isOpen={showRestoreConfirm}
          onClose={() => {
            setShowRestoreConfirm(false);
            setPendingFile(null);
          }}
          onConfirm={executeRestore}
          fileInfo={pendingFile}
          isLoading={isRestoring}
        />
      )}

      <FullscreenLoader
        isVisible={isRestoring && !showRestoreConfirm}
        message={t("onboarding.restoring_data", "Restoring Data")}
        subMessage={t("onboarding.restore_wait_msg", "Please wait while we decrypt and restore your financial data. Do not close the app.")}
      />
    </div>
  );
};
