import { Application, Router, send, ServerSentEventTarget } from "@oak/oak";
import { load } from "@std/dotenv";

await load({ export: true });

export const staticms = new Application();
const router = new Router();
const kv = await Deno.openKv();

export const shutdown = () => {
  kv.close();
};

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

const PUBLIC_URL = Deno.env.get("PUBLIC_URL");
const clients = new Set<ServerSentEventTarget>();

async function setupWebhook(owner: string, repo: string) {
  if (!PUBLIC_URL) {
    console.warn("PUBLIC_URL not set. Skipping WebHook setup.");
    return;
  }
  try {
    const hooks = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
    );
    const hookUrl = `${PUBLIC_URL}/api/webhook`;
    // deno-lint-ignore no-explicit-any
    const exists = hooks.find((h: Record<string, any>) =>
      h.config.url === hookUrl
    );

    if (!exists) {
      await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/hooks`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "web",
            active: true,
            events: ["push", "pull_request"],
            config: {
              url: hookUrl,
              content_type: "json",
            },
          }),
        },
      );
      console.log(`Webhook created for ${owner}/${repo}`);
    } else {
      // Check if events need update
      const currentEvents = exists.events || [];
      if (
        !currentEvents.includes("push") ||
        !currentEvents.includes("pull_request")
      ) {
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/hooks/${exists.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              events: ["push", "pull_request"],
            }),
          },
        );
        console.log(`Webhook updated for ${owner}/${repo}`);
      }
    }
  } catch (e) {
    console.error(`Failed to setup webhook for ${owner}/${repo}:`, e);
  }
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

    // Setup webhooks for all configured contents
    if (value.contents && Array.isArray(value.contents)) {
      for (const content of value.contents) {
        if (content.owner && content.repo) {
          await setupWebhook(content.owner, content.repo);
        }
      }
    }

    ctx.response.body = { success: true };
  } catch (e) {
    console.error(e);
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid request body" };
  }
});

router.post("/api/webhook", async (ctx) => {
  try {
    const event = ctx.request.headers.get("x-github-event");
    if (event === "push") {
      const payload = await ctx.request.body.json();
      const ref = payload.ref;
      const branch = ref.replace("refs/heads/", "");
      const message = JSON.stringify({
        type: "push",
        repo: payload.repository.full_name,
        branch,
        commits: payload.commits,
      });
      for (const client of clients) {
        client.dispatchMessage(message);
      }
    } else if (event === "pull_request") {
      const payload = await ctx.request.body.json();
      const message = JSON.stringify({
        type: "pull_request",
        action: payload.action,
        repo: payload.repository.full_name,
        prUrl: payload.pull_request.html_url,
      });
      for (const client of clients) {
        client.dispatchMessage(message);
      }
    }
    ctx.response.status = 200;
  } catch (e) {
    console.error("Webhook error:", e);
    ctx.response.status = 500;
  }
});

router.get("/api/events", async (ctx) => {
  const target = await ctx.sendEvents();
  clients.add(target);
  target.addEventListener("close", () => {
    clients.delete(target);
  });
});

router.get("/api/collection", async (ctx) => {
  try {
    const owner = ctx.request.url.searchParams.get("owner");
    const repo = ctx.request.url.searchParams.get("repo");
    const filePath = ctx.request.url.searchParams.get("filePath");
    const branch = ctx.request.url.searchParams.get("branch");

    if (!owner || !repo || !filePath) {
      ctx.throw(400, "Missing owner, repo, or filePath query parameters");
    }

    let targetBranch = branch;
    if (targetBranch) {
      try {
        // Check if branch exists
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
        );
      } catch (e) {
        // If branch does not exist (404), create it
        const errorMessage = (e as Error).message;
        if (
          errorMessage.includes("404") || errorMessage.includes("Not Found")
        ) {
          console.log(`Branch ${targetBranch} not found. Creating...`);
          try {
            const repoData = await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}`,
            );
            const defaultBranch = repoData.default_branch;
            const refData = await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
            );
            const baseSha = refData.object.sha;

            await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}/git/refs`,
              {
                method: "POST",
                body: JSON.stringify({
                  ref: `refs/heads/${targetBranch}`,
                  sha: baseSha,
                }),
              },
            );
            console.log(`Branch ${targetBranch} created.`);
          } catch (createError) {
            console.error(
              `Failed to create branch ${targetBranch}:`,
              createError,
            );
            throw createError;
          }
        } else {
          throw e;
        }
      }
    } else {
      const repoData = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`,
      );
      targetBranch = repoData.default_branch;
    }

    const url =
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${targetBranch}`;
    const data = await githubRequest(url);

    // Content is base64 encoded
    const rawContent = atob(data.content.replace(/\n/g, ""));
    const collection = new TextDecoder().decode(
      Uint8Array.from(rawContent, (c) => c.charCodeAt(0)),
    );
    ctx.response.body = { collection, sha: data.sha, branch: targetBranch };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
});

router.post("/api/collection", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { content, sha, description, title, owner, repo, path, branch } =
      body;

    console.log(`[POST /api/collection] branch param: "${branch}"`);

    if (!owner || !repo || !path) {
      ctx.throw(400, "Missing owner, repo, or path in body");
    }

    // 1. Determine base branch
    let baseBranch = branch;
    if (!baseBranch) {
      const repoData = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`,
      );
      baseBranch = repoData.default_branch;
      console.log(`[POST /api/collection] Using default branch: ${baseBranch}`);
    } else {
      console.log(
        `[POST /api/collection] Using specified branch: ${baseBranch}`,
      );
      // Check if baseBranch exists, if not create it from default branch
      try {
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
        );
        console.log(`[POST /api/collection] Branch ${baseBranch} exists.`);
      } catch (e) {
        const errorMessage = (e as Error).message;
        console.log(
          `[POST /api/collection] Branch check error: ${errorMessage}`,
        );
        if (
          errorMessage.includes("404") || errorMessage.includes("Not Found")
        ) {
          console.log(`Base branch ${baseBranch} not found. Creating...`);
          try {
            const repoData = await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}`,
            );
            const defaultBranch = repoData.default_branch;
            const refData = await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
            );
            const baseSha = refData.object.sha;

            await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}/git/refs`,
              {
                method: "POST",
                body: JSON.stringify({
                  ref: `refs/heads/${baseBranch}`,
                  sha: baseSha,
                }),
              },
            );
            console.log(`Base branch ${baseBranch} created.`);
          } catch (createError) {
            console.error(
              `Failed to create base branch ${baseBranch}:`,
              createError,
            );
            throw createError;
          }
        } else {
          throw e;
        }
      }
    }

    // 2. Get ref of base branch
    const refData = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    );
    const baseSha = refData.object.sha;

    // 3. Create new branch
    const newBranchName = `staticms-update-${Date.now()}`;
    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${newBranchName}`,
          sha: baseSha,
        }),
      },
    );

    // 4. Update file in new branch
    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: description || `Update ${path} via Staticms`,
          content: btoa(unescape(encodeURIComponent(content))), // Handle UTF-8
          branch: newBranchName,
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
          title: title || `Update ${path}`,
          body: description || "Update content via Staticms",
          head: newBranchName,
          base: baseBranch,
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

interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

router.get("/api/pr-status", async (ctx) => {
  try {
    const prUrl = ctx.request.url.searchParams.get("prUrl");
    if (!prUrl) {
      ctx.throw(400, "Missing prUrl query parameter");
      return;
    }

    // Extract owner, repo, number from prUrl
    // Format: https://github.com/owner/repo/pull/number
    const regex = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
    const match = prUrl.match(regex);

    if (!match) {
      ctx.throw(400, "Invalid PR URL format");
      return;
    }

    const [_, owner, repo, number] = match;
    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
    const data = await githubRequest(apiUrl);

    ctx.response.body = {
      state: data.state, // "open" or "closed"
      merged: data.merged, // boolean
    };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
});

router.get("/api/commits", async (ctx) => {
  try {
    const owner = ctx.request.url.searchParams.get("owner");
    const repo = ctx.request.url.searchParams.get("repo");
    const filePath = ctx.request.url.searchParams.get("filePath");
    const branch = ctx.request.url.searchParams.get("branch");

    if (!owner || !repo || !filePath) {
      ctx.throw(400, "Missing owner, repo, or filePath query parameters");
    }

    let url =
      `https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath}`;
    if (branch) {
      url += `&sha=${branch}`;
    }
    const commits = await githubRequest(url);

    ctx.response.body = {
      commits: commits.map((c: GitHubCommit) => ({
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        sha: c.sha,
        html_url: c.html_url,
      })),
    };
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
