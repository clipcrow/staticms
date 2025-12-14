import { Router } from "@oak/oak";
import { GitHubUserClient } from "../github.ts";
import { getSessionToken } from "../auth.ts";

export const compareRouter = new Router();

compareRouter.get("/api/repo/:owner/:repo/compare", async (ctx) => {
  const { owner, repo } = ctx.params;
  const base = ctx.request.url.searchParams.get("base");
  const head = ctx.request.url.searchParams.get("head");
  const token = await getSessionToken(ctx);

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  if (!base || !head) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing base or head parameter" };
    return;
  }

  const client = new GitHubUserClient(token);
  try {
    const result = await client.compareCommits(owner, repo, base, head);
    ctx.response.body = result;
    // deno-lint-ignore no-explicit-any
  } catch (e: any) {
    console.error("Compare error:", e);
    ctx.response.status = e.status || 500;
    ctx.response.body = { error: e.message };
  }
});
