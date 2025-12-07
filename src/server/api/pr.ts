import { RouterContext } from "@oak/oak";
import {
  createPullRequest,
  getPRStatus,
  updatePRStatus,
} from "@/server/github.ts";
import { broadcastMessage } from "@/server/sse.ts";

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

export const getPrStatusHandler = (ctx: RouterContext<string>) => {
  const prNumber = Number(ctx.params.number);
  if (isNaN(prNumber)) {
    ctx.response.status = 400;
    return;
  }
  const status = getPRStatus(prNumber);
  ctx.response.body = { status };
};

export const debugUpdatePrStatusHandler = async (
  ctx: RouterContext<string>,
) => {
  const prNumber = Number(ctx.params.number);
  const body = await ctx.request.body.json();
  const { status } = body;

  if (isNaN(prNumber)) {
    ctx.response.status = 400;
    return;
  }

  updatePRStatus(prNumber, status);

  broadcastMessage({
    type: "pr_update",
    prNumber,
    status,
  });

  ctx.response.body = { status: "updated", prNumber, newStatus: status };
};
