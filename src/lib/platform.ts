declare global {
  const __IS_TAURI__: boolean | undefined;
}

export const isTauri = () => {
  if (typeof __IS_TAURI__ !== 'undefined') return __IS_TAURI__;
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const getPlatform = () => {
  return isTauri() ? "tauri" : "web";
};
