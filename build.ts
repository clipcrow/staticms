import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild_deno_loader";

import * as path from "@std/path";

const ctx = await esbuild.context({
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

await ctx.rebuild();
console.log("Build success");
await ctx.dispose();
Deno.exit(0);
