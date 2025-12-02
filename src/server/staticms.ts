import {
  Application,
  Context,
  Router,
  send,
  ServerSentEventTarget,
} from "@oak/oak";
import { load } from "@std/dotenv";
import { create, getNumericDate } from "djwt";
import { createPrivateKey } from "node:crypto";
import { normalize } from "@std/path/posix";

await load({ export: true });

export const staticms = new Application();
const router = new Router();
const kv = await Deno.openKv();

export const shutdown = () => {
  kv.close();
};

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")?.trim();
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")?.trim();
const GITHUB_APP_ID = Deno.env.get("GITHUB_APP_ID")?.trim();
const GITHUB_APP_PRIVATE_KEY = Deno.env.get("GITHUB_APP_PRIVATE_KEY")?.trim();

console.log("GitHub Auth Config:");
console.log("- Client ID loaded:", GITHUB_CLIENT_ID ? "Yes" : "No");
if (GITHUB_CLIENT_ID) {
  console.log("- Client ID prefix:", GITHUB_CLIENT_ID.substring(0, 5) + "...");
}
console.log("- Client Secret loaded:", GITHUB_CLIENT_SECRET ? "Yes" : "No");
console.log("- App ID loaded:", GITHUB_APP_ID ? "Yes" : "No");
console.log("- App Private Key loaded:", GITHUB_APP_PRIVATE_KEY ? "Yes" : "No");

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

// GitHub App Authentication Helpers
async function importPrivateKey(pem: string) {
  let key = pem.trim();

  // Remove surrounding quotes
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Unescape newlines (handle \n literal)
  key = key.replace(/\\n/g, "\n");

  // Identify header and footer
  const rsaHeader = "-----BEGIN RSA PRIVATE KEY-----";
  const rsaFooter = "-----END RSA PRIVATE KEY-----";
  const pkcs8Header = "-----BEGIN PRIVATE KEY-----";
  const pkcs8Footer = "-----END PRIVATE KEY-----";

  let header = "";
  let footer = "";

  if (key.includes(rsaHeader) && key.includes(rsaFooter)) {
    header = rsaHeader;
    footer = rsaFooter;
  } else if (key.includes(pkcs8Header) && key.includes(pkcs8Footer)) {
    header = pkcs8Header;
    footer = pkcs8Footer;
  }

  if (header && footer) {
    // Extract body, remove all whitespace, and re-chunk
    const headerIdx = key.indexOf(header);
    const footerIdx = key.indexOf(footer);
    let body = key.substring(headerIdx + header.length, footerIdx).trim();
    // Remove all whitespace (spaces, newlines, tabs)
    body = body.replace(/\s/g, "");
    // Chunk body into 64 chars
    const chunkedBody = body.match(/.{1,64}/g)?.join("\n");
    key = `${header}\n${chunkedBody}\n${footer}`;
  } else {
    console.warn(
      "Warning: Could not find valid PEM header/footer in private key.",
    );
    // Try to use as is, or maybe it's just the body?
    // If it's just the body, we might assume PKCS#8, but let's leave it for createPrivateKey to fail if invalid.
  }

  try {
    const keyObject = createPrivateKey(key);
    const pkcs8Der = keyObject.export({
      type: "pkcs8",
      format: "der",
    });

    return await crypto.subtle.importKey(
      "pkcs8",
      // deno-lint-ignore no-explicit-any
      pkcs8Der as any,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["sign"],
    );
  } catch (e) {
    console.error("Failed to import private key:", e);
    console.error(
      "Key start:",
      key.substring(0, 50).replace(/\n/g, "\\n"),
      "...",
    );
    throw e;
  }
}

async function generateAppJwt() {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App not configured");
  }

  const key = await importPrivateKey(GITHUB_APP_PRIVATE_KEY);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iat: getNumericDate(-60), // 60 seconds in the past to allow for clock skew
      exp: getNumericDate(60 * 9), // 9 minutes to avoid clock skew
      iss: GITHUB_APP_ID,
    },
    key,
  );
  return jwt;
}

async function getInstallationToken(owner: string, repo: string) {
  const jwt = await generateAppJwt();

  // 1. Get installation ID for the repo
  const installationRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Accept": "application/vnd.github.v3+json",
      },
    },
  );

  if (!installationRes.ok) {
    throw new Error(
      `Failed to get installation: ${installationRes.statusText}`,
    );
  }

  const installation = await installationRes.json();

  // 2. Get access token for the installation
  const tokenRes = await fetch(
    `https://api.github.com/app/installations/${installation.id}/access_tokens`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Accept": "application/vnd.github.v3+json",
      },
    },
  );

  if (!tokenRes.ok) {
    throw new Error(`Failed to get installation token: ${tokenRes.statusText}`);
  }

  const data = await tokenRes.json();
  return data.token;
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
router.get("/api/auth/login", async (ctx) => {
  if (!GITHUB_CLIENT_ID) {
    ctx.throw(500, "GITHUB_CLIENT_ID not configured");
    return;
  }

  const returnTo = ctx.request.url.searchParams.get("returnTo");
  if (returnTo) {
    await ctx.cookies.set("auth_return_to", returnTo, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: "lax",
      maxAge: 300, // 5 minutes
    });
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

    const returnTo = await ctx.cookies.get("auth_return_to");
    if (returnTo) {
      await ctx.cookies.delete("auth_return_to");
    }

    ctx.response.redirect(returnTo || "/");
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

router.get("/api/user/repos", async (ctx) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    // 1. Get user's installations
    const installationsData = await githubRequest(
      "https://api.github.com/user/installations",
      {},
      token,
    );

    const installations = installationsData.installations || [];
    // deno-lint-ignore no-explicit-any
    let allRepos: any[] = [];

    // 2. Get repositories for each installation
    for (const installation of installations) {
      const reposData = await githubRequest(
        `https://api.github.com/user/installations/${installation.id}/repositories`,
        {},
        token,
      );
      if (reposData.repositories) {
        allRepos = [...allRepos, ...reposData.repositories];
      }
    }

    ctx.response.body = allRepos;
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { error: (e as Error).message };
  }
});

