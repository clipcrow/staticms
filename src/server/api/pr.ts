import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";
import { broadcastMessage } from "@/server/sse.ts";
import { dump as yamlDump } from "js-yaml";
import { encodeBase64 } from "@std/encoding/base64";

interface FileItem {
  name: string;
  type: "file" | "dir";
  content?: string; // Base64 data URL
  path?: string;
}

interface Draft {
  frontMatter: Record<string, unknown>;
  body: string;
  pendingImages?: FileItem[];
  path?: string; // We need to know where to save!
  // The frontend should send `path` in the body or we derive it?
  // In the previous mock `content.ts` (Step 80), `createPr` handler received `draft` but didn't use it much.
  // The previous `createPullRequest` mock didn't take content.

  // We need 'filePath' for the article.
  // Let's assume the request body includes `filePath`.
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1];
}

export const createPrHandler = async (ctx: RouterContext<string>) => {
  const { owner, repo } = ctx.params;
  const token = await getSessionToken(ctx);

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  if (!owner || !repo) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Owner and repo are required" };
    return;
  }

  try {
    const body = await ctx.request.body.json();
    const { draft, baseBranch = "main", filePath } = body;
    // Note: 'filePath' is essential. I'll need to ensure frontend sends it or we extract from draft if stored there.
    // Given the previous code, it wasn't clear. Let's assume it's passed in body.

    if (!draft || !filePath) {
      ctx.throw(400, "Missing draft or filePath");
    }

    const client = new GitHubUserClient(token);

    // 1. Get Base Branch SHA
    const baseRef = await client.getBranch(owner, repo, baseBranch);
    const baseSha = baseRef.object.sha;

    // 2. Create Branch
    const newBranchName = `staticms-draft-${crypto.randomUUID().split("-")[0]}`;
    await client.createBranch(owner, repo, newBranchName, baseSha);

    // 3. Prepare Content
    const frontMatterString = Object.keys(draft.frontMatter || {}).length > 0
      ? `---\n${yamlDump(draft.frontMatter)}---\n`
      : "";
    const fileContent = frontMatterString + (draft.body || "");
    const encodedContent = encodeBase64(new TextEncoder().encode(fileContent));

    // 4. Upload Content File
    await client.uploadFile(
      owner,
      repo,
      filePath,
      encodedContent,
      `Update ${filePath}`,
      newBranchName,
    );

    // 5. Upload Pending Images
    if (draft.pendingImages && Array.isArray(draft.pendingImages)) {
      for (const img of draft.pendingImages) {
        if (img.content && img.path) {
          // img.content is DataURL
          const base64Data = dataUrlToBase64(img.content);
          await client.uploadFile(
            owner,
            repo,
            img.path,
            base64Data,
            `Upload ${img.name}`,
            newBranchName,
          );
        }
      }
    }

    // 6. Create PR
    const prTitle = draft.frontMatter?.title
      ? `Update ${draft.frontMatter.title}`
      : `Update ${filePath}`;
    const prBody = "Content update via Staticms";
    const pr = await client.createPullRequest(
      owner,
      repo,
      prTitle,
      prBody,
      newBranchName,
      baseBranch,
    );

    ctx.response.status = 201;
    ctx.response.body = {
      prNumber: pr.number,
      html_url: pr.html_url,
    };
  } catch (e) {
    console.error("PR Creation Failed:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
};

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
