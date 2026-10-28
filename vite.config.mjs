import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "public",
  plugins: [tailwindcss()],
  publicDir: false,
});
