import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      db: path.resolve(__dirname, "db"),
    },
  },
  root: path.resolve(__dirname, "client"),
  optimizeDeps: {
    exclude: [
      "@tiptap/pm",
      "@radix-ui/react-icons",
      "@tiptap/core",
      "@tiptap/react",
      "@optimize deps",
      "optimizeDeps.exclude",
    ], // Add other problematic dependencies here
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
