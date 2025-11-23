import { Application, Router, send } from "@oak/oak";
import { load } from "@std/dotenv";

await load({ export: true });

export const staticms = new Application();
const router = new Router();
const kv = await Deno.openKv();

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

async function githubRequest(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${GITHUB_TOKEN}`);
  headers.set("Accept", "application/vnd.github.v3+json");
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API Error: ${response.status} ${error}`);
  }
  return response.json();
}

router.get("/api/config", async (ctx) => {
  const result = await kv.get(["config"]);
  ctx.response.body = result.value || { contents: [] };
});

router.post("/api/config", async (ctx) => {
  try {
    const body = ctx.request.body;
    const value = await body.json();
    await kv.set(["config"], value);
    ctx.response.body = { success: true };
  } catch (e) {
    console.error(e);
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request body" };
  }
});

router.get("/api/collection", async (ctx) => {
  try {
    const owner = ctx.request.url.searchParams.get("owner");
    const repo = ctx.request.url.searchParams.get("repo");
    const filePath = ctx.request.url.searchParams.get("filePath");

    if (!owner || !repo || !filePath) {
      ctx.throw(400, "Missing owner, repo, or filePath query parameters");
    }

    const url =
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const data = await githubRequest(url);

    // Content is base64 encoded
    const rawContent = atob(data.content.replace(/\n/g, ""));
    const collection = new TextDecoder().decode(
      Uint8Array.from(rawContent, (c) => c.charCodeAt(0)),
    );
    ctx.response.body = { collection, sha: data.sha };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
});

router.post("/api/collection", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { collection, sha, description, title, owner, repo, filePath } = body;

    if (!owner || !repo || !filePath) {
      ctx.throw(400, "Missing owner, repo, or filePath in body");
    }

    // 1. Get default branch
    const repoData = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}`,
    );
    const defaultBranch = repoData.default_branch;

    // 2. Get ref of default branch
    const refData = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    );
    const baseSha = refData.object.sha;

    // 3. Create new branch
    const branchName = `staticms-update-${Date.now()}`;
    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      },
    );

    // 4. Update file in new branch
    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `Update ${filePath} via Staticms`,
          content: btoa(unescape(encodeURIComponent(collection))), // Handle UTF-8
          branch: branchName,
          sha: sha, // Original file SHA
        }),
      },
    );

    // 5. Create Pull Request
    const prData = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title: title || `Update ${filePath}`,
          body: description || "This PR was created automatically by Staticms.",
          head: branchName,
          base: defaultBranch,
        }),
      },
    );

    ctx.response.body = { success: true, prUrl: prData.html_url };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
});

staticms.use(router.routes());
staticms.use(router.allowedMethods());

staticms.use(async (ctx) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: "./public",
      index: "index.html",
    });
  } catch {
    try {
      await send(ctx, "index.html", { root: "./public" });
    } catch {
      ctx.response.status = 404;
    }
  }
});
