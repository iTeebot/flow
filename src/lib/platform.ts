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

const ASSET_NAMES = {
  windows: {
    exe: (version: string) => `Teebot.Flow_${version}_x64-setup.exe`,
    msi: (version: string) => `Teebot.Flow_${version}_x64_en-US.msi`,
  },
  linux: {
    appImage: (version: string) => `Teebot Flow_${version}_amd64.AppImage`,
    deb: (version: string) => `Teebot Flow_${version}_amd64.deb`,
    rpm: (version: string) => `Teebot.Flow-${version}-1.x86_64.rpm`,
  },
  macOS: {
    aarch64: (version: string) => `Teebot.Flow_${version}_aarch64.dmg`,
    x64: (version: string) => `Teebot.Flow_${version}_x64.dmg`,
  },
};

const getMacArch = (): "aarch64" | "x64" | null => {
  if (typeof window === "undefined") return null;
  
  // 1. Try WebGL detection first (highly accurate for Apple Silicon GPUs, bypassing masked user-agent strings)
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        if (
          renderer.includes("apple") ||
          renderer.includes("m1") ||
          renderer.includes("m2") ||
          renderer.includes("m3") ||
          renderer.includes("m4")
        ) {
          return "aarch64";
        }
      }
    }
  } catch (e) {
    // Proceed to fallback
  }

  // 2. Fallback to User Agent checks
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("arm64") || userAgent.includes("aarch64")) {
    return "aarch64";
  }
  if (userAgent.includes("intel") || userAgent.includes("x64") || userAgent.includes("x86_64")) {
    return "x64";
  }
  
  return null;
};

/**
 * Get all available downloads for each platform from GitHub Releases.
 */
export const getReleaseDownloads = (version: string) => ({
  Windows: [
    {
      name: "Installer (EXE)",
      url: getDownloadLink(version, ASSET_NAMES.windows.exe(version)),
    },
    {
      name: "MSI Package",
      url: getDownloadLink(version, ASSET_NAMES.windows.msi(version)),
    },
  ],
  Linux: [
    {
      name: "AppImage",
      url: getDownloadLink(version, ASSET_NAMES.linux.appImage(version)),
    },
    {
      name: "Debian Package (.deb)",
      url: getDownloadLink(version, ASSET_NAMES.linux.deb(version)),
    },
    {
      name: "Red Hat Package (.rpm)",
      url: getDownloadLink(version, ASSET_NAMES.linux.rpm(version)),
    },
    {
      name: "Snap Store",
      url: SNAP_STORE_URL,
    },
  ],
  macOS: [
    {
      name: "DMG (Apple Silicon)",
      url: getDownloadLink(version, ASSET_NAMES.macOS.aarch64(version)),
    },
    {
      name: "DMG (Intel)",
      url: getDownloadLink(version, ASSET_NAMES.macOS.x64(version)),
    },
  ],
});

export const getBestDownloadForOS = (os: string, version: string) => {
  const tagUrl = `${GITHUB_RELEASES_URL}/tag/v${version}`;
  switch (os) {
    case "Windows":
      return {
        label: "Download for Windows",
        url: getDownloadLink(version, ASSET_NAMES.windows.exe(version)),
      };
    case "macOS": {
      const arch = getMacArch();
      if (arch === "aarch64") {
        return {
          label: "Download for macOS",
          url: getDownloadLink(version, ASSET_NAMES.macOS.aarch64(version)),
        };
      } else if (arch === "x64") {
        return {
          label: "Download for macOS",
          url: getDownloadLink(version, ASSET_NAMES.macOS.x64(version)),
        };
      }
      return {
        label: "View All Downloads",
        url: tagUrl,
      };
    }
    case "Linux":
      return {
        label: "Download for Linux (.deb)",
        url: getDownloadLink(version, ASSET_NAMES.linux.deb(version)),
      };
    default:
      return {
        label: "View All Downloads",
        url: tagUrl,
      };
  }
};
