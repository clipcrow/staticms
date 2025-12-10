import { RouterContext } from "@oak/oak";
import { kv } from "@/server/auth.ts";

export const dumpKvKeys = async (ctx: RouterContext<string>) => {
  console.log("=== KV DEBUG DUMP START ===");
  const iter = kv.list({ prefix: [] });
  let count = 0;
  for await (const res of iter) {
    count++;
    console.log(`Key: ${JSON.stringify(res.key)}`);

    // Show value for config keys
    if (res.key[0] === "config") {
      console.log("Value:", res.value);
    }
  }
  console.log(`=== KV DEBUG DUMP END (Total: ${count}) ===`);

  ctx.response.status = 200;
  ctx.response.body = "OK. Check server console.";
};
