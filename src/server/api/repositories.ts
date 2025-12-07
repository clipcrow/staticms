import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
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

    ctx.response.body = allRepos;
    ctx.response.type = "application/json";
  } catch (e) {
    console.error("Failed to list repositories:", e);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch repositories" };
  }
};
