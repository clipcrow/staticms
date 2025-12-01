import React, { useEffect, useState } from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";

interface ArticleListProps {
  contentConfig: Content;
  onBack: () => void;
  onSelectArticle: (path: string) => void;
}

interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  contentConfig,
  onBack,
  onSelectArticle,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          owner: contentConfig.owner,
          repo: contentConfig.repo,
          filePath: contentConfig.filePath,
        });
        if (contentConfig.branch) {
          params.append("branch", contentConfig.branch);
        }

        const res = await fetch(`/api/content?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch files");
        }
        const data = await res.json();

        if (data.type === "dir" && Array.isArray(data.files)) {
          setFiles(data.files);
        } else {
          setError("Not a directory or empty");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [contentConfig]);

  return (
    <div className="ui container">
      <Header>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="ui blue button staticms-editor-back-button"
            onClick={onBack}
          >
            <i className="reply icon"></i>
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
        {loading && <div className="ui active centered inline loader"></div>}
        {error && <div className="ui negative message">{error}</div>}
        {!loading && !error && (
          <div className="ui relaxed divided list">
            {files.length === 0 && <div className="item">No files found.</div>}
            {files.map((file) => (
              <div
                key={file.sha}
                className="item"
                onClick={() => onSelectArticle(file.path)}
                style={{ cursor: "pointer", padding: "10px" }}
              >
                <i
                  className={`icon ${
                    file.type === "dir" ? "folder" : "file outline"
                  }`}
                />
                <div
                  className="content"
                  style={{ display: "inline-block", marginLeft: "10px" }}
                >
                  <div className="header">{file.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
