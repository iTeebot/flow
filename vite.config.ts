import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import { resolve } from "path";
import JavaScriptObfuscator from 'javascript-obfuscator';
import type { ObfuscatorOptions } from 'javascript-obfuscator';
import type { RenderedChunk } from 'rollup';

function obfuscateChunksPlugin(options: ObfuscatorOptions) {
  return {
    name: 'obfuscate-chunks',
    apply: 'build' as const,
    renderChunk(code: string, chunk: RenderedChunk) {
      if (!chunk.fileName.endsWith('.js')) {
        return null;
      }
      const isVendor = chunk.fileName.includes('vendor-');
      const isUrdu = chunk.fileName.includes('Pakistan.ur-');
      if (isVendor || isUrdu) {
        return null;
      }
      
      const obfuscationResult = JavaScriptObfuscator.obfuscate(code, options);
      const result: { code: string; map?: string } = {
        code: obfuscationResult.getObfuscatedCode(),
      };
      
      if (options.sourceMap && options.sourceMapMode !== "inline") {
        result.map = obfuscationResult.getSourceMap();
      }
      return result;
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  // Detect if building for Tauri desktop
  const isTauri = process.env.TAURI_ENV_PLATFORM || env.IS_TAURI === 'true' || mode === 'tauri';
  const host = process.env.TAURI_DEV_HOST || env.TAURI_DEV_HOST;

  return {
    plugins: [
      react(),
      tailwindcss(),
      isProduction ? obfuscateChunksPlugin({
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 4000,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: false,
        splitStrings: false,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.75,
        stringArrayEncoding: ['base64'],
        stringArrayIndexesType: ['hexadecimal-number'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }) : null,
    ].filter(Boolean),

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
      // Optimize for production
      target: isTauri ? 'chrome105' : 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      // Explicitly set the input to avoid any "tauri/index.html" resolution issues
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
      chunkSizeWarningLimit: 2000
    },
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    }
  };
});

