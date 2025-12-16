export const RepoBreadcrumbLabel = (
  { owner, repo, branch, defaultBranch }: {
    owner: string;
    repo: string;
    branch?: string;
    defaultBranch?: string;
  },
) => {
  // Check if we should show the branch label
  // Show only if defaultBranch is loaded AND differs from current branch
  // This prevents flashing "main" label during initial load
  const showBranch = branch && defaultBranch && branch !== defaultBranch;

  return (
    <span className="staticms-breadcrumb-label">
      <span>{owner}/{repo}</span>
      {showBranch && (
        <span className="ui label tiny basic staticms-breadcrumb-branch">
          <i className="code branch icon"></i>
          {branch}
        </span>
      )}
    </span>
  );
};
