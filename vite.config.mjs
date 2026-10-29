import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "public",
  plugins: [tailwindcss()],
  publicDir: false,
  build: {
    outDir: "../dist", // Mengarahkan hasil build keluar ke folder /dist di root project
    emptyOutDir: true
  }
});
