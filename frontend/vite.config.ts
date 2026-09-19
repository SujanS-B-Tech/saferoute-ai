import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev: /api/* is proxied to the FastAPI server, so no CORS setup is needed locally.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": { target: "http://localhost:8000", rewrite: (p) => p.replace(/^\/api/, "") } } },
});
