import { isTauri } from "../lib/platform";
import { loadRecoveryKey, saveRecoveryKey } from "./recoveryKeyStore";

const CLOUD_UPLOAD_CREDENTIALS_FILE = "teebot-flow-cloud-upload-credentials.json";
const CLOUD_UPLOAD_EMAIL_FILE = "teebot-flow-cloud-upload-email.txt";

export interface CloudUploadCredentials {
  email: string;
  secretKey: string;
}

async function getDesktopCredentialsPath(): Promise<string> {
  const { appConfigDir, join } = await import("@tauri-apps/api/path");
  return join(await appConfigDir(), CLOUD_UPLOAD_CREDENTIALS_FILE);
}

async function getDesktopEmailPath(): Promise<string> {
  const { appConfigDir, join } = await import("@tauri-apps/api/path");
  return join(await appConfigDir(), CLOUD_UPLOAD_EMAIL_FILE);
}

export async function loadCloudUploadCredentials(): Promise<CloudUploadCredentials | null> {
  if (!isTauri()) {
    const email = localStorage.getItem("teebot_cloud_upload_email");
    const secretKey = await loadRecoveryKey();
    if (email && secretKey) {
      return { email, secretKey };
    }
    return null;
  }

  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await getDesktopCredentialsPath();
    const raw = await readTextFile(filePath);
    const parsed = JSON.parse(raw) as Partial<CloudUploadCredentials>;

    const email = typeof parsed.email === "string" ? parsed.email.trim() : "";
    const secretKey = typeof parsed.secretKey === "string" ? parsed.secretKey.trim() : "";

    if (!email || !secretKey) {
      return null;
    }

    return { email, secretKey };
  } catch {
    const secretKey = await loadRecoveryKey();
    if (!secretKey) {
      return null;
    }
    return null;
  }
}

export async function saveCloudUploadCredentials(email: string, secretKey: string): Promise<void> {
  const normalizedEmail = email.trim();
  const normalizedSecretKey = secretKey.trim();

  if (!normalizedEmail || !normalizedSecretKey) {
    throw new Error("Cloud upload credentials are incomplete.");
  }

  await saveRecoveryKey(normalizedSecretKey);

  if (!isTauri()) {
    localStorage.setItem("teebot_cloud_upload_email", normalizedEmail);
    return;
  }

  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const filePath = await getDesktopCredentialsPath();
  await writeTextFile(filePath, JSON.stringify({ email: normalizedEmail, secretKey: normalizedSecretKey }, null, 2));
}

export async function loadCloudUploadEmail(): Promise<string | null> {
  if (!isTauri()) {
    return localStorage.getItem("teebot_cloud_upload_email");
  }

  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await getDesktopEmailPath();
    const email = await readTextFile(filePath);
    return email.trim() || null;
  } catch {
    return null;
  }
}

export async function saveCloudUploadEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return;
  }

  if (!isTauri()) {
    localStorage.setItem("teebot_cloud_upload_email", normalizedEmail);
    return;
  }

  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const filePath = await getDesktopEmailPath();
  await writeTextFile(filePath, normalizedEmail);
}
