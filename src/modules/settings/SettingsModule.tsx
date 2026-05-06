import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun, Database, Globe, Layers, Folder, Download, Upload, ShieldAlert, Lock, Key } from "lucide-react";
import { useUiStore, type ThemeMode } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";
import { createBackup, getBackupInfo, exportBackup, generateRecoveryKey } from "./api";
import { useToastStore } from "../../store/toastStore";
import { openPath, invoke } from "../../lib/api";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import languagesData from "../../assets/languages.json";
import { RestoreConfirmModal } from "../../components/modals/RestoreConfirmModal";
import { sendRecoveryCodeEmail, uploadBackup } from "../../utils/cloudSync";
import { checkFullConnectivity } from "../../utils/connectivity";
import { loadRecoveryKey, saveRecoveryKey } from "../../utils/recoveryKeyStore";
import { loadBusinessJwt } from "../../utils/businessJwtStore";

export function SettingsModule() {
  const { t } = useTranslation("settings");
  const { user } = useAuthStore();
  const { themeMode, setThemeMode, resolvedTheme, language, setLanguage } = useUiStore();
  const [backupAt, setBackupAt] = useState<string | null>(null);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [connectivity, setConnectivity] = useState<{ hasInternet: boolean; serverAvailable: boolean } | null>(null);
  const [businessJwtPresent, setBusinessJwtPresent] = useState<boolean | null>(null);
  const { addToast } = useToastStore();
  const { setLoading } = useUiStore();
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    name: string;
    size: string;
    date: string;
  } | null>(null);

  const languageOptions = languagesData.languages.map((l) => ({
    label: l.nativeName || l.name,
    value: l.code,
  }));

  useEffect(() => {
    const loadRecoveryKeyState = async () => {
      try {
        const key = await loadRecoveryKey();
        setEncryptionKey(key);
      } catch (error) {
        console.error("Failed to load recovery key:", error);
      }
    };

    const loadBusinessTokenState = async () => {
      try {
        const t = await loadBusinessJwt();
        setBusinessJwtPresent(!!t);
      } catch (e) {
        console.error('Failed to load business JWT:', e);
        setBusinessJwtPresent(false);
      }
    };

    const loadBackupInfo = async () => {
      try {
        const info = await getBackupInfo();
        setBackupAt(info.last_backup_at ?? null);
        setBackupPath(info.backup_path ?? null);
      } catch {
        // Keep settings usable if backup metadata is unavailable.
      }
    };
    
    const checkConnectivity = async () => {
      try {
        const result = await checkFullConnectivity();
        setConnectivity(result);
      } catch (err) {
        console.error("Failed to check connectivity:", err);
        setConnectivity({ hasInternet: false, serverAvailable: false });
      }
    };
    
    loadBackupInfo();
    loadRecoveryKeyState();
    loadBusinessTokenState();
    checkConnectivity();
    
    // Check connectivity every 10 seconds
    const interval = setInterval(checkConnectivity, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRevealFolder = async () => {
    if (!backupPath) return;
    try {
      await openPath(backupPath);
      addToast(t("opening_backup_dir"), "info");
    } catch {
      addToast(t("reveal_folder_error"), "error");
    }
  };

  // (debug helper removed — use console logs and indicator)

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    addToast(t("theme_set", { mode }), "info");
  };

  const ensureRecoveryKeyExists = async (): Promise<string | null> => {
    // If recovery key already exists, return it
    if (encryptionKey) {
      return encryptionKey;
    }

    // Generate and save recovery key before allowing backup
    try {
      const newKey = await generateRecoveryKey();

      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        title: "Save Master Recovery Key",
        defaultPath: "teebot-recovery-key.txt",
        filters: [{ name: "Text Document", extensions: ["txt"] }]
      });

      // User cancelled the save dialog
      if (!path) {
        addToast(t("key_cancelled", "You must save the recovery key to enable encrypted backups."), "error");
        return null;
      }

      // Save the file
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(path, `TEEBOT FLOW MASTER RECOVERY KEY\n\nKEEP THIS SAFE. IF LOST, YOUR ENCRYPTED BACKUPS CANNOT BE RESTORED.\n\nKEY: ${newKey}\n\nGenerated: ${new Date().toLocaleString()}`);

      // Store in desktop app config only after successful save
      await saveRecoveryKey(newKey);
      setEncryptionKey(newKey);
      addToast(t("key_generated", "Military-grade encryption enabled! Key saved."), "success");

      // Try to send recovery email if connectivity available
      try {
        console.log("📧 Attempting to send recovery email...");
        console.log("User data:", { email: user?.email, company_name: user?.company_name, id: user?.id });
        
        const connectivity = await checkFullConnectivity();
        console.log("Connectivity check result:", { hasInternet: connectivity.hasInternet, serverAvailable: connectivity.serverAvailable });
        
        if (!connectivity.hasInternet) {
          addToast("Internet connection unavailable. Email will be sent when connected.", "info");
          return newKey;
        }
        
        if (!connectivity.serverAvailable) {
          addToast("Cloud server unavailable. Email will be sent when available.", "info");
          return newKey;
        }
        
        if (!user?.email) {
          console.error("❌ User email is missing from auth store");
          addToast("Email address not found. Cannot send recovery code.", "error");
          return newKey;
        }
        
        if (!user?.company_name) {
          console.error("❌ Company name is missing from auth store");
          addToast("Company name not found. Cannot send recovery code.", "error");
          return newKey;
        }
        
        console.log(`📧 Sending recovery email to ${user.email}...`);
        await sendRecoveryCodeEmail(user.email, user.company_name, newKey);
        addToast("Recovery code sent to your email.", "success");
      } catch (e) {
        console.error("❌ Failed to send recovery email:", e);
        addToast("Failed to send recovery email. You can retry from settings.", "info");
      }

      return newKey;
    } catch (err) {
      console.error("Failed to ensure recovery key:", err);
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : "Unknown error");
      addToast(`Failed to setup encryption: ${msg}`, "error");
      return null;
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupBusy(true);
      setLoading(true, t("securing_data", "Processing Data"));

      // Ensure recovery key exists before creating backup
      const key = await ensureRecoveryKeyExists();
      if (!key) {
        return;
      }

      const businessJwt = await loadBusinessJwt();

      // Check connectivity for cloud upload
      const connResult = await checkFullConnectivity();
      setConnectivity(connResult);
      
      if (!connResult.hasInternet) {
        addToast("No internet connection. Cannot upload backup to cloud.", "error");
        return;
      }
      
      if (!connResult.serverAvailable) {
        addToast("Cloud server not available. Cannot upload backup to cloud.", "error");
        return;
      }

      const info = await createBackup(key);
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const fileData = await readFile(info.backup_path || "");
      const backupBlob = new Blob([fileData], { type: "application/octet-stream" });

      if (businessJwt) {
        await uploadBackup(backupBlob);
        addToast("Backup generated and uploaded to cloud successfully!", "success");
      } else {
        addToast("Backup generated locally. Cloud upload requires a business token.", "info");
      }

      setBackupAt(info.last_backup_at ?? null);
      setBackupPath(info.backup_path ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("backup_error");
      addToast(msg, "error");
      if (msg === 'Session Expired') {
        addToast('Your cloud session expired. Please perform a Cloud Sync to refresh your access.', 'info');
      }
    } finally {
      setBackupBusy(false);
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setBackupBusy(true);
      setLoading(true, "Exporting Backup...");

      // Ensure recovery key exists before exporting backup
      const key = await ensureRecoveryKeyExists();
      if (!key) {
        return;
      }

      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        title: t("export_backup_title", "Export Teebot Backup"),
        defaultPath: `teebot-flow-backup-${new Date().toISOString().split('T')[0]}.tbf`,
        filters: [{ name: "Teebot Backup", extensions: ["tbf"] }]
      });

      if (path) {
        await exportBackup(path, key);
        addToast(t("export_success", "Backup exported successfully!"), "success");
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t("export_error", "Failed to export backup"), "error");
    } finally {
      setBackupBusy(false);
      setLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Teebot Backup", extensions: ["tbf"] }]
      });

      if (selected) {
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
      }
    } catch (err) {
      addToast(t("import_error", "Failed to select backup"), "error");
    }
  };

  const executeRestore = async (key?: string) => {
    if (!pendingFile) return;
    setBackupBusy(true);
    setLoading(true, "Restoring Database...");
    try {
      await invoke("restore_database", { path: pendingFile.path, encryptionKey: key });
      addToast(t("restore_success", "Database restored successfully!"), "success");
      window.location.reload();
    } catch (err) {
      console.error("Restore error:", err);
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : "Unknown error");
      addToast(msg, "error");
    } finally {
      setBackupBusy(false);
      setLoading(false);
      setShowRestoreConfirm(false);
      setPendingFile(null);
    }
  };

  const handleGenerateKey = async () => {
    try {
      setBackupBusy(true);
      setLoading(true, "Securing Encryption Key");
      await ensureRecoveryKeyExists();
    } catch (err) {
      console.error("Generate key error:", err);
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : "Unknown error");
      addToast(t("key_error", `Failed to generate key: ${msg}`), "error");
    } finally {
      setBackupBusy(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t("title")}</h1>
        <p className="text-sm text-text-muted mt-1">{t("subtitle")}</p>
        <div className="mt-2 text-xs">
          <span className="font-medium">Cloud token:</span>{' '}
          {businessJwtPresent === null ? <span className="text-text-muted">checking…</span> : businessJwtPresent ? <span className="text-success">present</span> : <span className="text-error">missing</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance Section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {t("visual_identity")}
            </h2>
            <p className="text-xs text-text-muted mt-1">{t("visual_identity_desc")}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { mode: 'system', icon: Monitor, label: t("theme_auto") },
                { mode: 'light', icon: Sun, label: t("theme_light") },
                { mode: 'dark', icon: Moon, label: t("theme_dark") }
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleThemeChange(mode as ThemeMode)}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${themeMode === mode
                    ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5 scale-[1.02]"
                    : "border-border bg-surface/30 text-text-muted hover:border-primary/40 hover:bg-surface/50"
                    }`}
                >
                  <Icon className={`h-6 w-6 ${themeMode === mode ? 'text-primary' : 'text-text-muted/60'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border/50">
              <span className="text-xs font-medium text-text-muted">{t("active_theme_resolved")}</span>
              <span className="text-xs font-black text-primary uppercase tracking-tighter">{resolvedTheme} {t("mode")}</span>
            </div>
          </div>
        </div>

        {/* Localization Section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {t("localization")}
            </h2>
            <p className="text-xs text-text-muted mt-1">{t("localization_desc")}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <SearchableSelect
                label={t("regional_dialect")}
                options={languageOptions}
                value={language}
                onChange={(val) => {
                  setLanguage(val as any);
                  addToast(t("language_updated", { lang: val }), "success");
                }}
              />
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs leading-relaxed text-text-primary/70">
                <span className="font-bold text-primary mr-1">{t("cloud_update")}</span>
                {t("cloud_update_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Security Section */}
        {user?.role === 'admin' && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
            <div className="border-b border-border bg-surface/30 px-6 py-5">
              <h2 className="text-lg font-bold text-error flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                {t("encryption")}
              </h2>
              <p className="text-xs text-text-muted mt-1">{t("encryption_desc")}</p>
            </div>
 
            <div className="p-6 space-y-6">
              {encryptionKey ? (
                <div className="p-4 rounded-xl border border-success/30 bg-success/5 flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-lg">
                    <Lock className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-text-primary">{t("encryption_active")}</h3>
                    <p className="text-xs text-text-muted mt-1">{t("encryption_active_desc")}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-error/5 border border-error/20">
                    <ShieldAlert className="h-5 w-5 text-error shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-text-primary/80">
                      <span className="font-bold text-error mr-1">{t("warning")}</span>
                      {t("encryption_warning")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    disabled={backupBusy}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-error px-6 py-3.5 text-xs font-black uppercase tracking-widest text-error-foreground shadow-lg shadow-error/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <Key className="h-4 w-4" />
                    {t("generate_key")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden lg:col-span-2">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {t("data_integrity")}
            </h2>
            <p className="text-xs text-text-muted mt-1">{t("data_integrity_desc")}</p>
          </div>

          <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-gradient-to-br from-card to-surface/30">
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-widest border-l-2 border-primary/30 pl-2">{t("last_sync")}</p>
                  <p className="text-sm font-bold text-text-primary pl-2">
                    {backupAt ? new Date(backupAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : t("no_history")}
                  </p>
                </div>
                {backupPath && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-text-muted tracking-widest border-l-2 border-primary/30 pl-2">{t("security_archive_path")}</p>
                    <div className="pl-2 flex items-center gap-2 group">
                      <p className="text-[11px] font-mono text-primary truncate max-w-full bg-primary/5 px-2 py-1.5 rounded border border-primary/10 flex-1" title={backupPath}>
                        {backupPath}
                      </p>
                      <button
                        onClick={handleRevealFolder}
                        className="p-1.5 rounded-lg bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 text-text-muted hover:text-primary transition-all shadow-sm"
                        title={t("reveal_in_finder")}
                      >
                        <Folder className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted/70 italic leading-relaxed border-t border-border/40 pt-4">
                {t("backup_desc")}
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleImportBackup}
                disabled={backupBusy}
                className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl border border-primary/30 bg-surface px-8 py-5 text-sm font-black uppercase tracking-widest text-primary shadow-xl transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 h-fit whitespace-nowrap"
              >
                <Upload className="h-5 w-5 shrink-0" />
                <span>{t("import_backup", "Import Backup")}</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                disabled={backupBusy}
                className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl border border-primary/30 bg-surface px-8 py-5 text-sm font-black uppercase tracking-widest text-primary shadow-xl transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 h-fit whitespace-nowrap"
              >
                <Download className="h-5 w-5 shrink-0" />
                <span>{t("export_to_device", "Export to Device")}</span>
              </button>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={backupBusy || !connectivity?.hasInternet || !connectivity?.serverAvailable}
                title={!connectivity?.hasInternet ? "Check your internet connection" : !connectivity?.serverAvailable ? "Cloud server unavailable" : "Upload backup to cloud"}
                className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-primary px-10 py-5 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-2xl shadow-primary/40 transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed h-fit whitespace-nowrap"
              >
                {backupBusy ? (
                  <div className="w-5 h-5 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                ) : <Database className="h-5 w-5 shrink-0" />}
                <span>
                  {backupBusy ? t("securing_data") : !connectivity?.hasInternet ? "Check Internet" : !connectivity?.serverAvailable ? "Server Unavailable" : t("generate_backup")}
                </span>
              </button>
            </div>
          </div>
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
          isLoading={backupBusy}
        />
      )}

      {/* GlobalLoader is now handled by the layout */}
    </div>
  );
}
