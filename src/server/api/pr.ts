import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";
import { broadcastMessage } from "@/server/sse.ts";

// createPrHandler is deprecated in favor of batchCommitHandler (POST /api/repo/:owner/:repo/batch-commit)
// If separate PR creation endpoint is needed in future, reimplement here.

export const getPrStatusHandler = async (ctx: RouterContext<string>) => {
  const { owner, repo } = ctx.params;
  const prNumber = Number(ctx.params.number);
  const token = await getSessionToken(ctx);

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  if (isNaN(prNumber) || !owner || !repo) {
    ctx.response.status = 400;
    return;
  }

  try {
    const client = new GitHubUserClient(token);
    const pr = await client.getPullRequest(owner, repo, prNumber);

    const status = pr.merged ? "merged" : pr.state;
    ctx.response.body = { status };
  } catch (e) {
    console.error("Failed to get PR status:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to get PR status" };
  }
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

  // NOTE: This endpoint is strictly for debugging/testing to simulate Webhook events.
  // We do NOT update GitHub state here, we just tell connected clients "Hey, this happened".
  console.log(`[Debug] Broadcasting PR update: #${prNumber} -> ${status}`);

  broadcastMessage({
    type: "pr_update",
    prNumber,
    status,
  });

  ctx.response.body = { status: "broadcasted", prNumber, newStatus: status };
};
