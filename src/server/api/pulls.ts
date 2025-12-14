import { Router } from "@oak/oak";
import { GitHubUserClient } from "../github.ts";
import { getSessionToken } from "../auth.ts";

export const pullsRouter = new Router();

pullsRouter.post("/api/repo/:owner/:repo/pulls", async (ctx) => {
  const { owner, repo } = ctx.params;
  const token = await getSessionToken(ctx);

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  // Read body
  const body = await ctx.request.body.json();
  const { title, head, base, body: description } = body;

  if (!title || !head || !base) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing required fields" };
    return;
  }

  const client = new GitHubUserClient(token);
  try {
    const pr = await client.createPullRequest(
      owner,
      repo,
      title,
      description || "",
      head,
      base,
    );
    ctx.response.body = pr;
    ctx.response.status = 201;
    // deno-lint-ignore no-explicit-any
  } catch (e: any) {
    console.error("Create PR error:", e);
    ctx.response.status = e.status || 500;
    ctx.response.body = { error: e.message };
  }
});
