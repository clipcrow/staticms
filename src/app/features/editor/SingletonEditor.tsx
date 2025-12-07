import { Link, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";

export function SingletonEditor() {
  const { owner, repo, collectionName } = useParams();
  const { config } = useContentConfig(owner, repo);

  const collection = config?.collections.find((c) => c.name === collectionName);

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header singleton-editor-header">
        <div className="content">
          {collection?.label || collectionName}
          <div className="sub header">
            <Link to={`/${owner}/${repo}`}>Back to Collections</Link>
          </div>
        </div>
      </h1>

      <div className="ui segment">
        {collection?.files
          ? (
            <div className="ui relaxed divided list">
              {collection.files.map((file) => (
                <div className="item" key={file.name}>
                  <i className="file outline middle aligned icon"></i>
                  <div className="content">
                    <div className="header">
                      <Link
                        to={`/${owner}/${repo}/${collectionName}/${file.name}`}
                      >
                        {file.label || file.name}
                      </Link>
                    </div>
                    <div className="description">
                      {file.file} (Format: {file.file.split(".").pop()})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
          : <p>Singleton Editor Placeholder (No files defined)</p>}
      </div>
    </div>
  );
}
