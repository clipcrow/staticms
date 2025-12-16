import { buildCss } from "@/server/build_assets.ts";
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";

const OUT_FILE = "./public/styles/main.css";

try {
  console.log("Building CSS...");
  const css = buildCss();

  await ensureDir(dirname(OUT_FILE));
  await Deno.writeTextFile(OUT_FILE, css);

  console.log(`CSS Build success: ${OUT_FILE}`);
} catch (error) {
  console.error("CSS Build failed:", error);
  Deno.exit(1);
}