const PUBLIC_URL = Deno.env.get("PUBLIC_URL");
const clients = new Set<ServerSentEventTarget>();

async function setupWebhook(owner: string, repo: string, _userToken?: string) {
  if (!PUBLIC_URL) {
    console.warn("PUBLIC_URL not set. Skipping WebHook setup.");
    return;
  }

  try {
    // Use Installation Token for Webhook operations
    const token = await getInstallationToken(owner, repo);

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

router.get("/api/content", async (ctx) => {
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

    // Check if data is an array (directory) or object (file)
    if (Array.isArray(data)) {
      ctx.response.body = {
        type: "dir",
        branch: targetBranch,
        files: data.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          sha: item.sha,
        })),
      };
    } else {
      // Content is base64 encoded
      const rawContent = atob(data.content.replace(/\n/g, ""));
      const content = new TextDecoder().decode(
        Uint8Array.from(rawContent, (c) => c.charCodeAt(0)),
      );
      ctx.response.body = {
        type: "file",
        content,
        sha: data.sha,
        branch: targetBranch,
      };
    }
  } catch (e) {
    const errorMessage = (e as Error).message;
    if (errorMessage.includes("404")) {
      ctx.response.status = 404;
      // Only log 404 if not in validation mode or allowMissing is true
      const validate = ctx.request.url.searchParams.get("validate") === "true";
      const allowMissing =
        ctx.request.url.searchParams.get("allowMissing") === "true";
      if (!validate && !allowMissing) {
        console.error(e);
      }
    } else {
      console.error(e);
      ctx.response.status = 500;
    }
    ctx.response.body = { error: errorMessage };
  }
});

router.post("/api/content", async (ctx) => {
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

    console.log(`[POST /api/content] Received path: "${path}"`);

    if (!owner || !repo || !path) {
      ctx.throw(400, "Missing owner, repo, or path in body");
    }

    // Normalize path: remove leading slashes, remove duplicate slashes
    const normalized = normalize(path);
    const normalizedPath = normalized.startsWith("/")
      ? normalized.substring(1)
      : normalized;
    console.log(`[POST /api/content] Normalized path: "${normalizedPath}"`);

    // Encode path for URL (preserve slashes)
    const encodedPath = normalizedPath.split("/").map(encodeURIComponent).join(
      "/",
    );

    // 1. Determine base branch
    let baseBranch = branch;
    if (!baseBranch) {
      const repoData = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`,
        {},
        token,
      );
      baseBranch = repoData.default_branch;
      console.log(`[POST /api/content] Using default branch: ${baseBranch}`);
    } else {
      console.log(
        `[POST /api/content] Using specified branch: ${baseBranch}`,
      );
      // Check if baseBranch exists, if not create it from default branch
      try {
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
          {},
          token,
        );
        console.log(`[POST /api/content] Branch ${baseBranch} exists.`);
      } catch (e) {
        const errorMessage = (e as Error).message;
        console.log(
          `[POST /api/content] Branch check error: ${errorMessage}`,
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
    const fileUpdateBody: Record<string, string> = {
      message: description || `Update ${normalizedPath} via Staticms`,
      content: btoa(unescape(encodeURIComponent(content))), // Handle UTF-8
      branch: newBranchName,
    };
    if (sha) {
      fileUpdateBody.sha = sha;
    }

    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`,
      {
        method: "PUT",
        body: JSON.stringify(fileUpdateBody),
      },
      token,
    );

    // 5. Create Pull Request
    const prData = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title: title || `Update ${normalizedPath}`,
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

router.post("/api/create-file", async (ctx) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const body = await ctx.request.body.json();
    const { content = "", message, owner, repo, path, branch } = body;

    if (!owner || !repo || !path) {
      ctx.throw(400, "Missing owner, repo, or path in body");
    }

    // Normalize path to remove leading slash
    const normalized = normalize(path);
    const normalizedPath = normalized.startsWith("/")
      ? normalized.substring(1)
      : normalized;

    // Encode path for URL (preserve slashes)
    const encodedPath = normalizedPath.split("/").map(encodeURIComponent).join(
      "/",
    );

    // Determine branch
    let targetBranch = branch;
    if (!targetBranch) {
      const repoData = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`,
        {},
        token,
      );
      targetBranch = repoData.default_branch;
    }

    // Create file directly on the branch
    const res = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: message || `Create ${normalizedPath} via Staticms`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: targetBranch,
        }),
      },
      token,
    );

    ctx.response.body = { success: true, content: res.content };
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
      number: data.number,
      title: data.title,
      body: data.body,
      user: {
        login: data.user.login,
        avatar_url: data.user.avatar_url,
      },
      created_at: data.created_at,
      html_url: data.html_url,
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
  // Disable caching for static files during development
  ctx.response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  ctx.response.headers.set("Pragma", "no-cache");
  ctx.response.headers.set("Expires", "0");

  if (ctx.request.url.pathname.startsWith("/api/")) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Not Found" };
    return;
  }

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
