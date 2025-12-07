import { Link, useParams } from "react-router-dom";

export function SingletonEditor() {
  const { owner, repo, collectionName } = useParams();

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header singleton-editor-header">
        Editing: {collectionName}
        <div className="sub header">
          <Link to={`/${owner}/${repo}`}>
            {owner} {repo}
          </Link>{" "}
          / {collectionName}
        </div>
      </h1>
      <p>Singleton Editor Placeholder</p>
    </div>
  );
}
