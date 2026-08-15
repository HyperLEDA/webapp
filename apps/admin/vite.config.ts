import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
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
    passWithNoTests: true,
  },
});
