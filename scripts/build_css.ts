import * as sass from "sass";
import { ensureDir } from "@std/fs";

const SCSS_ENTRY = "./src/app/styles/main.scss";
const CSS_OUT = "./public/styles/main.css";

try {
  console.log(`Compiling SCSS from ${SCSS_ENTRY}...`);

  const result = sass.compile(SCSS_ENTRY, {
    style: "expanded", // "compressed" for production
    sourceMap: false,
  });

  await ensureDir("./public/styles");
  await Deno.writeTextFile(CSS_OUT, result.css);

  console.log(`CSS compiled to ${CSS_OUT}`);
} catch (error) {
  console.error("SCSS Compilation failed:", error);
  Deno.exit(1);
}
