import { invoke } from "@tauri-apps/api/core";

export type BackupInfo = {
  backup_path?: string | null;
  last_backup_at?: string | null;
};

export async function getBackupInfo() {
  return invoke<BackupInfo>("get_backup_info");
}

export async function createBackup() {
  return invoke<BackupInfo>("create_backup");
}
