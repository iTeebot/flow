import { isTauri } from "../lib/platform";

const BUSINESS_JWT_STORAGE_KEY = "teebot_business_jwt";
const BUSINESS_JWT_FILE = "teebot-flow-business-jwt.txt";

async function getDesktopBusinessJwtPath(): Promise<string> {
  const { appConfigDir, join } = await import("@tauri-apps/api/path");
  return join(await appConfigDir(), BUSINESS_JWT_FILE);
}

export async function loadBusinessJwt(): Promise<string | null> {
  if (!isTauri()) {
    const v = localStorage.getItem(BUSINESS_JWT_STORAGE_KEY);
    console.debug('loadBusinessJwt (web) ->', !!v);
    return v;
  }

  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await getDesktopBusinessJwtPath();
    const token = await readTextFile(filePath);
    console.debug('loadBusinessJwt (desktop) from', filePath, '->', !!token);
    return token.trim() || null;
  } catch {
    const v = localStorage.getItem(BUSINESS_JWT_STORAGE_KEY);
    console.debug('loadBusinessJwt fallback (web) ->', !!v);
    return v;
  }
}

export async function saveBusinessJwt(token: string): Promise<void> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return;
  }

  if (!isTauri()) {
    localStorage.setItem(BUSINESS_JWT_STORAGE_KEY, normalizedToken);
    console.debug('saveBusinessJwt (web) -> saved');
    return;
  }

  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const filePath = await getDesktopBusinessJwtPath();
  await writeTextFile(filePath, normalizedToken);
  console.debug('saveBusinessJwt (desktop) -> saved to', filePath);
}

export async function clearBusinessJwt(): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(BUSINESS_JWT_STORAGE_KEY);
    console.debug('clearBusinessJwt (web) -> cleared');
    return;
  }

  try {
    const { remove } = await import("@tauri-apps/plugin-fs");
    const filePath = await getDesktopBusinessJwtPath();
    await remove(filePath);
  } catch (e) {
    const msg = (e && (e as any).message) || String(e);
    console.debug('clearBusinessJwt (desktop) failed:', msg);
  }
}