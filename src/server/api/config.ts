import { RouterContext } from "@oak/oak";
import { getSessionToken, kv } from "@/server/auth.ts";
import {
  GitHubAPIError,
  GitHubAppClient,
  GitHubUserClient,
} from "@/server/github.ts";

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

  // 3. Failover / Initial: Return empty collections
  const emptyConfig = "collections: []\n";
  ctx.response.body = emptyConfig;
  ctx.response.type = "text/yaml";
};

import { parse } from "@std/yaml";
// ... (existing imports)

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

    // 1. Parse Config to check for branches
    // deno-lint-ignore no-explicit-any
    let config: any;
    try {
      config = parse(bodyText);
    } catch (_e) {
      ctx.throw(400, "Invalid YAML config");
    }

    // 2. Check and Create Branches
    if (config && Array.isArray(config.collections)) {
      const client = new GitHubUserClient(token);
      let repoInfo: { default_branch: string } | null = null;

      for (const collection of config.collections) {
        if (collection.branch) {
          const branchName = collection.branch;
          try {
            // Check if branch exists
            await client.getBranch(owner, repo, branchName);
          } catch (e) {
            if (e instanceof GitHubAPIError && e.status === 404) {
              // Branch does not exist, create it
              console.log(`Branch ${branchName} not found. Creating...`);

              // Get default branch info if not already fetched
              if (!repoInfo) {
                repoInfo = await client.getRepository(owner, repo);
              }
              const defaultBranch = repoInfo!.default_branch;

              // Get SHA of default branch head
              const defaultBranchRef = await client.getBranch(
                owner,
                repo,
                defaultBranch,
              );
              // deno-lint-ignore no-explicit-any
              const sha = (defaultBranchRef as any).object.sha;

              await client.createBranch(owner, repo, branchName, sha);
              console.log(`Created branch ${branchName} from ${defaultBranch}`);
            } else {
              throw e; // Rethrow other errors
            }
          }
        }
      }
    }

    // Save to Deno KV
    await kv.set(["config", owner, repo], bodyText);

    // Setup Webhook automatically (Fire and Forget)
    const webhookUrlRoot = Deno.env.get("STATICMS_PUBLIC_URL");
    if (webhookUrlRoot) {
      try {
        const appClient = new GitHubAppClient();
        const webhookUrl = `${webhookUrlRoot}/api/webhook`;
        // Don't await strictly to keep UI response fast?
        // Or await to ensure it works?
        // v1 used await inside setupWebhook, but here we are inside a request handler.
        // Let's await it to be sure, or log error if it fails.
        await appClient.ensureWebhook(owner, repo, webhookUrl);
      } catch (e) {
        console.error("Webhook setup warning:", e);
        // Do not fail the request just because webhook setup failed
      }
    } else {
      console.warn("STATICMS_PUBLIC_URL not set. Skipping WebHook setup.");
    }

    ctx.response.body = {
      message: "Configuration saved successfully (KV)",
    };
  } catch (e) {
    console.error("Failed to save config:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
};
