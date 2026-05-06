import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Detect if building for Tauri desktop
  const isTauri = process.env.TAURI_ENV_PLATFORM || env.IS_TAURI === 'true' || mode === 'tauri';
  const host = process.env.TAURI_DEV_HOST || env.TAURI_DEV_HOST;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // When building for Tauri, strip the large release binaries from the output
      ...(isTauri ? [{
        name: 'exclude-releases',
        generateBundle(_opts: any, bundle: any) {
          for (const key of Object.keys(bundle)) {
            if (key.startsWith('releases/')) {
              delete bundle[key];
            }
          }
        }
      }] : [])
    ],

    // Inject compile-time constant so app code can reliably detect Tauri vs Web
    define: {
      '__IS_TAURI__': JSON.stringify(!!isTauri)
    },

    publicDir: 'public',

    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
          protocol: "ws",
          host,
          port: 1421,
        }
        : undefined,
      proxy: {
        '/api': {
          target: 'https://api.afmsolution.tech',
          changeOrigin: true,
          secure: false,
        }
      },
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
    build: {
      // Explicitly set the input to avoid any "tauri/index.html" resolution issues
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-router-dom', 'zustand'],
            'pdf': ['jspdf'],
            'ui': ['recharts', 'lucide-react']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  };
});

