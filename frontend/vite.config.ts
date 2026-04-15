import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    target: "ES2020",
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  define: {
    "process.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL),
  },
});
