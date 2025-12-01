import React, { useState } from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";
import { FileItem } from "../hooks/useArticleList.ts";
import { ContentListItem } from "./ContentListItem.tsx";

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
  onBack,
  onSelectArticle,
  files,
  loading,
  error,
  createArticle,
  isCreating,
}) => {
  const [newArticleName, setNewArticleName] = useState("");

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
      <Header>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="ui blue button staticms-editor-back-button"
            onClick={onBack}
          >
            <i className="github icon"></i>
            <span className="staticms-editor-repo-name">
              {contentConfig.owner}/{contentConfig.repo}
            </span>
          </button>
          {contentConfig.branch && (
            <span className="ui label mini basic staticms-editor-branch-label">
              <i className="code branch icon"></i>
              {contentConfig.branch}
            </span>
          )}
          <span className="staticms-editor-separator">
            /
          </span>
          <span className="staticms-editor-file-name">
            {contentConfig.name || contentConfig.filePath}
          </span>
        </div>
      </Header>

      <div className="ui segment">
        <div className="ui form">
          <div className="inline fields">
            <div className="field">
              <label>New Article Name</label>
              <input
                type="text"
                placeholder="article-name"
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
            <div className="field">
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
      </div>

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
                icon={
                  <i
                    className={`icon ${
                      file.type === "dir" ? "folder" : "file outline"
                    }`}
                  />
                }
                onClick={() => {
                  if (
                    contentConfig.type === "collection-dirs" &&
                    file.type === "dir"
                  ) {
                    onSelectArticle(`${file.path}/index.md`);
                  } else {
                    onSelectArticle(file.path);
                  }
                }}
                style={{ cursor: "pointer", padding: "10px" }}
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
