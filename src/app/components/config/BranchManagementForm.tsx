import React from "react";
import { BreadcrumbItem, useSetHeader } from "@/app/contexts/HeaderContext.tsx";
import { Config } from "@/app/hooks/useContentConfig.ts";

interface UnmergedCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface BranchManagementFormProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  breadcrumbs: BreadcrumbItem[];
  title?: React.ReactNode;
  unmergedCommits?: UnmergedCommit[];
  prTitle?: string;
  onPrTitleChange?: (title: string) => void;
  onCreatePr?: () => void;
  creatingPr?: boolean;
}

export const BranchManagementForm: React.FC<BranchManagementFormProps> = ({
  config,
  setConfig,
  onSave,
  onCancel,
  loading = false,
  breadcrumbs,
  title,
  unmergedCommits,
  prTitle,
  onPrTitleChange,
  onCreatePr,
  creatingPr = false,
}) => {
  const handleChange = (key: keyof Config, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  useSetHeader(breadcrumbs, title);

  return (
    <>
      <div
        className="ui container"
        style={{ marginTop: "2rem", paddingBottom: "100px" }}
      >
        <div className="ui form" style={{ marginBottom: "2rem" }}>
          <h4 className="ui header">Branch Management</h4>

          <div className="field">
            <label htmlFor="repo-config-branch">Target Branch</label>
            <div className="ui action input" style={{ width: "400px" }}>
              <input
                id="repo-config-branch"
                type="text"
                placeholder="e.g. main, master, or staticms/content"
                value={config.branch || ""}
                onChange={(e) => handleChange("branch", e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
              <button
                type="button"
                className={`ui primary button ${loading ? "loading" : ""}`}
                disabled={loading}
                onClick={(e) => onSave(e)}
              >
                Switch
              </button>
            </div>
            <small
              className="helper-text"
              style={{
                display: "block",
                marginTop: "0.5rem",
                color: "rgba(0,0,0,0.6)",
              }}
            >
              The branch where content changes will be committed. If empty,
              defaults to the repository's default branch.
            </small>
          </div>

          {/* Unmerged Commits Section */}
          <div style={{ marginTop: "2rem" }}>
            <h4 className="ui header">
              <div className="content">
                Unmerged Commits
                <div className="sub header">
                  Commits in {config.branch || "target branch"}{" "}
                  that are not in default branch
                </div>
              </div>
            </h4>

            {unmergedCommits && unmergedCommits.length > 0
              ? (
                <div className="ui relaxed divided list">
                  {unmergedCommits.map((commit) => (
                    <div className="item" key={commit.sha}>
                      <i className="large github middle aligned icon"></i>
                      <div className="content">
                        <a
                          className="header"
                          href={commit.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {commit.commit.message}
                        </a>
                        <div className="description">
                          {commit.commit.author.name} committed on{" "}
                          {new Date(commit.commit.author.date)
                            .toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
              : (
                <div className="ui message info">
                  <i className="info circle icon"></i>
                  There are no unmerged commits. The target branch is up to date
                  with the default branch.
                </div>
              )}

            {/* PR Creation Area */}
            <div
              style={{
                marginTop: "1.5rem",
                borderTop: "1px solid rgba(34,36,38,.15)",
                paddingTop: "1rem",
              }}
            >
              <div style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>
                Create Merge Pull Request for Default Branch
              </div>
              <div className="ui action input" style={{ width: "400px" }}>
                <input
                  type="text"
                  placeholder="Pull Request Title"
                  value={prTitle || ""}
                  onChange={(e) =>
                    onPrTitleChange && onPrTitleChange(e.target.value)}
                  disabled={creatingPr || !unmergedCommits ||
                    unmergedCommits.length === 0}
                />
                <button
                  type="button"
                  className={`ui primary button ${creatingPr ? "loading" : ""}`}
                  onClick={onCreatePr}
                  disabled={creatingPr || !prTitle || !unmergedCommits ||
                    unmergedCommits.length === 0}
                >
                  Create PR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Modify/Cancel Actions */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          backgroundColor: "var(--color-canvas-default, #fff)",
          borderTop: "1px solid var(--color-border-muted, #d0d7de)",
          padding: "1rem 2rem",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 -1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="ui button"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </>
  );
};
