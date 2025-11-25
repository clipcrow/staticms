import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild_deno_loader";

import * as path from "@std/path";

try {
  await esbuild.build({
    plugins: [...denoPlugins({
      configPath: path.resolve(Deno.cwd(), "deno.json"),
    })],
    entryPoints: ["./src/app/App.tsx"],
    outfile: "./public/js/bundle.js",
    bundle: true,
    format: "esm",
    sourcemap: true,
    minify: false,
    jsx: "automatic",
  });
  console.log("Build success");
} catch (e) {
  console.error("Build failed", e);
  Deno.exit(1);
} finally {
  esbuild.stop();
}
