export class GitHubAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  accept?: string;
}

async function githubRequest(url: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  headers.set(
    "Accept",
    options.accept || "application/vnd.github.v3+json",
  );
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage =
      `GitHub API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch {
      // ignore json parse error
    }
    throw new GitHubAPIError(response.status, errorMessage);
  }

  // Handle empty responses (e.g. 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export class GitHubUserClient {
  constructor(private token: string) {}

  async getUser() {
    return await githubRequest("https://api.github.com/user", {
      token: this.token,
    });
  }

  async getInstallations() {
    return await githubRequest("https://api.github.com/user/installations", {
      token: this.token,
    });
  }

  async getInstallationRepositories(installationId: number) {
    return await githubRequest(
      `https://api.github.com/user/installations/${installationId}/repositories`,
      { token: this.token },
    );
  }

  async getRepository(owner: string, repo: string) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}`,
      { token: this.token },
    );
  }

  async getBranch(owner: string, repo: string, branch: string) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { token: this.token },
    );
  }

  async createBranch(
    owner: string,
    repo: string,
    newBranch: string,
    baseSha: string,
  ) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${newBranch}`,
          sha: baseSha,
        }),
        token: this.token,
      },
    );
  }

  // Added based on v1 logic for fetching content
  async getContent(owner: string, repo: string, path: string, ref?: string) {
    let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      url += `?ref=${ref}`;
    }
    return await githubRequest(url, { token: this.token });
  }

  // Implementation for future file upload (simulated)
  async uploadFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string,
  ) {
    // Basic PUT implementation
    const body: Record<string, unknown> = {
      message,
      content: content, // base64 encoded content
      branch,
    };
    if (sha) {
      body.sha = sha;
    }

    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
        token: this.token,
      },
    );
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
  ) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          head,
          base,
        }),
        token: this.token,
      },
    );
  }

  async getPullRequest(owner: string, repo: string, number: number) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      { token: this.token },
    );
  }

  // Git Data API for Batch Commits
  async createBlob(
    owner: string,
    repo: string,
    content: string,
    encoding: "utf-8" | "base64" = "utf-8",
  ) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({ content, encoding }),
        token: this.token,
      },
    );
  }

  async createTree(
    owner: string,
    repo: string,
    tree: {
      path: string;
      mode: "100644" | "100755" | "040000" | "160000" | "120000";
      type: "blob" | "tree" | "commit";
      sha?: string;
      content?: string;
    }[],
    base_tree?: string,
  ) {
    // If base_tree is provided, it updates that tree.
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({ tree, base_tree }),
        token: this.token,
      },
    );
  }

  async createCommit(
    owner: string,
    repo: string,
    message: string,
    tree: string,
    parents: string[],
  ) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({ message, tree, parents }),
        token: this.token,
      },
    );
  }

  async updateRef(owner: string, repo: string, ref: string, sha: string) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/${ref}`,
      {
        method: "PATCH",
        body: JSON.stringify({ sha }),
        token: this.token,
      },
    );
  }

  async compareCommits(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}`,
      { token: this.token },
    );
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string,
  ) {
    return await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "DELETE",
        body: JSON.stringify({ message, sha, branch }),
        token: this.token,
      },
    );
  }
}

// ==========================================
// GitHub App Authentication Logic (from v1)
// ==========================================

import { create, getNumericDate } from "djwt";
import { createPrivateKey } from "node:crypto";

const GITHUB_APP_ID = Deno.env.get("GITHUB_APP_ID")?.trim();
const GITHUB_APP_PRIVATE_KEY = Deno.env.get("GITHUB_APP_PRIVATE_KEY")?.trim();

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
    throw e;
  }
}

async function generateAppJwt() {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App not configured (Missing ID or Private Key)");
  }

  const key = await importPrivateKey(GITHUB_APP_PRIVATE_KEY);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iat: getNumericDate(-60), // 60 seconds in the past
      exp: getNumericDate(60 * 9), // 9 minutes
      iss: GITHUB_APP_ID,
    },
    key,
  );
  return jwt;
}

export class GitHubAppClient {
  async getInstallationToken(owner: string, repo: string) {
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
      throw new Error(
        `Failed to get installation token: ${tokenRes.statusText}`,
      );
    }

    const data = await tokenRes.json();
    return data.token;
  }

  async ensureWebhook(owner: string, repo: string, webhookUrl: string) {
    try {
      const token = await this.getInstallationToken(owner, repo);

      const hooksResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/hooks`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github.v3+json",
          },
        },
      );

      if (!hooksResponse.ok) {
        throw new Error(`Failed to fetch hooks: ${hooksResponse.statusText}`);
      }

      const hooks = await hooksResponse.json();

      // deno-lint-ignore no-explicit-any
      const exists = hooks.find((h: any) => h.config.url === webhookUrl);

      if (!exists) {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "web",
            active: true,
            events: ["push", "pull_request"],
            config: {
              url: webhookUrl,
              content_type: "json",
              secret: Deno.env.get("GITHUB_WEBHOOK_SECRET"),
            },
          }),
        });
        console.log(`[GitHubApp] Webhook created for ${owner}/${repo}`);
      } else {
        // Check if update needed
        const currentEvents = exists.events || [];
        if (
          !currentEvents.includes("push") ||
          !currentEvents.includes("pull_request")
        ) {
          await fetch(
            `https://api.github.com/repos/${owner}/${repo}/hooks/${exists.id}`,
            {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                events: ["push", "pull_request"],
              }),
            },
          );
          console.log(`[GitHubApp] Webhook updated for ${owner}/${repo}`);
        }
      }
    } catch (e) {
      console.error(
        `[GitHubApp] Failed to ensure webhook for ${owner}/${repo}:`,
        e,
      );
      // Suppress error to avoid breaking the main config save flow
    }
  }
}
