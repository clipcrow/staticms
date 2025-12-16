import * as esbuild from "esbuild";
import { denoPlugins } from "deno_esbuild";
import * as sass from "sass";

let jsCache: Uint8Array | null = null;
let cssCache: string | null = null;

export async function buildJs(): Promise<Uint8Array> {
  if (jsCache) return jsCache;
  console.log("[Assets] Building Bundle JS...");

  try {
    const result = await esbuild.build({
      plugins: [
        ...denoPlugins({
          configPath: new URL("../../deno.json", import.meta.url).pathname,
        }),
      ],
      entryPoints: ["./src/app/main.tsx"],
      bundle: true,
      format: "esm",
      platform: "browser",
      jsx: "automatic",
      write: false,
    });

    if (result.outputFiles && result.outputFiles.length > 0) {
      jsCache = result.outputFiles[0].contents;
      return jsCache;
    }
    throw new Error("No output generated");
  } catch (e) {
    console.error("JS Build Failed", e);
    throw e;
  }
}

export function buildCss(): string {
  if (cssCache) return cssCache;
  console.log("[Assets] Building CSS...");

  try {
    const result = sass.compile("./src/app/styles/main.scss", {
      style: "compressed",
      sourceMap: false,
    });
    cssCache = result.css;
    return result.css;
  } catch (e) {
    console.error("CSS Build Failed", e);
    throw e;
  }
}
