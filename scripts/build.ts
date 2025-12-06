import * as esbuild from "esbuild";
import { denoPlugins } from "deno_esbuild";

try {
  console.log("Building...");
  await esbuild.build({
    plugins: [
      ...denoPlugins({
        configPath: new URL("../deno.json", import.meta.url).pathname,
      }),
    ],
    entryPoints: ["./src/app/main.tsx"],
    outfile: "./public/js/bundle.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    logLevel: "warning", // infoだと余計なログが出るかもなので
  });
  console.log("Build success");
} catch (e) {
  console.error("Build failed:", e);
  // deno-lint-ignore no-explicit-any
  if ((e as any).errors) {
    // deno-lint-ignore no-explicit-any
    (e as any).errors.forEach((err: any) => console.error(err));
  }
  Deno.exit(1);
} finally {
  esbuild.stop();
}
