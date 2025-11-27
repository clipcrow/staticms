import {
  Application,
  Context,
  Router,
  send,
  ServerSentEventTarget,
} from "@oak/oak";
import { load } from "@std/dotenv";

await load({ export: true });

export const staticms = new Application();
const router = new Router();
const kv = await Deno.openKv();

export const shutdown = () => {
  kv.close();
};

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")?.trim();
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")?.trim();

console.log("GitHub Auth Config:");
console.log("- Client ID loaded:", GITHUB_CLIENT_ID ? "Yes" : "No");
if (GITHUB_CLIENT_ID) {
  console.log("- Client ID prefix:", GITHUB_CLIENT_ID.substring(0, 5) + "...");
}
console.log("- Client Secret loaded:", GITHUB_CLIENT_SECRET ? "Yes" : "No");

async function githubRequest(
  url: string,
  options: RequestInit = {},
  token: string,
) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/vnd.github.v3+json");
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API Error: ${response.status} ${error}`);
  }
  return response.json();
}

// Session Management
async function createSession(accessToken: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  await kv.set(["sessions", sessionId], accessToken, {
    expireIn: 60 * 60 * 24 * 7, // 1 week
  });
  return sessionId;
}

async function getSessionToken(ctx: Context): Promise<string | null> {
  const sessionId = await ctx.cookies.get("session_id");
  if (!sessionId) return null;
  const session = await kv.get(["sessions", sessionId]);
  return session.value as string | null;
}

async function deleteSession(ctx: Context) {
  const sessionId = await ctx.cookies.get("session_id");
  if (sessionId) {
    await kv.delete(["sessions", sessionId]);
    await ctx.cookies.delete("session_id");
  }
}

// Auth Routes
router.get("/api/auth/login", (ctx) => {
  if (!GITHUB_CLIENT_ID) {
    ctx.throw(500, "GITHUB_CLIENT_ID not configured");
    return;
  }
  const redirectUrl =
    `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user,read:org`;
  ctx.response.redirect(redirectUrl);
});

router.get("/api/auth/callback", async (ctx) => {
  const code = ctx.request.url.searchParams.get("code");
  if (!code) {
    ctx.throw(400, "Missing code");
    return;
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    ctx.throw(500, "GitHub OAuth not configured");
    return;
  }

  try {
    console.log("Exchanging code for token...");
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    console.log("Token response status:", response.status);
    const responseText = await response.text();
    console.log("Token response body:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse token response JSON:", e);
      throw new Error("Invalid response from GitHub");
    }

    if (data.error) {
      console.error("GitHub Auth Error:", data.error, data.error_description);
      throw new Error(data.error_description || data.error);
    }

    console.log("Token received, creating session...");
    const sessionId = await createSession(data.access_token);
    await ctx.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    console.log("Session created, redirecting...");

    ctx.response.redirect("/");
  } catch (e) {
    console.error("Auth error details:", e);
    ctx.throw(500, "Authentication failed");
  }
});

router.get("/api/auth/logout", async (ctx) => {
  await deleteSession(ctx);
  ctx.response.body = { success: true };
});

router.get("/api/user", async (ctx) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const user = await githubRequest("https://api.github.com/user", {}, token);
    ctx.response.body = user;
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

router.get("/api/user/orgs", async (ctx) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const orgs = await githubRequest(
      "https://api.github.com/user/orgs",
      {},
      token,
    );
    ctx.response.body = orgs;
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

const PUBLIC_URL = Deno.env.get("PUBLIC_URL");
const clients = new Set<ServerSentEventTarget>();

async function setupWebhook(owner: string, repo: string, token: string) {
  if (!PUBLIC_URL) {
    console.warn("PUBLIC_URL not set. Skipping WebHook setup.");
    return;
  }
  try {
    const hooks = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {},
      token,
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
        token,
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
          token,
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
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const body = ctx.request.body;
    const value = await body.json();
    await kv.set(["config"], value);

    // Setup webhooks for all configured contents
    if (value.contents && Array.isArray(value.contents)) {
      for (const content of value.contents) {
        if (content.owner && content.repo) {
          await setupWebhook(content.owner, content.repo, token);
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
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

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
          {},
          token,
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
              {},
              token,
            );
            const defaultBranch = repoData.default_branch;
            const refData = await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
              {},
              token,
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
              token,
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
        {},
        token,
      );
      targetBranch = repoData.default_branch;
    }

    const url =
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${targetBranch}`;
    const data = await githubRequest(url, {}, token);

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
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const body = await ctx.request.body.json();
    const { content, sha, description, title, owner, repo, path, branch } =
      body;

    console.log(
      `[POST /api/collection] branch param: "${branch}" (type: ${typeof branch})`,
    );

    if (!owner || !repo || !path) {
      ctx.throw(400, "Missing owner, repo, or path in body");
    }

    // 1. Determine base branch
    let baseBranch = branch;
    if (!baseBranch) {
      const repoData = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`,
        {},
        token,
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
          {},
          token,
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
              {},
              token,
            );
            const defaultBranch = repoData.default_branch;
            const refData = await githubRequest(
              `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
              {},
              token,
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
              token,
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
      {},
      token,
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
      token,
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
      token,
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
      token,
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
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

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
    const data = await githubRequest(apiUrl, {}, token);

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
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

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
    const commits = await githubRequest(url, {}, token);

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
