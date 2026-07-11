declare global {
  const __IS_TAURI__: boolean | undefined;
}

export const GITHUB_REPO = "iTeebot/flow";
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const SNAP_STORE_URL = "https://snapcraft.io/teebot-flow";

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

/**
 * Construct a direct GitHub Release download URL for a specific asset.
 * Pattern: https://github.com/{owner}/{repo}/releases/download/v{version}/{filename}
 */
export const getDownloadLink = (version: string, filename: string) => {
  return `${GITHUB_RELEASES_URL}/download/v${version}/${filename}`;
};

/**
 * Get all available downloads for each platform from GitHub Releases.
 */
export const getReleaseDownloads = (version: string) => ({
  Windows: [
    {
      name: "Installer (EXE)",
      url: getDownloadLink(version, `Teebot-Flow_${version}_x64-setup.exe`),
    },
    {
      name: "MSI Package",
      url: getDownloadLink(version, `Teebot-Flow_${version}_x64_en-US.msi`),
    },
  ],
  Linux: [
    {
      name: "AppImage",
      url: getDownloadLink(version, `teebot-flow_${version}_amd64.AppImage`),
    },
    {
      name: "Debian Package (.deb)",
      url: getDownloadLink(version, `teebot-flow_${version}_amd64.deb`),
    },
    {
      name: "Snap Store",
      url: SNAP_STORE_URL,
    },
  ],
  macOS: [
    {
      name: "DMG (Apple Silicon)",
      url: getDownloadLink(version, `Teebot-Flow_${version}_aarch64.dmg`),
    },
    {
      name: "DMG (Intel)",
      url: getDownloadLink(version, `Teebot-Flow_${version}_x64.dmg`),
    },
  ],
});

export const getBestDownloadForOS = (os: string, version: string) => {
  const tagUrl = `${GITHUB_RELEASES_URL}/tag/v${version}`;
  switch (os) {
    case "Windows":
      return {
        label: "Download for Windows",
        url: getDownloadLink(version, `Teebot-Flow_${version}_x64-setup.exe`),
      };
    case "macOS":
      return {
        label: "Download for macOS",
        url: getDownloadLink(version, `Teebot-Flow_${version}_aarch64.dmg`),
      };
    case "Linux":
      return {
        label: "Download for Linux (.deb)",
        url: getDownloadLink(version, `teebot-flow_${version}_amd64.deb`),
      };
    default:
      return {
        label: "View All Downloads",
        url: tagUrl,
      };
  }
};
