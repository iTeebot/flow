import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Database, Globe, Layers, Folder } from "lucide-react";
import { useUiStore, type ThemeMode } from "../../store/uiStore";
import { createBackup, getBackupInfo } from "./api";
import { useToastStore } from "../../store/toastStore";
import { openPath } from "../../lib/api";

const languageOptions = [
  { value: "en", label: "English (US)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "gu", label: "ગુજરાતી (Gujarati)" },
  { value: "ur", label: "اردو (Urdu)" },
];

export function SettingsModule() {
  const { themeMode, setThemeMode, resolvedTheme } = useUiStore();
  const [backupAt, setBackupAt] = useState<string | null>(null);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    const loadBackupInfo = async () => {
      try {
        const info = await getBackupInfo();
        setBackupAt(info.last_backup_at ?? null);
        setBackupPath(info.backup_path ?? null);
      } catch {
        // Keep settings usable if backup metadata is unavailable.
      }
    };
    loadBackupInfo();
  }, []);

  const handleRevealFolder = async () => {
    if (!backupPath) return;
    try {
      await openPath(backupPath);
      addToast("Opening backup directory...", "info");
    } catch {
      addToast("Failed to reveal folder.", "error");
    }
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    addToast(`Interface theme set to ${mode}`, "info");
  };

  const handleCreateBackup = async () => {
    try {
      setBackupBusy(true);
      const info = await createBackup();
      setBackupAt(info.last_backup_at ?? null);
      setBackupPath(info.backup_path ?? null);
      addToast("System backup completed successfully.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create backup", "error");
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">System Configuration</h1>
        <p className="text-sm text-text-muted mt-1">Manage global preferences, appearance, and data integrity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance Section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Visual Identity
            </h2>
            <p className="text-xs text-text-muted mt-1">Choose how Teebot looks on your display</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { mode: 'system', icon: Monitor, label: 'Auto' },
                { mode: 'light', icon: Sun, label: 'Light' },
                { mode: 'dark', icon: Moon, label: 'Dark' }
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
              <span className="text-xs font-medium text-text-muted">Currently active theme resolved as:</span>
              <span className="text-xs font-black text-primary uppercase tracking-tighter">{resolvedTheme} MODE</span>
            </div>
          </div>
        </div>

        {/* Localization Section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Internationalization
            </h2>
            <p className="text-xs text-text-muted mt-1">Select your preferred system language</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase text-text-muted ml-1 tracking-wider">Regional Dialect</label>
              <select
                className="w-full"
                defaultValue="en"
              >
                {languageOptions.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs leading-relaxed text-text-primary/70">
                <span className="font-bold text-primary mr-1">Cloud Update:</span>
                Full multilingual support is being rolled out. Some specialized modules may remain in English during the transition phase.
              </p>
            </div>
          </div>
        </div>

        {/* Data Persistence Section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden lg:col-span-2">
          <div className="border-b border-border bg-surface/30 px-6 py-5">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Data Integrity & Backups
            </h2>
            <p className="text-xs text-text-muted mt-1">Ensure your business records are safe and recoverable</p>
          </div>

          <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-gradient-to-br from-card to-surface/30">
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-widest border-l-2 border-primary/30 pl-2">Last Synchronization</p>
                  <p className="text-sm font-bold text-text-primary pl-2">
                    {backupAt ? new Date(backupAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : "No History Found"}
                  </p>
                </div>
                {backupPath && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-text-muted tracking-widest border-l-2 border-primary/30 pl-2">Security Archive Path</p>
                    <div className="pl-2 flex items-center gap-2 group">
                      <p className="text-[11px] font-mono text-primary truncate max-w-full bg-primary/5 px-2 py-1.5 rounded border border-primary/10 flex-1" title={backupPath}>
                        {backupPath}
                      </p>
                      <button
                        onClick={handleRevealFolder}
                        className="p-1.5 rounded-lg bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 text-text-muted hover:text-primary transition-all shadow-sm"
                        title="Reveal in Finder/Explorer"
                      >
                        <Folder className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted/70 italic leading-relaxed border-t border-border/40 pt-4">
                Protect your catalog, customer directory, and financial records by creating regular offline security copies. These can be used to restore your data in case of hardware failure.
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={backupBusy}
                className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-primary px-10 py-5 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-2xl shadow-primary/40 transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 h-fit whitespace-nowrap"
              >
                {backupBusy ? (
                  <div className="w-5 h-5 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                ) : <Database className="h-5 w-5 shrink-0" />}
                <span>{backupBusy ? "Securing Data..." : "Generate Backup Now"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
