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
        target: "http://localhost:3002", // Fixed: was 5000, now matches production
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild", // Changed from terser to esbuild for better memory efficiency
    sourcemap: false,
    reportCompressedSize: false, // Disable compressed size reporting to save memory
    rollupOptions: {
      output: {
        experimentalMinChunkSize: 1000, // Minimize chunk fragmentation
        manualChunks: {
          vendor: ["react", "react-dom"],
          mui: ["@mui/material", "@mui/system", "@emotion/react", "@emotion/styled"],
          icons: ["@mui/icons-material"],
          router: ["react-router-dom"],
          charts: ["recharts"],
          utils: ["axios", "react-query", "react-toastify"],
        },
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
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@mui/material", "@mui/system", "@emotion/react", "@emotion/styled"],
  },
  base: "/",
});
