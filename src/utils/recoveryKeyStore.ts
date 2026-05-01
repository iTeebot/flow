import { isTauri } from "../lib/platform";

const RECOVERY_KEY_FILE = "teebot-flow-recovery-key.txt";
const RECOVERY_KEY_STORAGE_KEY = "teebot_recovery_key";

async function getDesktopRecoveryKeyPath(): Promise<string> {
  const { appConfigDir, join } = await import("@tauri-apps/api/path");
  const configDir = await appConfigDir();
  return await join(configDir, RECOVERY_KEY_FILE);
}

async function readDesktopRecoveryKey(): Promise<string | null> {
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await getDesktopRecoveryKeyPath();

    try {
      const key = await readTextFile(filePath);
      return key.trim() || null;
    } catch {
      const legacyKey = localStorage.getItem(RECOVERY_KEY_STORAGE_KEY);
      if (legacyKey) {
        await saveRecoveryKey(legacyKey);
        localStorage.removeItem(RECOVERY_KEY_STORAGE_KEY);
        return legacyKey;
      }
      return null;
    }
  } catch (error) {
    console.error("Failed to read desktop recovery key:", error);
    return null;
  }
}

export async function loadRecoveryKey(): Promise<string | null> {
  if (!isTauri()) {
    return localStorage.getItem(RECOVERY_KEY_STORAGE_KEY);
  }

  return readDesktopRecoveryKey();
}

export async function saveRecoveryKey(key: string): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(RECOVERY_KEY_STORAGE_KEY, key);
    return;
  }

  const { writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs");
  const { appConfigDir } = await import("@tauri-apps/api/path");

  // Ensure config directory exists
  const configDir = await appConfigDir();
  await mkdir(configDir, { recursive: true });

  const filePath = await getDesktopRecoveryKeyPath();
  await writeTextFile(filePath, key);
}

export async function clearRecoveryKey(): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(RECOVERY_KEY_STORAGE_KEY);
    return;
  }

  try {
    const { remove } = await import("@tauri-apps/plugin-fs");
    const filePath = await getDesktopRecoveryKeyPath();
    await remove(filePath);
  } catch {
    // Ignore missing file and cleanup errors.
  }
}