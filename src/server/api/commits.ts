import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";

interface UpdateItem {
  path: string;
  content: string;
  encoding?: "utf-8" | "base64";
}

interface BatchCommitRequest {
  branch?: string;
  message: string;
  updates: UpdateItem[];
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
    const { branch = "main", message, updates } = body;

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

    // 1. Get HEAD SHA
    // Note: getBranch returns the ref object which contains object.sha
    const branchRef = await client.getBranch(owner, repo, branch);
    const latestCommitSha = branchRef.object.sha;

    // 2. Create Blobs
    const treeItems = [];
    for (const item of updates) {
      // Create blob for each file
      // If content is empty check?
      const blob = await client.createBlob(
        owner,
        repo,
        item.content,
        item.encoding || "base64",
      );
      treeItems.push({
        path: item.path,
        mode: "100644" as const, // Standard file mode
        type: "blob" as const,
        sha: blob.sha,
      });
    }

    // 3. Create Tree
    const tree = await client.createTree(
      owner,
      repo,
      treeItems,
      latestCommitSha,
    );

    // 4. Create Commit
    const commit = await client.createCommit(
      owner,
      repo,
      message,
      tree.sha,
      [latestCommitSha],
    );

    // 5. Update Ref
    await client.updateRef(owner, repo, `heads/${branch}`, commit.sha);

    ctx.response.body = {
      success: true,
      commit: commit,
      message: "Batch commit successful",
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
