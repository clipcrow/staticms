import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";

export const getBranch = async (ctx: RouterContext<string>) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { owner, repo, branch } = ctx.params;
  if (!owner || !repo || !branch) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing parameters" };
    return;
  }

  try {
    const client = new GitHubUserClient(token);
    const branchInfo = await client.getBranch(owner, repo, branch);
    ctx.response.body = branchInfo;
  } catch (e) {
    // 404 from GitHub means branch not found
    // deno-lint-ignore no-explicit-any
    if ((e as any).status === 404) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Branch not found" };
      return;
    }
    console.error("Failed to get branch:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to get branch" };
  }
};

export const createBranch = async (ctx: RouterContext<string>) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { owner, repo } = ctx.params;

  let body;
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid JSON body" };
    return;
  }

  const { branchName, baseBranch = "main" } = body;

  if (!owner || !repo || !branchName) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing parameters" };
    return;
  }

  try {
    const client = new GitHubUserClient(token);

    // 1. Get SHA of base branch
    let baseSha: string;
    try {
      const baseRef = await client.getBranch(owner, repo, baseBranch);
      baseSha = baseRef.object.sha;
    } catch {
      ctx.response.status = 400;
      ctx.response.body = { error: `Base branch '${baseBranch}' not found` };
      return;
    }

    // 2. Create new branch
    const newRef = await client.createBranch(owner, repo, branchName, baseSha);

    ctx.response.status = 201;
    ctx.response.body = newRef;
  } catch (e) {
    // deno-lint-ignore no-explicit-any
    const status = (e as any).status || 500;
    const message = e instanceof Error ? e.message : "Failed to create branch";
    ctx.response.status = status;
    ctx.response.body = { error: message };
  }
};
