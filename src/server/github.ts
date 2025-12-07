import type { Draft } from "@/shared/types.ts";

// Mock GitHub Client
export interface PRResult {
  prNumber: number;
  prUrl: string;
  branch: string;
}

// In-memory store for mock PRs
const MOCK_PR_STORE = new Map<number, "open" | "closed" | "merged">();

export const getPRStatus = (prNumber: number) => {
  return MOCK_PR_STORE.get(prNumber) || "open";
};

export const updatePRStatus = (
  prNumber: number,
  status: "open" | "closed" | "merged",
) => {
  MOCK_PR_STORE.set(prNumber, status);
};

export async function createPullRequest(
  owner: string,
  repo: string,
  baseBranch: string,
  _draft: Draft,
): Promise<PRResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const prNumber = 13; // Fixed ID for mock testing simplicity, or use counter

  // Reset state to open on creation
  MOCK_PR_STORE.set(prNumber, "open");

  console.log(
    `[MockGitHub] Creating PR for ${owner}/${repo} on base ${baseBranch}`,
  );

  return {
    prNumber,
    prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
    branch: `staticms/update-${Date.now()}`,
  };
}
