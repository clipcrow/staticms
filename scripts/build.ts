import { buildJs } from "@/server/build_assets.ts";
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";

const OUT_FILE = "./public/js/bundle.js";

try {
  console.log("Building JS...");
  const content = await buildJs();

  await ensureDir(dirname(OUT_FILE));
  await Deno.writeFile(OUT_FILE, content);

  console.log(`JS Build success: ${OUT_FILE}`);
} catch (e) {
  console.error("JS Build failed:", e);
  Deno.exit(1);
}
