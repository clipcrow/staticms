import React, { useEffect } from "react";
import { BreadcrumbItem, Header } from "@/app/components/common/Header.tsx";
import { Collection } from "@/app/hooks/useContentConfig.ts";
import { MarkdownEditor } from "@/app/components/editor/MarkdownEditor.tsx";
import { FieldList } from "./ConfigHelpers.tsx";
import { Content } from "@/shared/types.ts";

interface ConfigFormProps {
  formData: Collection;
  setFormData: React.Dispatch<React.SetStateAction<Collection>>;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;
  repoInfo: { owner: string; repo: string };
  loading?: boolean;
  breadcrumbs: BreadcrumbItem[];
}

export const ConfigForm: React.FC<ConfigFormProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
  onDelete,
  repoInfo,
  loading = false,
  breadcrumbs,
}) => {
  // Initialize type/binding if missing (e.g. fresh add)
  useEffect(() => {
    if (!formData.type) {
      setFormData((prev) => ({ ...prev, type: "singleton" }));
    }
  }, []);

  const handleChange = (key: keyof Collection, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Helper to determine path label
  const getPathLabel = () => {
    const binding = formData.binding || "file"; // default to file if unset
    if (binding === "directory") {
      return "Content Folder Path";
    }
    return "Content File Path";
  };

  const isCollection = formData.type === "collection";
  const binding = formData.binding || "file"; // default to file

  // Shim for MarkdownEditor which expects legacy Content type
  const shimContent: Content = {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    name: "Archetype",
    filePath: "", // Dummy
    type: "collection-files", // Dummy
    fields: [],
    branch: formData.branch,
  };

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <div
        className="ui container"
        style={{ marginTop: "2rem", paddingBottom: "100px" }}
      >
        <form onSubmit={onSave}>
          {/* Basic Settings */}
          {/* Basic Settings */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 className="ui header">Basic Settings</h4>

            <div className="ui form" style={{ marginTop: "1rem" }}>
              {/* Content Name (Label) */}
              <div className="field">
                <label>Content Name (Label) - Optional</label>
                <input
                  type="text"
                  placeholder="e.g. Blog Post"
                  value={formData.label || ""}
                  onChange={(e) => handleChange("label", e.target.value)}
                  disabled={loading}
                />
                <small className="helper-text">
                  Display name in UI. If empty, the Path will be used.
                </small>
              </div>

              <div className="two fields">
                {/* Type Selection */}
                <div className="field">
                  <label>Content Type</label>
                  <div className="inline fields">
                    <div className="field">
                      <div className="ui radio checkbox">
                        <input
                          type="radio"
                          name="contentType"
                          checked={formData.type === "singleton" ||
                            !formData.type}
                          onChange={() => handleChange("type", "singleton")}
                          disabled={loading}
                        />
                        <label>Singleton (File/One-off)</label>
                      </div>
                    </div>
                    <div className="field">
                      <div className="ui radio checkbox">
                        <input
                          type="radio"
                          name="contentType"
                          checked={formData.type === "collection"}
                          onChange={() => handleChange("type", "collection")}
                          disabled={loading}
                        />
                        <label>Collection (Folder based)</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Binding Selection */}
                <div className="field">
                  <label>Binding</label>
                  <div className="inline fields">
                    <div className="field">
                      <div className="ui radio checkbox">
                        <input
                          type="radio"
                          name="contentBinding"
                          checked={binding === "file"}
                          onChange={() => handleChange("binding", "file")}
                          disabled={loading}
                        />
                        <label>File</label>
                      </div>
                    </div>
                    <div className="field">
                      <div className="ui radio checkbox">
                        <input
                          type="radio"
                          name="contentBinding"
                          checked={binding === "directory"}
                          onChange={() => handleChange("binding", "directory")}
                          disabled={loading}
                        />
                        <label>Directory</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="ui info message mini"
                style={{ marginTop: "-10px", marginBottom: "20px" }}
              >
                <p style={{ fontSize: "0.9em" }}>
                  {isCollection && binding === "file" &&
                    "Collection + File: Manages multiple Markdown files in the folder."}
                  {isCollection && binding === "directory" &&
                    "Collection + Directory: Manages subfolders with index.md in the folder."}
                  {!isCollection && binding === "file" &&
                    "Singleton + File: Edits a specific file (Markdown/YAML)."}
                  {!isCollection && binding === "directory" &&
                    "Singleton + Directory: Edits index.md in the specific folder."}
                </p>
              </div>

              {/* Path */}
              <div className="required field">
                <label>{getPathLabel()}</label>
                <input
                  type="text"
                  placeholder={binding === "directory"
                    ? "content/posts"
                    : "content/about.md"}
                  value={formData.path || ""}
                  onChange={(e) => handleChange("path", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Target Branch */}
              <div className="field">
                <label>Target Branch (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. features/preview"
                  value={formData.branch || ""}
                  onChange={(e) => handleChange("branch", e.target.value)}
                  disabled={loading}
                />
                <small className="helper-text">
                  If set, this branch is used for content. If it doesn't exist,
                  it will be created on save.
                </small>
              </div>
            </div>
          </div>

          {/* Field Schema Editor */}
          {/* Field Schema Editor */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 className="ui header">Field Schema</h4>
            <div className="ui form" style={{ marginTop: "1rem" }}>
              <FieldList
                fields={formData.fields || []}
                onChange={(fields) => handleChange("fields", fields)}
                isCollection={isCollection}
                disabled={loading}
              />
            </div>
          </div>

          {/* Archetype (Collection Only) */}
          {isCollection && (
            <div style={{ marginBottom: "2rem" }}>
              <h4 className="ui header">Archetype Template</h4>
              <div style={{ marginTop: "1rem" }}>
                <MarkdownEditor
                  body={formData.archetype || ""}
                  setBody={(val) => handleChange("archetype", val)}
                  isPrLocked={loading}
                  currentContent={shimContent}
                  height={400}
                />
              </div>
              <div style={{ padding: "0.5rem 0" }}>
                <small className="helper-text">
                  Default markdown body content for new articles.
                </small>
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            className="actions staticms-settings-actions"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
              marginBottom: "40px",
            }}
          >
            <div>
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
                {editingIndex !== null ? "Update" : "Add"}
              </button>
            </div>

            {editingIndex !== null && (
              <button
                type="button"
                onClick={onDelete}
                className={`ui button negative ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                <i className="trash icon"></i>
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
};
