import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild_deno_loader";

import * as path from "@std/path";

const watch = Deno.args.includes("--watch");

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

if (watch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  console.log("Build success");
  await ctx.dispose();
  Deno.exit(0);
}
