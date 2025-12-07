import { RouterContext } from "@oak/oak";
import { createPullRequest } from "@/server/github.ts";

export const createPrHandler = async (ctx: RouterContext<string>) => {
  const { owner, repo } = ctx.params;

  if (!owner || !repo) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Owner and repo are required" };
    return;
  }

  try {
    const body = await ctx.request.body.json();
    const { draft, baseBranch = "main" } = body;

    const result = await createPullRequest(owner, repo, baseBranch, draft);

    ctx.response.status = 201;
    ctx.response.body = result;
  } catch (e) {
    console.error("PR Creation Failed:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
};
