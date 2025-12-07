import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubAPIError, GitHubUserClient } from "@/server/github.ts";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

// GET /api/repo/:owner/:repo/config
// GET /api/repo/:owner/:repo/config
export const getRepoConfig = async (
  ctx: RouterContext<"/api/repo/:owner/:repo/config">,
) => {
  const { owner, repo } = ctx.params;
  const token = await getSessionToken(ctx);

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }
  const client = new GitHubUserClient(token);

  // Use .github/staticms.yml only
  const configPath = ".github/staticms.yml";

  try {
    // deno-lint-ignore no-explicit-any
    const data: any = await client.getContent(owner, repo, configPath);
    if (!Array.isArray(data)) {
      // GitHub API returns base64 content
      // Use @std/encoding/base64 for robust decoding
      const rawContent = data.content.replace(/\n/g, "");
      const decodedBytes = decodeBase64(rawContent);
      const content = new TextDecoder().decode(decodedBytes);

      ctx.response.body = content;
      ctx.response.type = "text/yaml";
      return;
    }
  } catch (e) {
    if (e instanceof GitHubAPIError && e.status === 404) {
      // Config not found: Return default template
      const defaultConfig = `# Staticms Configuration
# This file was automatically generated/suggested by Staticms.
# Define your content collections here.

collections:
  # Example:
  # - name: posts
  #   label: Posts
  #   folder: content/posts
  #   create: true
  #   fields:
  #     - { label: "Title", name: "title", widget: "string" }
  #     - { label: "Body", name: "body", widget: "markdown" }
`;
      ctx.response.body = defaultConfig;
      ctx.response.type = "text/yaml";
      return;
    }

    console.error(`Failed to fetch config at ${configPath}:`, e);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch config" };
  }
};

// POST /api/repo/:owner/:repo/config
export const saveRepoConfig = async (
  ctx: RouterContext<"/api/repo/:owner/:repo/config">,
) => {
  const { owner, repo } = ctx.params;
  const token = await getSessionToken(ctx);

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  if (!owner || !repo) {
    ctx.response.status = 400;
    return;
  }

  try {
    const bodyText = await ctx.request.body.text();
    if (!bodyText) {
      ctx.throw(400, "Empty config body");
    }

    const client = new GitHubUserClient(token);

    // 1. Path is fixed
    const configPath = ".github/staticms.yml";

    // 2. Identify base branch (assume main for now, or fetch repo details)
    const baseBranch = "main";
    const baseRef = await client.getBranch(owner, repo, baseBranch);
    const baseSha = baseRef.object.sha;

    // 3. Create new branch
    const newBranchName = `staticms-config-${
      crypto.randomUUID().split("-")[0]
    }`;
    await client.createBranch(owner, repo, newBranchName, baseSha);

    // 4. Upload file
    const encodedContent = encodeBase64(new TextEncoder().encode(bodyText));
    await client.uploadFile(
      owner,
      repo,
      configPath,
      encodedContent,
      "Update Configuration via Staticms",
      newBranchName,
    );

    // 5. Create PR
    const pr = await client.createPullRequest(
      owner,
      repo,
      "Update Configuration",
      "Configuration updated via Staticms Config Editor",
      newBranchName,
      baseBranch,
    );

    ctx.response.body = {
      message: "PR created",
      prNumber: pr.number,
      prUrl: pr.html_url,
    };
  } catch (e) {
    console.error("Failed to save config:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
};
