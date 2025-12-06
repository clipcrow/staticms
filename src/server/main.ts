import { Application, Router } from "@oak/oak";
import { green, yellow } from "@std/fmt/colors";

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

// API Routes
router.get("/api/health", (ctx) => {
  ctx.response.body = { status: "ok", version: "2.0.0" };
});

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
    // Fallback to index.html for SPA routing (if file not found)
    // For now, simple 404 is fine as we don't have client-side routing logic yet.
    // In future, we might serve index.html here.
    await next();
  }
});

const PORT = 8000;
console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
