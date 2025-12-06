import { useParams } from "react-router-dom";

export function ContentBrowser() {
  // Extract params from /repo/:owner/:repo/*
  const { owner, repo } = useParams();

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header content-browser-header">
        <i className="folder open icon"></i>
        <div className="content">
          {owner}/{repo}
          <div className="sub header">Content Browser</div>
        </div>
      </h1>

      <div className="ui segment">
        <p>List of content will appear here.</p>
      </div>
    </div>
  );
}
