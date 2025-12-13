import { RouterContext } from "@oak/oak";
import { parse } from "@std/yaml";
import { getSessionToken, kv } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";

export const listRepositories = async (ctx: RouterContext<string>) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const client = new GitHubUserClient(token);

    // 1. Get user's installations
    const installationsData = await client.getInstallations();
    const installations = installationsData.installations || [];

    // 2. Get repositories for each installation
    let allRepos: Record<string, unknown>[] = [];

    // Note: We might want to execute these in parallel, but be mindful of rate limits.
    // Sequential for now to be safe.
    for (const installation of installations) {
      try {
        const reposData = await client.getInstallationRepositories(
          installation.id,
        );
        if (reposData.repositories) {
          allRepos = [...allRepos, ...reposData.repositories];
        }
      } catch (e) {
        console.error(
          `Failed to fetch repos for installation ${installation.id}:`,
          e,
        );
        // Continue to next installation
      }
    }

    // 3. Enrichment: Fetch configured branch from KV
    // Deno KV getMany allows up to 10 keys. We chunk requests.
    const enrichedRepos = [];
    const chunkSize = 10;

    for (let i = 0; i < allRepos.length; i += chunkSize) {
      const chunk = allRepos.slice(i, i + chunkSize);
      // deno-lint-ignore no-explicit-any
      const keys = chunk.map((repo: any) => [
        "config",
        repo.owner.login,
        repo.name,
      ]);
      const results = await kv.getMany(keys);

      for (let j = 0; j < chunk.length; j++) {
        const repo = chunk[j];
        const result = results[j];
        let configuredBranch = undefined;

        if (result.value) {
          try {
            // deno-lint-ignore no-explicit-any
            const parsed = parse(result.value as string) as any;
            if (parsed.branch) {
              configuredBranch = parsed.branch;
            }
          } catch {
            // ignore parse error or invalid format
          }
        }
        enrichedRepos.push({ ...repo, configured_branch: configuredBranch });
      }
    }

    ctx.response.body = enrichedRepos;
    ctx.response.type = "application/json";
  } catch (e) {
    console.error("Failed to list repositories:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch repositories" };
  }
};
// GET /api/repo/:owner/:repo
export const getRepository = async (ctx: RouterContext<string>) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { owner, repo } = ctx.params;
  if (!owner || !repo) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing parameters" };
    return;
  }

  try {
    const client = new GitHubUserClient(token);
    const repoInfo = await client.getRepository(owner, repo);

    // Fetch KV for configured branch
    const kvResult = await kv.get(["config", owner, repo]);
    let configuredBranch = undefined;

    if (kvResult.value) {
      try {
        // deno-lint-ignore no-explicit-any
        const parsed = parse(kvResult.value as string) as any;
        if (parsed.branch) {
          configuredBranch = parsed.branch;
        }
      } catch {
        // ignore
      }
    }

    ctx.response.body = { ...repoInfo, configured_branch: configuredBranch };
    ctx.response.type = "application/json";
  } catch (e) {
    console.error(`Failed to get repository ${owner}/${repo}:`, e);
    // deno-lint-ignore no-explicit-any
    if ((e as any).status === 404) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Repository not found" };
      return;
    }
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch repository" };
  }
};
