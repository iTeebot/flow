import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useUiStore, type ThemeMode } from "../../store/uiStore";
import { createBackup, getBackupInfo } from "./api";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
];

export function SettingsModule() {
  const { themeMode, setThemeMode, resolvedTheme } = useUiStore();
  const [backupAt, setBackupAt] = useState<string | null>(null);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

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

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const handleCreateBackup = async () => {
    try {
      setBackupBusy(true);
      setBackupError(null);
      setBackupNotice(null);
      const info = await createBackup();
      setBackupAt(info.last_backup_at ?? null);
      setBackupPath(info.backup_path ?? null);
      setBackupNotice("Backup created successfully.");
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-muted">Configure app preferences and display behavior.</p>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Appearance</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition ${
              themeMode === "system"
                ? "border-primary bg-primary/15 text-text-primary"
                : "border-border bg-background text-text-muted hover:border-primary/50 hover:text-text-primary"
            }`}
          >
            <Monitor className="h-4 w-4" />
            System
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition ${
              themeMode === "light"
                ? "border-primary bg-primary/15 text-text-primary"
                : "border-border bg-background text-text-muted hover:border-primary/50 hover:text-text-primary"
            }`}
          >
            <Sun className="h-4 w-4" />
            Light
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition ${
              themeMode === "dark"
                ? "border-primary bg-primary/15 text-text-primary"
                : "border-border bg-background text-text-muted hover:border-primary/50 hover:text-text-primary"
            }`}
          >
            <Moon className="h-4 w-4" />
            Dark
          </button>
        </div>
        <p className="mt-3 text-sm text-text-muted">
          Active theme: <span className="font-medium text-text-primary capitalize">{resolvedTheme}</span>
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Language</h2>
        <div className="max-w-md space-y-3">
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary"
            defaultValue="en"
          >
            {languageOptions.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-text-muted">
            TODO: Language switching is placeholder only in this phase.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Backup</h2>
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Last backup:{" "}
            <span className="font-medium text-text-primary">
              {backupAt ? new Date(backupAt).toLocaleString() : "Never"}
            </span>
          </p>
          {backupPath ? (
            <p className="text-xs text-text-muted break-all">Path: {backupPath}</p>
          ) : null}
          {backupError ? <p className="text-sm text-red-600">{backupError}</p> : null}
          {backupNotice ? <p className="text-sm text-green-600">{backupNotice}</p> : null}
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={backupBusy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {backupBusy ? "Creating Backup..." : "Backup"}
          </button>
        </div>
      </div>
    </div>
  );
}
