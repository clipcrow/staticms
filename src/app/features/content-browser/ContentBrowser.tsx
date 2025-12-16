import { useParams, useSearchParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ContentList } from "./ContentList.tsx";
import { ContentConfigEditor } from "@/app/features/config/ContentConfigEditor.tsx";
import {
  ErrorCallout,
  LoadingSpinner,
} from "@/app/components/common/Feedback.tsx";
import { useRepository } from "@/app/hooks/useRepositories.ts";

export function ContentBrowser() {
  const { owner, repo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { config, loading: configLoading, error: configError } =
    useContentConfig(owner, repo);
  const { repository, loading: repoLoading, error: repoError } = useRepository(
    owner,
    repo,
  );

  if (!owner || !repo) return null;

  const hasSettings = searchParams.has("settings");
  const settingsValue = searchParams.get("settings") || "";

  const handleCancel = () => {
    setSearchParams({}); // Clear params to show dashboard
  };

  const handleSave = () => {
    // Force a full page navigation/reload to ensure config is refetched
    globalThis.location.href = `/${owner}/${repo}`;
  };

  const isEditing = hasSettings;
  const mode = settingsValue ? "edit" : "add";

  if (configLoading || repoLoading) {
    return (
      <div className="ui container" style={{ marginTop: "2em" }}>
        <LoadingSpinner />
      </div>
    );
  }

  const error = configError || repoError;
  if (error) {
    // deno-lint-ignore no-explicit-any
    const msg = (error as any).message || String(error);
    return (
      <div className="ui container" style={{ marginTop: "2em" }}>
        <ErrorCallout title="Error loading configuration">
          {msg}
        </ErrorCallout>
      </div>
    );
  }

  if (!config) return null;

  return (
    <>
      {isEditing
        ? (
          <ContentConfigEditor
            owner={owner}
            repo={repo}
            config={config}
            mode={mode as "add" | "edit"}
            initialData={mode === "edit"
              ? config.collections.find((c) => c.name === settingsValue)
              : undefined}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        )
        : (
          <ContentList
            collections={config.collections}
            owner={owner}
            repo={repo}
            branch={config.branch || "main"}
            defaultBranch={repository?.default_branch}
          />
        )}
    </>
  );
}
