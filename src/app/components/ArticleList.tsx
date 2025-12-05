import React, { useState } from "react";
import { Content, FileItem } from "../types.ts";
import { Header } from "./Header.tsx";
import { ContentListItem } from "./ContentListItem.tsx";
import { getContentStatus } from "../hooks/utils.ts";

export interface ArticleListProps {
  contentConfig: Content;
  onSelectArticle: (path: string) => void;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  createArticle: (name: string) => string | undefined;
  isCreating: boolean;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  contentConfig,
  onSelectArticle,
  files,
  loading,
  error,
  createArticle,
  isCreating,
}) => {
  const [newArticleName, setNewArticleName] = useState("");
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  const handleCreateArticle = () => {
    try {
      const path = createArticle(newArticleName);
      if (path) {
        onSelectArticle(decodeURIComponent(path));
      }
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    }
  };

  return (
    <div className="ui container">
      <Header
        breadcrumbs={[
          {
            label: `${contentConfig.owner}/${contentConfig.repo}`,
            to: `/${contentConfig.owner}/${contentConfig.repo}`,
          },
          {
            label: contentConfig.name || contentConfig.filePath,
          },
        ]}
        rightContent={
          <div className="ui form" style={{ margin: 0 }}>
            <div className="inline fields" style={{ margin: 0 }}>
              <div className="field" style={{ padding: 0 }}>
                <div className="ui input">
                  <input
                    type="text"
                    placeholder="New article name..."
                    value={newArticleName}
                    onChange={(e) => setNewArticleName(e.target.value)}
                    disabled={isCreating}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        handleCreateArticle();
                      }
                    }}
                  />
                </div>
              </div>
              <div
                className="field"
                style={{ padding: 0, paddingLeft: "0.5em" }}
              >
                <button
                  type="button"
                  className={`ui primary button ${isCreating ? "loading" : ""}`}
                  onClick={handleCreateArticle}
                  disabled={isCreating || !newArticleName.trim()}
                >
                  <i className="plus icon"></i>
                  Create
                </button>
              </div>
            </div>
          </div>
        }
      />

      <div className="ui segment">
        {loading && <div className="ui active centered inline loader"></div>}
        {error && <div className="ui negative message">{error}</div>}
        {!loading && !error && (
          <div className="ui relaxed divided list">
            {files.length === 0 && <div className="item">No files found.</div>}
            {files.map((file) => (
              <ContentListItem
                key={file.sha}
                icon={
                  <i
                    className={`icon ${
                      file.type === "dir" ? "folder" : "file outline"
                    }`}
                  />
                }
                primaryText={file.name}
                status={(() => {
                  let targetPath = file.path;
                  if (
                    contentConfig.type === "collection-dirs" &&
                    file.type === "dir"
                  ) {
                    targetPath = `${file.path}/index.md`;
                  }

                  return getContentStatus(
                    contentConfig.owner,
                    contentConfig.repo,
                    contentConfig.branch,
                    targetPath,
                    file.type === "dir" &&
                      contentConfig.type !== "collection-dirs",
                  );
                })()}
                actions={
                  <button
                    type="button"
                    className="ui icon button mini basic"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement delete functionality
                      alert("Delete functionality not implemented yet");
                    }}
                    title="Delete Article"
                  >
                    <i className="trash icon red"></i>
                  </button>
                }
                loading={loadingPath === file.path}
                style={{ cursor: "pointer", padding: "10px" }}
                onClick={async () => {
                  setLoadingPath(file.path);
                  try {
                    if (
                      contentConfig.type === "collection-dirs" &&
                      file.type === "dir"
                    ) {
                      await onSelectArticle(
                        decodeURIComponent(`${file.path}/index.md`),
                      );
                    } else {
                      await onSelectArticle(decodeURIComponent(file.path));
                    }
                  } finally {
                    setLoadingPath(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
