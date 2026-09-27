import { fileURLToPath, URL } from "node:url";
import { readFile } from "node:fs/promises";
import { defineConfig } from "vite";

const packageSource = (packageName) =>
  fileURLToPath(new URL(`../../packages/${packageName}/src/index.ts`, import.meta.url));
const pixelAssets = fileURLToPath(new URL("../../packages/pixel-assets/assets/", import.meta.url));

const pixelAssetPlugin = {
  name: "commit-garden-pixel-assets",
  configureServer(server) {
    server.middlewares.use("/assets", async (request, response, next) => {
      const name = new URL(request.url ?? "/", "http://localhost").pathname.slice(1);
      if (!["plants.png", "terrain.png"].includes(name)) return next();
      try {
        response.setHeader("Content-Type", "image/png");
        response.end(await readFile(`${pixelAssets}/${name}`));
      } catch (error) {
        next(error);
      }
    });
  },
  async generateBundle() {
    for (const name of ["plants.png", "terrain.png"]) {
      this.emitFile({ type: "asset", fileName: `assets/${name}`, source: await readFile(`${pixelAssets}/${name}`) });
    }
  },
};

export default defineConfig({
  plugins: [pixelAssetPlugin],
  envDir: fileURLToPath(new URL("../../", import.meta.url)),
  resolve: {
    alias: [
      {
        find: "@commit-garden/garden-renderer",
        replacement: packageSource("garden-renderer"),
      },
      {
        find: "@commit-garden/pixel-assets",
        replacement: packageSource("pixel-assets"),
      },
    ],
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    open: true,
  },
  preview: {
    host: "localhost",
    port: 4173,
    strictPort: true,
  },
});
