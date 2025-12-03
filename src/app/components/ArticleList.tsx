import React, { useState } from "react";
import { Content, FileItem } from "../types.ts";
import { Header } from "./Header.tsx";
import { ContentListItem } from "./ContentListItem.tsx";
import { getDraftKey, getPrKey } from "../hooks/utils.ts";

export interface ArticleListProps {
  contentConfig: Content;
  onBack: () => void;
  onSelectArticle: (path: string) => void;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  createArticle: (name: string) => string | undefined;
  isCreating: boolean;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  contentConfig,
  onBack: _onBack,
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
        onSelectArticle(path);
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
                      if (e.key === "Enter") {
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
                  className={`ui green button ${isCreating ? "loading" : ""}`}
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
                title={file.name}
                loading={loadingPath === file.path}
                icon={
                  <i
                    className={`icon ${
                      file.type === "dir" ? "folder" : "file outline"
                    }`}
                  />
                }
                onClick={async () => {
                  setLoadingPath(file.path);
                  try {
                    if (
                      contentConfig.type === "collection-dirs" &&
                      file.type === "dir"
                    ) {
                      await onSelectArticle(`${file.path}/index.md`);
                    } else {
                      await onSelectArticle(file.path);
                    }
                  } finally {
                    setLoadingPath(null);
                  }
                }}
                style={{ cursor: "pointer", padding: "10px" }}
                labels={
                  <>
                    {(() => {
                      let targetPath = file.path;
                      if (
                        contentConfig.type === "collection-dirs" &&
                        file.type === "dir"
                      ) {
                        targetPath = `${file.path}/index.md`;
                      }

                      const itemForKeys = {
                        ...contentConfig,
                        filePath: targetPath,
                      };

                      const prKey = getPrKey(itemForKeys);
                      const draftKey = getDraftKey(itemForKeys);
                      const hasPr = localStorage.getItem(prKey);
                      const hasDraft = localStorage.getItem(draftKey);

                      if (hasPr) {
                        return (
                          <span
                            className="ui label orange mini basic"
                            style={{ marginLeft: "0.5em" }}
                          >
                            <i className="lock icon"></i>
                            PR Open
                          </span>
                        );
                      }
                      if (hasDraft) {
                        return (
                          <span
                            className="ui label gray mini basic"
                            style={{ marginLeft: "0.5em" }}
                          >
                            <i className="edit icon"></i>
                            Draft / PR
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </>
                }
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
