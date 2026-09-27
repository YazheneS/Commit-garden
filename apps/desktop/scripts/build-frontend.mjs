import { build } from "esbuild";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const frontendRoot = path.join(appRoot, "frontend");
await mkdir(path.join(frontendRoot, "assets"), { recursive: true });
await copyFile(path.join(appRoot, "index.html"), path.join(frontendRoot, "index.html"));
await copyFile(path.join(appRoot, "styles.css"), path.join(frontendRoot, "styles.css"));

await build({
  absWorkingDir: appRoot,
  entryPoints: [path.join(appRoot, "src/frontend.ts")],
  outfile: path.join(frontendRoot, "assets/app.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  minify: process.argv.includes("--production"),
});
