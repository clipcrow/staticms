export const RepoBreadcrumbLabel = (
  { owner, repo, branch, defaultBranch }: {
    owner: string;
    repo: string;
    branch?: string;
    defaultBranch?: string;
  },
) => {
  // Check if we should show the branch label
  // Show only if the effective branch differs from default
  // If defaultBranch is not yet loaded (undefined), we still show the branch label to be safe (avoid hiding non-default branches).
  // This prioritizes "showing user selection" over "hiding default".
  const showBranch = branch && (!defaultBranch || branch !== defaultBranch);

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5em" }}
    >
      <span>{owner}/{repo}</span>
      {showBranch && (
        <span
          className="ui label tiny basic"
          style={{ fontWeight: "normal", margin: 0 }}
        >
          <i className="code branch icon"></i>
          {branch}
        </span>
      )}
    </span>
  );
};
