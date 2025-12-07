import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubAPIError, GitHubUserClient } from "@/server/github.ts";

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

  // Try staticms.config.yml then .github/staticms.yml
  const paths = ["staticms.config.yml", ".github/staticms.yml"];

  for (const path of paths) {
    try {
      // deno-lint-ignore no-explicit-any
      const data: any = await client.getContent(owner, repo, path);
      if (Array.isArray(data)) continue; // Should be a file

      // GitHub API returns base64 content
      const content = atob(data.content.replace(/\n/g, ""));
      ctx.response.body = content;
      ctx.response.type = "text/yaml";
      return;
    } catch (e) {
      if (e instanceof GitHubAPIError && e.status === 404) {
        continue;
      }
      console.error(`Failed to fetch config at ${path}:`, e);
      // If critical error, throw or break
    }
  }

  // If we get here, no config found
  ctx.response.status = 404;
  ctx.response.body = { error: "Config not found" };
};

// POST /api/repo/:owner/:repo/config
export const saveRepoConfig = (
  ctx: RouterContext<"/api/repo/:owner/:repo/config">,
) => {
  // TODO: Implement config saving via Pull Request or direct commit
  // For now, return 501 Not Implemented
  ctx.response.status = 501;
  ctx.response.body = { error: "Saving config not yet implemented in v2" };
};
