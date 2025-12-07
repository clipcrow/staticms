import { Application, Router } from "@oak/oak";
import { green, yellow } from "@std/fmt/colors";

import { listRepositories } from "@/server/api/repositories.ts";
import { getContent } from "@/server/api/content.ts";
import { getRepoConfig, saveRepoConfig } from "@/server/api/config.ts";

const app = new Application();
const router = new Router();

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(
    `${green(ctx.request.method)} ${ctx.request.url} - ${yellow(String(rt))}`,
  );
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});
router.get("/api/health", (ctx) => {
  ctx.response.body = { status: "ok", version: "2.0.0" };
});

// Debug Shutdown (Protected by Token)
router.post("/_debug/shutdown", (ctx) => {
  const token = Deno.env.get("STATICMS_ADMIN_TOKEN");
  const headerToken = ctx.request.headers.get("X-Admin-Token");

  if (token && token === headerToken) {
    console.log("Shutdown signal received via API. Exiting...");
    ctx.response.body = { status: "shutdown" };
    // Exit after response
    setTimeout(() => Deno.exit(0), 100);
  } else {
    ctx.response.status = 403;
    ctx.response.body = { error: "Forbidden" };
  }
});

router.get("/api/repositories", listRepositories);
router.get("/api/repo/:owner/:repo/config", getRepoConfig);
router.post("/api/repo/:owner/:repo/config", saveRepoConfig);
router.get("/api/repo/:owner/:repo/contents/(.*)", getContent);

app.use(router.routes());
app.use(router.allowedMethods());

// Static Files & SPA Fallback
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    // SPA Fallback: If static file not found, serve index.html for non-asset routes
    if (
      !ctx.request.url.pathname.startsWith("/api") &&
      !ctx.request.url.pathname.match(/\.(js|css|png|jpg|ico)$/)
    ) {
      try {
        await ctx.send({
          root: `${Deno.cwd()}/public`,
          path: "index.html",
        });
      } catch {
        await next();
      }
    } else {
      await next();
    }
  }
});

const PORT = 8000;
console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
