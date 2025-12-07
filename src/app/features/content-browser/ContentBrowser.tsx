import { Link, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ContentList } from "./ContentList.tsx";

export function ContentBrowser() {
  const { owner, repo } = useParams();
  const { config, loading, error } = useContentConfig(owner, repo);

  if (!owner || !repo) return null;

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header content-browser-header">
        <div className="content">
          <Link to="/">
            <i className="github icon"></i>
          </Link>{" "}
          / {owner} {repo}
          <div className="sub header">Content Dashboard</div>
        </div>
      </h1>

      <div className="ui segment basic">
        {loading && <div className="ui active centered inline loader"></div>}
        {error && (
          <div className="ui negative message">
            <div className="header">Error loading configuration</div>
            <p>{error.message}</p>
          </div>
        )}

        {config && (
          <ContentList
            collections={config.collections}
            owner={owner}
            repo={repo}
          />
        )}
      </div>
    </div>
  );
}
