import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubUserClient } from "@/server/github.ts";

export const batchCommitDateHandler = async (ctx: RouterContext<string>) => {
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
    const body = await ctx.request.body.json();
    const { paths, branch = "main" } = body;

    if (!paths || !Array.isArray(paths)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid paths array" };
      return;
    }

    const client = new GitHubUserClient(token);

    // Limit concurrency if needed, but for now purely parallel
    // We fetch just 1 commit per path to get the latest date

    const results = await Promise.all(paths.map(async (path: string) => {
      try {
        // deno-lint-ignore no-explicit-any
        const commits: any[] = await client.getCommits(
          owner,
          repo,
          path,
          branch,
          1,
        );
        if (commits && commits.length > 0) {
          const c = commits[0];
          return {
            path,
            // GitHub API returns commit.author.date in ISO8601
            date: c.commit.author.date,
            author: c.commit.author.name,
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch commit for ${path}:`, e);
      }
      return { path, date: null };
    }));

    // Convert to map for easy frontend lookup
    const dateMap: Record<string, { date: string; author: string } | null> = {};
    for (const res of results) {
      if (res.date) {
        dateMap[res.path] = { date: res.date, author: res.author };
      } else {
        dateMap[res.path] = null;
      }
    }

    ctx.response.body = dateMap;
  } catch (e) {
    console.error("Batch commit date fetch failed:", e);
    // deno-lint-ignore no-explicit-any
    const status = (e as any).status || 500;
    ctx.response.status = status;
    // deno-lint-ignore no-explicit-any
    ctx.response.body = { error: (e as any).message || "Fetch failed" };
  }
};
