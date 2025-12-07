// Mock GitHub Client
export interface PRResult {
  prNumber: number;
  prUrl: string;
  branch: string;
}

// deno-lint-ignore no-explicit-any
export async function createPullRequest(
  owner: string,
  repo: string,
  baseBranch: string,
  // deno-lint-ignore no-explicit-any
  _draft: any,
): Promise<PRResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log(
    `[MockGitHub] Creating PR for ${owner}/${repo} on base ${baseBranch}`,
  );

  return {
    prNumber: 13,
    prUrl: `https://github.com/${owner}/${repo}/pull/13`,
    branch: `staticms/update-${Date.now()}`,
  };
}
