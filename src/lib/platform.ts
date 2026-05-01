declare global {
  const __IS_TAURI__: boolean | undefined;
}

export const isTauri = () => {
  // Check for the existence of Tauri-injected internals at runtime.
  // This is the only way to reliably distinguish between a browser
  // and a Tauri window during development on the same port.
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const getPlatform = () => {
  return isTauri() ? "tauri" : "web";
};

export const detectOS = () => {
  if (typeof window === "undefined") return "Windows";
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (userAgent.indexOf("win") !== -1) return "Windows";
  if (userAgent.indexOf("mac") !== -1) return "macOS";
  if (userAgent.indexOf("linux") !== -1) return "Linux";
  if (userAgent.indexOf("x11") !== -1) return "Linux";
  
  return "Windows"; // Default fallback
};

export const getBestDownloadForOS = (os: string) => {
  switch (os) {
    case "Windows":
      return {
        label: "Download for Windows",
        url: "/releases/win/teebot-flow_0.0.5_x64-setup.exe"
      };
    case "macOS":
      return {
        label: "Download for macOS",
        url: "/releases/mac/teebot-flow_0.0.5_arm64.dmg"
      };
    case "Linux":
      return {
        label: "Download for Linux (.deb)",
        url: "/releases/linux/teebot-flow_0.0.5_amd64.deb"
      };
    default:
      return {
        label: "Download App",
        url: "#downloads"
      };
  }
};
