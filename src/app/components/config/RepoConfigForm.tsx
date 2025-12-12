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
}

export const RepoConfigForm: React.FC<RepoConfigFormProps> = ({
  config,
  setConfig,
  onSave,
  onCancel,
  loading = false,
  breadcrumbs,
}) => {
  const handleChange = (key: keyof Config, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <div
        className="ui container"
        style={{ marginTop: "2rem", paddingBottom: "100px" }}
      >
        <form onSubmit={onSave}>
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

          {/* Actions */}
          <div
            className="actions staticms-settings-actions"
            style={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "10px",
              marginTop: "20px",
              marginBottom: "40px",
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
            <button
              type="submit"
              className={`ui primary button ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
