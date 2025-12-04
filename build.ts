import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild_deno_loader";
import "@std/dotenv/load";

import * as path from "@std/path";

const ctx = await esbuild.context({
  plugins: [...denoPlugins({
    configPath: path.resolve(Deno.cwd(), "deno.json"),
  })],
  entryPoints: ["./src/app/App.tsx"],
  outfile: "./public/dist/bundle.js",
  bundle: true,
  format: "esm",
  sourcemap: true,
  minify: false,
  jsx: "automatic",
  define: {
    "process.env.STATICMS_GITHUB_APP_URL": JSON.stringify(
      Deno.env.get("STATICMS_GITHUB_APP_URL") || "",
    ),
  },
});

await ctx.rebuild();
console.log("Build success");
await ctx.dispose();
Deno.exit(0);
