import { GitHubAPIError, GitHubUserClient } from "@/server/github.ts";

interface BranchFallbackContext {
  client: GitHubUserClient;
  owner: string;
  repo: string;
  branch?: string; // 対象ブランチ（指定がない場合は自動復旧の対象外）
}

/**
 * Executes a GitHub operation with automatic branch recovery.
 * If the operation fails due to a missing branch, it attempts to create the branch
 * from the repository's default branch and retries the operation.
 */
export async function executeWithBranchFallback<T>(
  ctx: BranchFallbackContext,
  operation: () => Promise<T>,
): Promise<T> {
  const { client, owner, repo, branch } = ctx;

  try {
    return await operation();
  } catch (error) {
    // 1. Check if potential branch error
    if (!branch || !(error instanceof GitHubAPIError) || error.status !== 404) {
      throw error;
    }

    // 2. Verify if branch actually exists
    try {
      await client.getBranch(owner, repo, branch);
      // If getBranch succeeds, the branch exists.
      // The original 404 was likely "file not found", so we rethrow.
      throw error;
    } catch (branchError) {
      if (
        !(branchError instanceof GitHubAPIError) ||
        branchError.status !== 404
      ) {
        // Unexpected error during branch check
        throw error;
      }
      // Branch check returned 404, proving the branch is missing.
      // Proceed to recovery.
    }

    // 3. Recover: Create Branch from Default
    console.log(`[Fallback] Branch '${branch}' missing. Recovering...`);
    try {
      // Fetch Default Branch Name
      const repoInfo = await client.getRepository(owner, repo);
      const defaultBranch = repoInfo.default_branch;

      // Fetch Default Branch SHA
      // deno-lint-ignore no-explicit-any
      const refData: any = await client.getBranch(owner, repo, defaultBranch);
      const sha = refData.object.sha;

      // Create Target Branch
      await client.createBranch(owner, repo, branch, sha);
      console.log(
        `[Fallback] Branch '${branch}' created from '${defaultBranch}'.`,
      );
    } catch (recoveryError) {
      // If creation failed because it already exists (race condition), ignore and retry
      if (
        recoveryError instanceof GitHubAPIError &&
        (recoveryError.status === 422) // Unprocessable Entity (Reference already exists)
      ) {
        console.log(
          `[Fallback] Branch '${branch}' creation failed (likely race condition). Retrying operation...`,
        );
      } else {
        console.error("[Fallback] Failed to recover branch:", recoveryError);
        throw error; // Throw original error if recovery fails completely
      }
    }

    // 4. Retry Original Operation
    return await operation();
  }
}
