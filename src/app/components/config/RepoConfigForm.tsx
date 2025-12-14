import React from "react";
import { BreadcrumbItem, Header } from "@/app/components/common/Header.tsx";
import { Config } from "@/app/hooks/useContentConfig.ts";

interface RepoConfigFormProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  breadcrumbs: BreadcrumbItem[];
  title?: React.ReactNode;
  rootLink?: boolean;
}

export const RepoConfigForm: React.FC<RepoConfigFormProps> = ({
  config,
  setConfig,
  onSave,
  onCancel,
  loading = false,
  breadcrumbs,
  title,
  rootLink,
}) => {
  const handleChange = (key: keyof Config, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Header breadcrumbs={breadcrumbs} title={title} rootLink={rootLink} />
      <div
        className="ui container"
        // Add padding bottom to prevent content from being hidden behind footer
        style={{ marginTop: "2rem", paddingBottom: "100px" }}
      >
        <form id="repo-config-form" onSubmit={onSave}>
          <div className="ui form" style={{ marginBottom: "2rem" }}>
            <h4 className="ui header">Repository Settings</h4>

            <div className="field">
              <label htmlFor="repo-config-branch">Target Branch</label>
              <input
                id="repo-config-branch"
                type="text"
                placeholder="e.g. main, master, or staticms/content"
                value={config.branch || ""}
                onChange={(e) => handleChange("branch", e.target.value)}
                disabled={loading}
              />
              <small className="helper-text">
                The branch where content changes will be committed. If empty,
                defaults to the repository's default branch.
              </small>
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Footer Actions */}
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
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="button"
            onClick={onCancel}
            className="ui button"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="repo-config-form"
            className={`ui primary button ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            Update
          </button>
        </div>
      </div>
    </>
  );
};
