import { RouterContext } from "@oak/oak";
import { getSessionToken, kv } from "@/server/auth.ts";
import { GitHubAPIError, GitHubUserClient } from "@/server/github.ts";
import { decodeBase64 } from "@std/encoding/base64";

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

  // 1. Check Deno KV first
  const kvResult = await kv.get(["config", owner, repo]);
  if (kvResult.value) {
    ctx.response.body = kvResult.value;
    ctx.response.type = "text/yaml";
    return;
  }

  // 2. Fallback: Try to fetch from GitHub (.github/staticms.yml)
  const client = new GitHubUserClient(token);
  const configPath = ".github/staticms.yml";

  try {
    // deno-lint-ignore no-explicit-any
    const data: any = await client.getContent(owner, repo, configPath);
    if (!Array.isArray(data)) {
      const rawContent = data.content.replace(/\n/g, "");
      const decodedBytes = decodeBase64(rawContent);
      const content = new TextDecoder().decode(decodedBytes);

      ctx.response.body = content;
      ctx.response.type = "text/yaml";
      return;
    }
  } catch (e) {
    // Ignore 404, throw others
    if (!(e instanceof GitHubAPIError && e.status === 404)) {
      console.error(`Failed to fetch config at ${configPath}:`, e);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch config from GitHub" };
      return;
    }
  }

  // 3. Last resort: Return default template
  const defaultConfig = `# Staticms Configuration
# This file was automatically generated/suggested by Staticms.
# Define your content collections here.

collections:
  - name: posts
    label: Posts
    folder: content/posts
    create: true
    fields:
      - label: "Title"
        name: "title"
        widget: "string"
      - label: "Body"
        name: "body"
        widget: "markdown"
`;
  ctx.response.body = defaultConfig;
  ctx.response.type = "text/yaml";
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

    // Save to Deno KV
    await kv.set(["config", owner, repo], bodyText);

    ctx.response.body = {
      message: "Configuration saved successfully (KV)",
    };
  } catch (e) {
    console.error("Failed to save config:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
};
