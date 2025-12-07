import type { Collection } from "@/app/hooks/useContentConfig.ts";
import { Link } from "react-router-dom";

interface ContentListProps {
  collections: Collection[];
  owner: string;
  repo: string;
}

export function ContentList({ collections, owner, repo }: ContentListProps) {
  if (!collections || collections.length === 0) {
    return (
      <div className="ui message">
        No content definitions found in configuration.
      </div>
    );
  }

  const getLink = (col: Collection) => {
    // New simplified routing: /:owner/:repo/:collectionName
    return `/${owner}/${repo}/${col.name}`;
  };

  const getButtonText = (col: Collection) => {
    return col.type === "singleton" ? "Edit" : "Browse";
  };

  return (
    <div className="ui cards">
      {collections.map((col) => (
        <div className="card collection-item" key={col.name}>
          <div className="content">
            <div className="header">{col.label}</div>
            <div className="meta">
              <span
                className={`ui tiny label ${
                  col.type === "singleton" ? "teal" : "blue"
                }`}
              >
                {col.type === "singleton" ? "Singleton" : "Collection"}
              </span>
            </div>
            <div className="description" style={{ marginTop: "0.5em" }}>
              {col.description ||
                (col.folder ? `Folder: ${col.folder}` : `File: ${col.file}`)}
            </div>
          </div>
          <div className="extra content">
            <div className="ui two buttons">
              <Link
                to={getLink(col)}
                className="ui primary button"
              >
                {getButtonText(col)}
              </Link>
              <Link
                to={`/${owner}/${repo}?action=edit&target=${col.name}`}
                className="ui basic button"
              >
                Config
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
