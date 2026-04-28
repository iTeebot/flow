import { invoke } from "../../lib/api";

export type BackupInfo = {
  backup_path?: string | null;
  last_backup_at?: string | null;
};

export async function getBackupInfo() {
  return invoke<BackupInfo>("get_backup_info");
}

export async function createBackup(encryptionKey?: string) {
  return invoke<BackupInfo>("create_backup", { encryptionKey });
}

export async function exportBackup(path: string, encryptionKey?: string) {
  return invoke<void>("export_backup", { path, encryptionKey });
}

export async function generateRecoveryKey() {
  return invoke<string>("generate_recovery_key");
}
