import { useRepository } from "@/app/hooks/useRepositories.ts";

export const RepoBreadcrumbLabel = (
  { owner, repo }: { owner: string; repo: string },
) => {
  const { repository } = useRepository(owner, repo);

  // While loading or if error, just show the name
  if (!repository) {
    return <>{owner}/{repo}</>;
  }

  const showBranch = repository.configured_branch &&
    repository.configured_branch !== repository.default_branch;

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
          {repository.configured_branch}
        </span>
      )}
    </span>
  );
};
