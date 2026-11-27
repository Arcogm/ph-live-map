import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repo>/; local dev stays at /.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/ph-live-map/" : "/",
  build: { outDir: "dist", sourcemap: false },
});
