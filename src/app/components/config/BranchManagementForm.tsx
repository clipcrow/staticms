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
      <div className="ui container staticms-branch-management-container">
        <div className="ui form staticms-branch-management-form-wrapper">
          <h4 className="ui header">Branch Management</h4>

          <div className="field">
            <label htmlFor="repo-config-branch">Target Branch</label>
            <div className="ui action input staticms-branch-input-wrapper">
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
            <small className="helper-text staticms-branch-helper-text">
              The branch where content changes will be committed. If empty,
              defaults to the repository's default branch.
            </small>
          </div>

          {/* Unmerged Commits Section */}
          <div className="staticms-unmerged-section">
            <h4 className="ui header">
              Unmerged Commits
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
            <div className="staticms-pr-creation-area">
              <div className="staticms-pr-creation-title">
                Create Merge Pull Request for Default Branch
              </div>
              <div className="ui action input staticms-branch-input-wrapper">
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
      <div className="staticms-branch-management-footer">
        <button
          type="button"
          onClick={onCancel}
          className="ui button"
          disabled={loading}
        >
          Back
        </button>
      </div>
    </>
  );
};
