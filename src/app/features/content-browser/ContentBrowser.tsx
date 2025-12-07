import { Link, useParams, useSearchParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ContentList } from "./ContentList.tsx";
import { ContentConfigEditor } from "@/app/features/config/ContentConfigEditor.tsx";

export function ContentBrowser() {
  const { owner, repo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { config, loading, error } = useContentConfig(owner, repo);

  if (!owner || !repo) return null;

  const action = searchParams.get("action");
  const target = searchParams.get("target");

  const handleCancel = () => {
    setSearchParams({}); // Clear params to show dashboard
  };

  const handleSave = () => {
    // Force a full page navigation/reload to ensure config is refetched
    globalThis.location.href = `/${owner}/${repo}`;
  };

  const isEditing = action === "add" || (action === "edit" && target);

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header content-browser-header">
        <div className="content">
          <Link to="/">
            <i className="github icon"></i>
          </Link>{" "}
          / {owner} {repo}
          <div className="sub header">
            {isEditing
              ? (action === "add" ? "Add Content" : "Edit Configuration")
              : "Content Dashboard"}
          </div>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="ui right floated primary button"
            onClick={() => setSearchParams({ action: "add" })}
          >
            Add New Content
          </button>
        )}
      </h1>

      <div className="ui segment basic">
        {loading && <div className="ui active centered inline loader"></div>}
        {error && (
          <div className="ui negative message">
            <div className="header">Error loading configuration</div>
            <p>{error.message}</p>
          </div>
        )}

        {config && !loading && (
          <>
            {isEditing
              ? (
                <ContentConfigEditor
                  owner={owner}
                  repo={repo}
                  config={config}
                  mode={action as "add" | "edit"}
                  initialData={action === "edit"
                    ? config.collections.find((c) => c.name === target)
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
                />
              )}
          </>
        )}
      </div>
    </div>
  );
}
