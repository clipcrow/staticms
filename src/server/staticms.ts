// Staticmsのサーバーの実態
import { Application, Router, send } from "@oak/oak";

export const staticms = new Application();
const router = new Router();

router.get("/ping", (ctx) => {
  ctx.response.body = "Hello World";
});

staticms.use(router.routes());
staticms.use(async (ctx) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: "./public",
      index: "index.html",
    });
  } catch {
    ctx.response.status = 404;
  }
});
