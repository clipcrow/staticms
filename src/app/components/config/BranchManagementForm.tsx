import React from "react";
import { BreadcrumbItem, useSetHeader } from "@/app/contexts/HeaderContext.tsx";
import { Config } from "@/app/hooks/useContentConfig.ts";

interface BranchManagementFormProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  breadcrumbs: BreadcrumbItem[];
  title?: React.ReactNode;
}

export const BranchManagementForm: React.FC<BranchManagementFormProps> = ({
  config,
  setConfig,
  onSave,
  onCancel,
  loading = false,
  breadcrumbs,
  title,
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
                disabled={loading || !config.branch}
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
