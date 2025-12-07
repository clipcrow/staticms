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
}
