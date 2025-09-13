import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Optimasi untuk VPS 1GB RAM
    target: "esnext",
    minify: "terser",
    sourcemap: false, // Disable sourcemap untuk save memory
    rollupOptions: {
      output: {
        // Split chunks untuk mengurangi memory usage
        manualChunks: {
          vendor: ["react", "react-dom"],
          mui: [
            "@mui/material",
            "@mui/system",
            "@emotion/react",
            "@emotion/styled",
          ],
          icons: ["@mui/icons-material"],
          router: ["react-router-dom"],
          charts: ["recharts"],
          utils: ["axios", "react-query", "react-toastify"],
        },
        // Optimasi chunk names
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `img/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      // Eksternal dependencies untuk mengurangi bundle size
      external: [],
    },
    // Terser options untuk memory optimization
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log"],
      },
      mangle: {
        safari10: true,
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  // Memory optimization untuk low-end VPS
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@mui/material",
      "@mui/system",
      "@emotion/react",
      "@emotion/styled",
    ],
    exclude: ["@mui/icons-material"],
  },
  // Performance settings
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
});
