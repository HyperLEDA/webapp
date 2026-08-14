import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://leda.kraysent.dev",
        changeOrigin: true,
      },
      "/admin": {
        target: "https://leda.kraysent.dev",
        changeOrigin: true,
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
