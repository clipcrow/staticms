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
    <div className="ui relaxed divided list">
      {collections.map((collection: Collection, index: number) => (
        <div
          className="item collection-item"
          key={`${collection.name || "item"}-${index}`}
        >
          <div className="content">
            <div className="header">{collection.label}</div>
            <div className="meta">
              <span
                className={`ui tiny label ${
                  collection.type === "singleton" ? "teal" : "blue"
                }`}
              >
                {collection.type === "singleton" ? "Singleton" : "Collection"}
              </span>
            </div>
            <div className="description" style={{ marginTop: "0.5em" }}>
              {collection.description ||
                (collection.folder
                  ? `Folder: ${collection.folder}`
                  : `File: ${collection.file}`)}
            </div>
          </div>
          <div className="extra content">
            <div className="ui two buttons">
              <Link
                to={getLink(collection)}
                className="ui primary button"
              >
                {getButtonText(collection)}
              </Link>
              <Link
                to={`/${owner}/${repo}?action=edit&target=${collection.name}`}
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
