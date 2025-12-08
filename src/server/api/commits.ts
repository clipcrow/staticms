import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";

interface UpdateItem {
  path: string;
  content: string;
  encoding?: "utf-8" | "base64";
}

interface BatchCommitRequest {
  branch?: string; // Base branch
  message: string;
  updates: UpdateItem[];
  createPr?: boolean;
  newBranchName?: string; // Optional, if not provided, generated
}

export const batchCommitHandler = async (ctx: RouterContext<string>) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { owner, repo } = ctx.params;

  if (!owner || !repo) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing owner or repo" };
    return;
  }

  try {
    const body: BatchCommitRequest = await ctx.request.body.json();
    const { branch = "main", message, updates, createPr, newBranchName } = body;

    if (
      !message || !updates || !Array.isArray(updates) || updates.length === 0
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Invalid payload: message and updates required",
      };
      return;
    }

    const client = new GitHubUserClient(token);

    // 1. Get HEAD SHA of Base Branch
    const branchRef = await client.getBranch(owner, repo, branch);
    const baseCommitSha = branchRef.object.sha;

    let targetBranchName = branch;

    if (createPr) {
      // 1.5. Create New Branch
      targetBranchName = newBranchName ||
        `staticms-draft-${crypto.randomUUID().split("-")[0]}`;
      // Create branch pointing to baseCommitSha
      await client.createBranch(owner, repo, targetBranchName, baseCommitSha);
    }

    // 2. Create Blobs
    const treeItems = [];
    for (const item of updates) {
      const blob = await client.createBlob(
        owner,
        repo,
        item.content,
        item.encoding || "base64",
      );
      treeItems.push({
        path: item.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      });
    }

    // 3. Create Tree (based on baseCommitSha)
    const tree = await client.createTree(
      owner,
      repo,
      treeItems,
      baseCommitSha,
    );

    // 4. Create Commit
    const commit = await client.createCommit(
      owner,
      repo,
      message,
      tree.sha,
      [baseCommitSha], // Parent is the base commit
    );

    // 5. Update Ref (Move branch pointer to new commit)
    await client.updateRef(
      owner,
      repo,
      `heads/${targetBranchName}`,
      commit.sha,
    );

    let pr;
    if (createPr) {
      // 6. Create PR
      const prTitle = message; // Use commit message as title
      const prBody = "Content update via Staticms";
      pr = await client.createPullRequest(
        owner,
        repo,
        prTitle,
        prBody,
        targetBranchName, // head
        branch, // base
      );
    }

    ctx.response.body = {
      success: true,
      commit: commit,
      message: createPr ? "PR Created" : "Batch commit successful",
      pr: pr
        ? {
          number: pr.number,
          html_url: pr.html_url,
          user: pr.user,
          head: pr.head,
        }
        : undefined,
    };
  } catch (e) {
    console.error("Batch commit failed:", e);
    // deno-lint-ignore no-explicit-any
    const status = (e as any).status || 500;
    ctx.response.status = status;
    // deno-lint-ignore no-explicit-any
    ctx.response.body = { error: (e as any).message || "Batch commit failed" };
  }
};
